from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.models.acceso import Acceso
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo
from app.models.membresia import Membresia
from app.models.infraccion import Infraccion
from app.models.codigo_qr import CodigoQR
from app.models.entidad_civil import EntidadCivil
from app.models.enums import AccesoTipo, MembresiaEstado, InfraccionEstado
from app.schemas.acceso import AccesoValidar, AccesoRegistrar, ResultadoValidacion
from app.services.membresia_service import membresia_service
from app.core.security import decodificar_token

class AccesoService:
    """
    🧠 Lógica de Negocio (SOP) para el Control de Accesos.
    Encapsula la validación integral de seguridad y cumplimiento.
    """
    
    async def validar_qr(self, db: AsyncSession, datos: AccesoValidar) -> ResultadoValidacion:
        """
        Valida un token de QR y retorna la ficha del socio con su estado de cumplimiento.
        No persiste cambios en la BD, solo consulta.
        """
        try:
            # 1. Decodificar Token
            payload = decodificar_token(datos.qr_token)
            usuario_id = payload.get("sub")
            vehiculo_id = payload.get("vehiculo_id")
            
            if not usuario_id:
                return ResultadoValidacion(permitido=False, mensaje="Token QR inválido: falta ID de usuario", tipo_alerta="error")

            # 2. Buscar QR en BD para ver si está activo
            query_qr = select(CodigoQR).where(CodigoQR.token == datos.qr_token, CodigoQR.activo == True)
            res_qr = await db.execute(query_qr)
            qr_db = res_qr.scalar_one_or_none()
            
            if not qr_db:
                return ResultadoValidacion(permitido=False, mensaje="El QR ha sido revocado o no existe", tipo_alerta="error")

            # 3. Buscar Usuario (Socio)
            query_socio = select(Usuario).where(Usuario.id == UUID(usuario_id), Usuario.activo == True)
            res_socio = await db.execute(query_socio)
            socio = res_socio.scalar_one_or_none()

            if not socio:
                return ResultadoValidacion(permitido=False, mensaje="Socio no encontrado o inactivo", tipo_alerta="error")

            # 4. Verificar Membresía (Activa o Exonerada)
            query_mem = select(Membresia).where(
                Membresia.socio_id == socio.id, 
                Membresia.estado.in_([MembresiaEstado.activa, MembresiaEstado.exonerada])
            )
            res_mem = await db.execute(query_mem)
            membresia = res_mem.scalar_one_or_none()

            if not membresia:
                # Buscar por qué no tiene membresía para dar mensaje claro
                query_any_mem = select(Membresia).where(Membresia.socio_id == socio.id)
                res_any = await db.execute(query_any_mem)
                any_mem = res_any.scalar_one_or_none()
                
                msg = "Socio sin registro de membresía"
                if any_mem:
                    if any_mem.estado == MembresiaEstado.suspendida:
                        msg = "MEMBRESÍA SUSPENDIDA ADMIN."
                    elif any_mem.estado == MembresiaEstado.vencida:
                        msg = "MEMBRESÍA VENCIDA (PAGO PENDIENTE)"
                
                return ResultadoValidacion(permitido=False, mensaje=msg, tipo_alerta="error")

            # 5. Buscar Vehículo (si viene en el QR)
            vehiculo = None
            if vehiculo_id:
                query_veh = select(Vehiculo).where(Vehiculo.id == UUID(vehiculo_id), Vehiculo.activo == True)
                res_veh = await db.execute(query_veh)
                vehiculo = res_veh.scalar_one_or_none()

            # 6. Consultar Infracciones (especialmente para salida)
            # Solo buscamos infracciones activas
            query_inf = select(Infraccion).where(
                Infraccion.usuario_id == socio.id, 
                Infraccion.estado == InfraccionEstado.activa
            )
            res_inf = await db.execute(query_inf)
            infracciones = res_inf.scalars().all()
            
            # 7. Evaluar bloqueo de salida
            bloqueado = False
            msg_bloqueo = ""
            if datos.tipo == AccesoTipo.salida:
                for inf in infracciones:
                    if inf.bloquea_salida:
                        bloqueado = True
                        msg_bloqueo = f"SALIDA BLOQUEADA: {inf.descripcion}"
                        break

            # 8. Obtener nombre de la entidad
            query_ent = select(EntidadCivil).where(EntidadCivil.id == socio.entidad_id)
            res_ent = await db.execute(query_ent)
            entidad = res_ent.scalar_one_or_none()

            # 9. Construir respuesta
            return ResultadoValidacion(
                permitido = not bloqueado,
                mensaje = msg_bloqueo if bloqueado else "Validación exitosa",
                tipo_alerta = "error" if bloqueado else ("warning" if infracciones else "info"),
                socio = socio,
                vehiculo = vehiculo,
                entidad_nombre = entidad.nombre if entidad else "N/A",
                qr_id = qr_db.id,
                usuario_id = socio.id,
                vehiculo_id = vehiculo.id if vehiculo else None,
                infracciones_activas = [{"tipo": i.tipo, "descripcion": i.descripcion, "bloquea": i.bloquea_salida} for i in infracciones],
                membresia_info = membresia_service.calcular_progreso(membresia) if membresia else None
            )

        except JWTError:
            return ResultadoValidacion(permitido=False, mensaje="Token QR expirado o corrupto", tipo_alerta="error")
        except Exception as e:
            return ResultadoValidacion(permitido=False, mensaje=f"Error en validación: {str(e)}", tipo_alerta="error")

    async def registrar_acceso(self, db: AsyncSession, datos: AccesoRegistrar, registrado_por_id: UUID) -> Acceso:
        """
        Persiste el registro de acceso (entrada/salida) en la base de datos.
        """
        nuevo_acceso = Acceso(
            qr_id = datos.qr_id,
            usuario_id = datos.usuario_id,
            vehiculo_id = datos.vehiculo_id,
            tipo = datos.tipo,
            punto_acceso = datos.punto_acceso,
            registrado_por = registrado_por_id,
            es_manual = datos.es_manual
        )
        
        db.add(nuevo_acceso)
        await db.commit()
        await db.refresh(nuevo_acceso)
        return nuevo_acceso

acceso_service = AccesoService()
