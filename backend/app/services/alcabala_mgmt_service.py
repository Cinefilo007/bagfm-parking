"""
Servicio de Gestión de Alcabalas y Guardias Temporales (Asíncrono).
Maneja la creación de puntos de control y usuarios con expiración automática.
"""
from datetime import datetime, timedelta, time
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.alcabala_evento import PuntoAcceso, GuardiaTurno
from app.models.usuario import Usuario
from app.models.acceso import Acceso
from app.models.enums import RolTipo
from app.core.security import hashear_password
from app.core.password_rotativo import generar_password_diario, obtener_fecha_tactica
from sqlalchemy import func, update, delete
import secrets
import string
import re

class AlcabalaService:
    def _generar_slug(self, texto: str) -> str:
        """Convierte un nombre de alcabala en un slug corto."""
        # Tomamos solo las primeras palabras o siglas si es largo
        texto = texto.lower()
        # Eliminar stop words comunes para acortar
        for sw in ['alcabala', 'punto', 'de', 'control', 'la', 'el']:
            texto = texto.replace(sw, '').strip()
        
        texto = re.sub(r'[^a-z0-9]', '', texto)
        return texto[:15] # Máximo 15 caracteres para el slug

    async def listar_puntos(self, db: AsyncSession):
        """Lista todas las alcabalas con su clave actual y el usuario asociado."""
        query = select(PuntoAcceso, Usuario).outerjoin(Usuario, PuntoAcceso.usuario_id == Usuario.id).where(PuntoAcceso.activo == True)
        result = await db.execute(query)
        rows = result.all()
        
        resultado = []
        for p, u in rows:
            p.clave_hoy = generar_password_diario(p.secret_key, p.key_salt)
            p.usuario_nombre = u.cedula if u else "s/u"
            resultado.append(p)
        return resultado

    async def obtener_punto_por_id(self, db: AsyncSession, id: UUID):
        query = select(PuntoAcceso).where(PuntoAcceso.id == id)
        result = await db.execute(query)
        punto = result.scalars().first()
        if punto:
            punto.clave_hoy = generar_password_diario(punto.secret_key, punto.key_salt)
        return punto

    async def crear_punto_acceso(self, db: AsyncSession, nombre: str, ubicacion: str = None):
        """
        Crea un punto de acceso y su usuario fijo asociado.
        """
        # 1. Generar semillas de seguridad
        secret = secrets.token_hex(16)
        salt = secrets.token_hex(8)
        
        # 2. Crear el Usuario fijo para esta alcabala con username único (CORTO)
        slug = self._generar_slug(nombre)
        base_username = f"alc.{slug}"
        username = base_username
        
        # Verificar si ya existe para evitar colisión de cédula (unique index)
        existing_user = await db.execute(select(Usuario).where(Usuario.cedula == username))
        if existing_user.scalars().first():
            username = f"{base_username}.{secrets.token_hex(2)}"

        pass_inicial = secrets.token_urlsafe(16)
        
        nuevo_usuario = Usuario(
            cedula=username,
            nombre="Guardia",
            apellido=nombre,
            rol=RolTipo.ALCABALA,
            password_hash=hashear_password(pass_inicial),
            activo=True
        )
        db.add(nuevo_usuario)
        await db.flush() 
        
        # 3. Crear el Punto de Acceso
        punto = PuntoAcceso(
            nombre=nombre, 
            ubicacion=ubicacion,
            usuario_id=nuevo_usuario.id,
            secret_key=secret,
            key_salt=salt
        )
        db.add(punto)
        await db.commit()
        await db.refresh(punto)
        
        punto.clave_hoy = generar_password_diario(secret, salt)
        punto.usuario_nombre = username
        return punto

    async def actualizar_punto_acceso(self, db: AsyncSession, id: UUID, nombre: str, ubicacion: str = None):
        punto = await self.obtener_punto_por_id(db, id)
        if not punto: return None
        
        punto.nombre = nombre
        punto.ubicacion = ubicacion
        await db.commit()
        await db.refresh(punto)
        return punto

    async def eliminar_punto_acceso(self, db: AsyncSession, id: UUID):
        """Elimina el punto y su usuario asociado."""
        punto = await self.obtener_punto_por_id(db, id)
        if not punto: return False
        
        u_id = punto.usuario_id
        await db.execute(delete(PuntoAcceso).where(PuntoAcceso.id == id))
        if u_id:
            await db.execute(delete(Usuario).where(Usuario.id == u_id))
            
        await db.commit()
        return True

    async def regenerar_clave_emergencia(self, db: AsyncSession, punto_id: UUID):
        """Garantiza una nueva clave tras una fuga de datos."""
        punto = await self.obtener_punto_por_id(db, punto_id)
        if not punto: return None
        
        # Cambiamos el salt para forzar una nueva clave táctica
        punto.key_salt = secrets.token_hex(8)
        await db.commit()
        await db.refresh(punto)
        return generar_password_diario(punto.secret_key, punto.key_salt)

    async def obtener_punto_de_usuario(self, db: AsyncSession, usuario_id: UUID):
        """Retorna el punto de acceso vinculado a este usuario de alcabala."""
        query = select(PuntoAcceso).where(PuntoAcceso.usuario_id == usuario_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def obtener_mi_identificacion_actual(self, db: AsyncSession, usuario_id: UUID):
        query = select(GuardiaTurno).where(
            GuardiaTurno.usuario_id == usuario_id,
            GuardiaTurno.activo == True
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def identificar_guardia_entrante(self, db: AsyncSession, punto_id: UUID, usuario_id: UUID, datos: dict):
        """
        Registra quién está tomando el turno en este momento.
        """
        # Desactivar guardia anterior si existía
        await db.execute(
            update(GuardiaTurno)
            .where(GuardiaTurno.punto_id == punto_id, GuardiaTurno.activo == True)
            .values(activo=False)
        )
        
        nuevo_turno = GuardiaTurno(
            punto_id=punto_id,
            usuario_id=usuario_id,
            grado=datos.get('grado'),
            nombre=datos.get('nombre'),
            apellido=datos.get('apellido'),
            telefono=datos.get('telefono'),
            unidad=datos.get('unidad'),
            key_version=secrets.token_hex(4) # Marca el inicio de este turno
        )
        db.add(nuevo_turno)
        await db.commit()
        return nuevo_turno

    async def obtener_guardia_actual(self, db: AsyncSession, punto_id: UUID):
        query = select(GuardiaTurno).where(GuardiaTurno.punto_id == punto_id, GuardiaTurno.activo == True)
        result = await db.execute(query)
        return result.scalars().first()

    async def listar_personal_activo_mando(self, db: AsyncSession):
        """
        Retorna quién está físicamente en cada alcabala para el panel del Comandante.
        """
        query = select(
            PuntoAcceso,
            GuardiaTurno
        ).join(
            GuardiaTurno, PuntoAcceso.id == GuardiaTurno.punto_id
        ).where(
            PuntoAcceso.activo == True,
            GuardiaTurno.activo == True
        )
        result = await db.execute(query)
        rows = result.all()
        
        return [
            {
                "alcabala": p.nombre,
                "alcabala_id": p.id,
                "grado": g.grado,
                "nombre": f"{g.nombre} {g.apellido}",
                "telefono": g.telefono,
                "unidad": g.unidad,
                "inicio": g.inicio_turno
            }
            for p, g in rows
        ]

alcabala_service = AlcabalaService()
