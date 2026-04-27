from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func as sql_func
from sqlalchemy.orm import joinedload

from app.models.acceso import Acceso
from app.models.codigo_qr import CodigoQR
from app.models.vehiculo_pase import VehiculoPase
from app.models.vehiculo import Vehiculo
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from app.models.asignacion_zona import AsignacionZona
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.usuario import Usuario
from app.models.enums import EstadoPuesto, AccesoTipo
from app.services.configuracion_service import configuracion_service


class ParqueroService:

    # ──────────────────────────────────────────────────────────────────────────
    # AUXILIARES
    # ──────────────────────────────────────────────────────────────────────────

    async def _actualizar_ocupacion_zona(self, db: AsyncSession, zona_id: UUID, delta: int):
        """Incrementa o decrementa la ocupacion_actual de la zona."""
        res = await db.execute(select(ZonaEstacionamiento).where(ZonaEstacionamiento.id == zona_id))
        zona = res.scalars().first()
        if zona:
            # Asegurar que no baje de 0
            zona.ocupacion_actual = max(0, (zona.ocupacion_actual or 0) + delta)
            return zona
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # DATOS DE ZONA
    # ──────────────────────────────────────────────────────────────────────────

    async def get_mi_zona(self, db: AsyncSession, usuario_id: UUID) -> Dict[str, Any]:
        """
        Retorna la zona asignada al parquero con KPIs de precisión táctica.
        Desglosa ocupados por tipo (Base, Entidad/VIP, General).
        """
        res_usr = await db.execute(
            select(Usuario)
            .options(joinedload(Usuario.zona_asignada))
            .where(Usuario.id == usuario_id)
        )
        usuario = res_usr.scalars().first()

        if not usuario or not usuario.zona_asignada_id:
            return None

        zona = usuario.zona_asignada

        # ── 1. Obtener Reservados (Cupos) ──
        res_asig = await db.execute(
            select(AsignacionZona)
            .where(AsignacionZona.zona_id == zona.id, AsignacionZona.activa == True)
        )
        asignaciones = res_asig.scalars().all()
        
        n_reservados_base = 0
        n_reservados_entidad = 0
        for asig in asignaciones:
            n_reservados_base += (asig.cupo_reservado_base or 0)
            if asig.distribucion_cupos:
                for val in asig.distribucion_cupos.values():
                    if isinstance(val, (int, float)):
                        n_reservados_entidad += int(val)

        # ── 2. Analizar Ocupados por Tipo ──
        # Buscamos vehículos activos en la zona y su tipo de acceso
        res_activos = await db.execute(
            select(VehiculoPase, CodigoQR.tipo_acceso)
            .outerjoin(CodigoQR, VehiculoPase.qr_id == CodigoQR.id)
            .where(VehiculoPase.zona_asignada_id == zona.id, VehiculoPase.ingresado == True)
        )
        
        ocupados_base = 0
        ocupados_entidad = 0
        ocupados_general = 0
        
        for vp, tipo_qr in res_activos.all():
            tipo = (tipo_qr or 'general').lower()
            # Clasificación táctica de ocupación
            if tipo == 'base':
                ocupados_base += 1
            elif tipo in ['vip', 'produccion', 'logistica', 'prensa']:
                ocupados_entidad += 1
            else:
                ocupados_general += 1

        # ── 3. Calcular KPIs ──
        total = zona.capacidad_total or 0
        reservados_totales = n_reservados_base + n_reservados_entidad
        ocupados_totales = ocupados_base + ocupados_entidad + ocupados_general
        
        # ── 4. Calcular Perdidos ──
        perdidos_lista = await self.get_vehiculos_perdidos(db, usuario_id)
        n_perdidos = len(perdidos_lista)

        return {
            "id": str(zona.id),
            "nombre": zona.nombre,
            "capacidad_total": total,
            "usa_puestos_identificados": zona.usa_puestos_identificados,
            "kpis": {
                "libres": max(0, total - ocupados_totales), 
                "ocupados": ocupados_totales,
                "reservados": reservados_totales,
                "total": total,
                "perdidos": n_perdidos,
                "desglose_reservas": {
                    "base": n_reservados_base,
                    "entidad": n_reservados_entidad
                },
                "desglose_ocupacion": {
                    "base": ocupados_base,
                    "entidad": ocupados_entidad,
                    "general": ocupados_general
                }
            }
        }






    # ──────────────────────────────────────────────────────────────────────────
    # VEHÍCULOS EN ZONA
    # ──────────────────────────────────────────────────────────────────────────

    async def get_vehiculos_en_zona(self, db: AsyncSession, zona_id: UUID) -> List[Dict]:
        """
        Retorna los vehículos actualmente estacionados en la zona (VehiculoPase ingresados).
        """
        res = await db.execute(
            select(VehiculoPase)
            .options(joinedload(VehiculoPase.puesto_asignado))
            .where(
                VehiculoPase.zona_asignada_id == zona_id,
                VehiculoPase.ingresado == True
            )
            .order_by(VehiculoPase.hora_ingreso.desc())
        )
        vehiculos = res.scalars().all()

        ahora = datetime.now(timezone.utc)
        resultado = []
        for v in vehiculos:
            tiempo_min = None
            if v.hora_ingreso:
                tiempo_min = int((ahora - v.hora_ingreso.replace(tzinfo=timezone.utc) if v.hora_ingreso.tzinfo is None else ahora - v.hora_ingreso).total_seconds() / 60)

            puesto_codigo = None
            if v.puesto_asignado_id and hasattr(v, 'puesto_asignado') and v.puesto_asignado:
                puesto_codigo = v.puesto_asignado.numero_puesto

            resultado.append({
                "id": str(v.id),
                "placa": v.placa,
                "marca": v.marca,
                "modelo": v.modelo,
                "color": v.color,
                "hora_ingreso": v.hora_ingreso.isoformat() if v.hora_ingreso else None,
                "tiempo_en_zona_min": tiempo_min,
                "puesto_asignado_id": str(v.puesto_asignado_id) if v.puesto_asignado_id else None,
                "puesto_codigo": puesto_codigo,
            })
        return resultado

    # ──────────────────────────────────────────────────────────────────────────
    # LLEGADA POR PLACA (MANUAL)
    # ──────────────────────────────────────────────────────────────────────────

    async def registrar_llegada_placa(
        self, db: AsyncSession, placa: str, zona_id: UUID, parquero_id: UUID
    ) -> Dict[str, Any]:
        """
        Busca un vehículo por placa siguiendo esta cadena de búsqueda:
          1. VehiculoPase activo en zona → ya registrado (error)
          2. VehiculoPase inactivo en zona → marcar como llegado
          3. Tabla `vehiculos` (socios registrados) → crear VehiculoPase con sus datos
          4. Tabla `codigos_qr` por vehiculo_placa → pases temporales/masivos con datos en el QR
          5. No encontrado → sin_datos=True (registrar datos manualmente)
        """
        placa_norm = placa.strip().upper()

        # ── 1. Verificar si ya hay un VehiculoPase activo con esa placa en la zona ──
        res_vp = await db.execute(
            select(VehiculoPase).where(
                VehiculoPase.placa == placa_norm,
                VehiculoPase.zona_asignada_id == zona_id,
                VehiculoPase.ingresado == True
            )
        )
        vp_activo = res_vp.scalars().first()
        if vp_activo:
            raise ValueError(f"El vehículo {placa_norm} ya está registrado en la zona.")

        # ── 2. VehiculoPase inactivo para esta zona (tiene pase pero no ha llegado) ──
        res_vp2 = await db.execute(
            select(VehiculoPase).where(
                VehiculoPase.placa == placa_norm,
                VehiculoPase.zona_asignada_id == zona_id,
                VehiculoPase.ingresado == False
            )
        )
        vehiculo_pase = res_vp2.scalars().first()

        if vehiculo_pase:
            vehiculo_pase.ingresado = True
            vehiculo_pase.hora_ingreso = datetime.now(timezone.utc)
            
            # Incrementar ocupación
            await self._actualizar_ocupacion_zona(db, zona_id, 1)
            
            await db.commit()
            await db.refresh(vehiculo_pase)
            return {
                "sin_datos": False,
                "vehiculo_pase_id": str(vehiculo_pase.id),
                "placa": vehiculo_pase.placa,
                "marca": vehiculo_pase.marca,
                "modelo": vehiculo_pase.modelo,
                "color": vehiculo_pase.color,
                "puesto_asignado_id": str(vehiculo_pase.puesto_asignado_id) if vehiculo_pase.puesto_asignado_id else None,
            }

        # ── 3. Tabla `vehiculos` (socios con registro permanente) ──
        res_veh = await db.execute(
            select(Vehiculo).where(Vehiculo.placa == placa_norm)
        )
        vehiculo_db = res_veh.scalars().first()

        if vehiculo_db:
            # Intentar obtener teléfono de la tabla Usuario si el vehículo es de un socio
            telefono_socio = None
            if vehiculo_db.usuario_id:
                res_u = await db.execute(select(Usuario).where(Usuario.id == vehiculo_db.usuario_id))
                usr = res_u.scalars().first()
                if usr: telefono_socio = usr.telefono

            nuevo_vp = VehiculoPase(
                placa=placa_norm,
                marca=vehiculo_db.marca,
                modelo=vehiculo_db.modelo,
                color=vehiculo_db.color,
                zona_asignada_id=zona_id,
                ingresado=True,
                hora_ingreso=datetime.now(timezone.utc)
            )
            db.add(nuevo_vp)
            
            # Incrementar ocupación
            await self._actualizar_ocupacion_zona(db, zona_id, 1)
            
            await db.commit()
            await db.refresh(nuevo_vp)
            return {
                "sin_datos": False,
                "vehiculo_pase_id": str(nuevo_vp.id),
                "placa": nuevo_vp.placa,
                "marca": nuevo_vp.marca,
                "modelo": nuevo_vp.modelo,
                "color": nuevo_vp.color,
                "telefono_portador": telefono_socio,
                "puesto_asignado_id": None,
            }

        # ── 4. CodigoQR con datos de vehículo (pases temporales / pases masivos) ──
        # Buscar QR activo con esa placa de vehículo, sin filtrar por zona
        # ya que el QR puede estar asignado a esta zona o no tener zona aún
        res_qr = await db.execute(
            select(CodigoQR).where(
                CodigoQR.vehiculo_placa == placa_norm,
                CodigoQR.activo == True
            ).order_by(CodigoQR.created_at.desc())
        )
        qr_encontrado = res_qr.scalars().first()

        if qr_encontrado:
            # Tiene un QR con datos del vehículo. Crear VehiculoPase vinculado al QR.
            nuevo_vp = VehiculoPase(
                qr_id=qr_encontrado.id,
                placa=placa_norm,
                marca=qr_encontrado.vehiculo_marca,
                modelo=qr_encontrado.vehiculo_modelo,
                color=qr_encontrado.vehiculo_color,
                zona_asignada_id=zona_id,
                ingresado=True,
                hora_ingreso=datetime.now(timezone.utc)
            )
            db.add(nuevo_vp)
            await db.commit()
            await db.refresh(nuevo_vp)

            # Si el QR no tiene datos de la persona (nombre, cédula), pedir al parquero
            # pero pasando los datos del vehículo ya conocidos para no repetirlos
            datos_persona_incompletos = not qr_encontrado.datos_completos or not qr_encontrado.nombre_portador

            if datos_persona_incompletos:
                return {
                    "sin_datos": True,
                    "solo_persona": True,  # El vehículo ya tiene datos, solo falta persona
                    "vehiculo_pase_id": str(nuevo_vp.id),
                    "qr_id": str(qr_encontrado.id),
                    "placa": placa_norm,
                    "marca": qr_encontrado.vehiculo_marca,
                    "modelo": qr_encontrado.vehiculo_modelo,
                    "color": qr_encontrado.vehiculo_color,
                    "nombre_portador": qr_encontrado.nombre_portador,
                    "cedula_portador": qr_encontrado.cedula_portador,
                    "telefono_portador": qr_encontrado.telefono_portador,
                    "zona_id": str(zona_id), # Importante para actualizar ocupación luego
                    "mensaje": "Complete los datos del portador para finalizar el registro.",
                }

            # QR tiene datos completos → registrar directamente
            # Incrementar ocupación
            await self._actualizar_ocupacion_zona(db, zona_id, 1)
            
            await db.commit()
            await db.refresh(nuevo_vp)
            return {
                "sin_datos": False,
                "vehiculo_pase_id": str(nuevo_vp.id),
                "placa": placa_norm,
                "marca": qr_encontrado.vehiculo_marca,
                "modelo": qr_encontrado.vehiculo_modelo,
                "color": qr_encontrado.vehiculo_color,
                "nombre_portador": qr_encontrado.nombre_portador,
                "puesto_asignado_id": None,
            }

        # ── 5. Sin datos en ninguna fuente ──
        return {
            "sin_datos": True,
            "solo_persona": False,
            "placa": placa_norm,
            "mensaje": "Vehículo no encontrado. Complete los datos para registrarlo.",
        }

    async def completar_datos_portador(
        self, db: AsyncSession, qr_id: UUID, vehiculo_pase_id: UUID,
        nombre: str | None, cedula: str | None, telefono: str | None,
        zona_id: UUID | None = None
    ) -> Dict[str, Any]:
        """Completa los datos y activa el ingreso (ocupación)."""
        res_qr = await db.execute(select(CodigoQR).where(CodigoQR.id == qr_id))
        qr = res_qr.scalars().first()
        if not qr:
            raise ValueError("QR no encontrado")

        res_vp = await db.execute(select(VehiculoPase).where(VehiculoPase.id == vehiculo_pase_id))
        vp = res_vp.scalars().first()

        if nombre: qr.nombre_portador = nombre.strip().upper()
        if cedula: qr.cedula_portador = cedula.strip().upper()
        if telefono: qr.telefono_portador = telefono.strip()
        qr.datos_completos = True

        if vp:
            vp.nombre_portador = qr.nombre_portador
            vp.cedula_portador = qr.cedula_portador
            vp.telefono_portador = qr.telefono_portador
            vp.ingresado = True
            vp.hora_ingreso = datetime.now(timezone.utc)
            
            # Incrementar ocupación al finalizar registro de datos
            target_zona = zona_id or vp.zona_asignada_id
            if target_zona:
                await self._actualizar_ocupacion_zona(db, target_zona, 1)

        await db.commit()
        return {"ok": True, "success": True}



    async def _sincronizar_salida_base(self, db: AsyncSession, vehiculo_pase: VehiculoPase, parquero_id: UUID):
        """
        SOP: Sincronización Táctica de Salidas (Aegis v2.3).
        Si la opción está activa, registra automáticamente el egreso de la base.
        """
        config = await configuracion_service.get_config_salidas(db)
        
        if config.get("sync_parquero"):
            # Registrar acceso de salida en sistema central
            nueva_salida = Acceso(
                qr_id = vehiculo_pase.qr_id,
                usuario_id = None,
                vehiculo_id = None,
                vehiculo_pase_id = vehiculo_pase.id,
                tipo = AccesoTipo.salida,
                punto_acceso = "SINCRO PARQUERO",
                registrado_por = parquero_id,
                es_manual = True,
                vehiculo_placa = vehiculo_pase.placa,
                observaciones = "Salida automática sincronizada con parquero."
            )
            # Intentar rellenar usuario_id si el QR lo tiene
            if vehiculo_pase.qr_id:
                qr_db = await db.get(CodigoQR, vehiculo_pase.qr_id)
                if qr_db:
                    nueva_salida.usuario_id = qr_db.usuario_id
                    nueva_salida.vehiculo_id = qr_db.vehiculo_id

            db.add(nueva_salida)

    # ──────────────────────────────────────────────────────────────────────────
    # SALIDA POR PLACA (MANUAL)
    # ──────────────────────────────────────────────────────────────────────────

    async def registrar_salida_placa(
        self, db: AsyncSession, placa: str, zona_id: UUID, parquero_id: UUID
    ) -> Dict[str, Any]:
        """
        Registra la salida de un vehículo buscándolo por placa en la zona activa.
        """
        placa_norm = placa.strip().upper()

        res_vp = await db.execute(
            select(VehiculoPase).where(
                VehiculoPase.placa == placa_norm,
                VehiculoPase.zona_asignada_id == zona_id,
                VehiculoPase.ingresado == True
            )
        )
        vehiculo_pase = res_vp.scalars().first()

        if not vehiculo_pase:
            raise ValueError(f"No se encontró el vehículo {placa_norm} activo en la zona.")

        vehiculo_pase.ingresado = False
        vehiculo_pase.hora_salida = datetime.now(timezone.utc)
        
        # Restar ocupación
        await self._actualizar_ocupacion_zona(db, zona_id, -1)

        if vehiculo_pase.puesto_asignado_id:
            res_p = await db.execute(
                select(PuestoEstacionamiento).where(
                    PuestoEstacionamiento.id == vehiculo_pase.puesto_asignado_id
                )
            )
            puesto = res_p.scalars().first()
            if puesto:
                puesto.estado = EstadoPuesto.libre
                puesto.qr_actual_id = None
                puesto.vehiculo_actual_id = None
                puesto.ocupado_desde = None

        # Sincronización Aegis v2.3
        await self._sincronizar_salida_base(db, vehiculo_pase, parquero_id)

        await db.commit()
        await db.refresh(vehiculo_pase)
        return {
            "placa": vehiculo_pase.placa,
            "vehiculo_pase_id": str(vehiculo_pase.id),
            "mensaje": f"Salida registrada para {vehiculo_pase.placa}",
        }

    # ──────────────────────────────────────────────────────────────────────────
    # TRAZABILIDAD DE ZONA
    # ──────────────────────────────────────────────────────────────────────────

    async def get_trazabilidad_zona(
        self, db: AsyncSession, zona_id: UUID, limite: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retorna el historial temporal de vehículos de la zona.
        Combina:
        - Accesos de la alcabala que tenían como destino esta zona
        - VehiculoPase (ingresó zona / salió zona)
        Ordena por timestamp desc.
        """
        eventos = []

        # --- Accesos de alcabala (entrada base con zona destino) ---
        res_accesos = await db.execute(
            select(Acceso, CodigoQR)
            .outerjoin(CodigoQR, Acceso.qr_id == CodigoQR.id)
            .where(
                CodigoQR.zona_asignada_id == zona_id,
                Acceso.tipo == AccesoTipo.entrada
            )
            .order_by(Acceso.timestamp.desc())
            .limit(limite)
        )
        for acceso, qr in res_accesos.all():
            placa = None
            if qr and qr.vehiculo_placa:
                placa = qr.vehiculo_placa
            eventos.append({
                "tipo": "alcabala",
                "placa": placa,
                "descripcion": f"Acceso por alcabala: {acceso.punto_acceso}",
                "timestamp": acceso.timestamp.isoformat() if acceso.timestamp else None,
                "punto": acceso.punto_acceso,
                "es_manual": acceso.es_manual,
            })

        # --- VehiculoPase — ingreso a zona ---
        res_vp_in = await db.execute(
            select(VehiculoPase).where(
                VehiculoPase.zona_asignada_id == zona_id,
                VehiculoPase.hora_ingreso.isnot(None)
            )
            .order_by(VehiculoPase.hora_ingreso.desc())
            .limit(limite)
        )
        for vp in res_vp_in.scalars().all():
            eventos.append({
                "tipo": "ingreso_zona",
                "placa": vp.placa,
                "descripcion": f"Ingresó a zona",
                "timestamp": vp.hora_ingreso.isoformat() if vp.hora_ingreso else None,
                "puesto_asignado_id": str(vp.puesto_asignado_id) if vp.puesto_asignado_id else None,
                "activo": vp.ingresado,
            })
            
            # Si ya salió, añadir evento de salida
            if vp.hora_salida:
                eventos.append({
                    "tipo": "salida_zona",
                    "placa": vp.placa,
                    "descripcion": f"Salió de zona",
                    "timestamp": vp.hora_salida.isoformat(),
                    "activo": False,
                })

        # Ordenar por timestamp desc
        def sort_key(e):
            ts = e.get("timestamp")
            if ts:
                try:
                    return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except Exception:
                    pass
            return datetime.min.replace(tzinfo=timezone.utc)

        eventos.sort(key=sort_key, reverse=True)
        return eventos[:limite]

    async def get_vehiculos_perdidos(self, db: AsyncSession, usuario_id: UUID) -> List[Dict]:
        """
        SOP: Seguridad Táctica (Aegis v2.3).
        Identifica vehículos que accedieron por alcabala con destino a esta zona
        pero no han reportado ingreso tras expirar el 'tiempo_limite_llegada_min'.
        """
        # 1. Obtener zona del parquero
        res_usr = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = res_usr.scalars().first()
        if not usuario or not usuario.zona_asignada_id:
            return []
        
        zona_id = usuario.zona_asignada_id
        res_zona = await db.execute(select(ZonaEstacionamiento).where(ZonaEstacionamiento.id == zona_id))
        zona = res_zona.scalars().first()
        if not zona:
            return []

        # Tiempos de referencia
        tiempo_limite = (zona.tiempo_limite_llegada_min or 15)
        ahora = datetime.now(timezone.utc)
        hace_12h = ahora - timedelta(hours=12)

        # 2. Buscar accesos de entrada en alcabala con destino a esta zona
        query = (
            select(Acceso, CodigoQR)
            .join(CodigoQR, Acceso.qr_id == CodigoQR.id)
            .where(
                CodigoQR.zona_asignada_id == zona_id,
                Acceso.tipo == AccesoTipo.entrada,
                Acceso.timestamp >= hace_12h
            )
        )
        res = await db.execute(query)
        accesos = res.all()

        perdidos = []
        for acceso, qr in accesos:
            # 3. Verificar si este QR ya tiene un VehiculoPase 'ingresado' para esta zona
            res_vp = await db.execute(
                select(VehiculoPase).where(
                    VehiculoPase.qr_id == qr.id,
                    VehiculoPase.zona_asignada_id == zona_id,
                    VehiculoPase.ingresado == True
                )
            )
            vp = res_vp.scalars().first()

            if not vp:
                # Validar tiempo transcurrido
                ts_acceso = acceso.timestamp.replace(tzinfo=timezone.utc) if acceso.timestamp.tzinfo is None else acceso.timestamp
                transcurrido_min = int((ahora - ts_acceso).total_seconds() / 60)
                
                if transcurrido_min > tiempo_limite:
                    perdidos.append({
                        "placa": qr.vehiculo_placa,
                        "marca": qr.vehiculo_marca,
                        "modelo": qr.vehiculo_modelo,
                        "color": qr.vehiculo_color,
                        "hora_alcabala": ts_acceso.isoformat(),
                        "punto_alcabala": acceso.punto_acceso,
                        "minutos_transcurridos": transcurrido_min,
                        "tiempo_limite": tiempo_limite,
                        "nombre_conductor": qr.nombre_portador,
                        "qr_id": str(qr.id)
                    })
        
        # Ordenar por el más antiguo perdido primero para atención prioritaria
        perdidos.sort(key=lambda x: x["minutos_transcurridos"], reverse=True)
        return perdidos

    # ──────────────────────────────────────────────────────────────────────────
    # MÉTODOS ORIGINALES
    # ──────────────────────────────────────────────────────────────────────────

    async def registrar_llegada_qr(
        self, db: AsyncSession, qr_token: str, zona_id: UUID, parquero_id: UUID
    ) -> VehiculoPase:
        """
        El parquero escanea un QR para recibir un vehículo en su zona.
        Utiliza el token directamente para garantizar compatibilidad con IDs no-UUID (Base pases).
        """
        # Buscar el QR por su token JWT (es único e indexado)
        resultado = await db.execute(select(CodigoQR).filter(CodigoQR.token == qr_token))
        qr = resultado.scalars().first()
        
        # Si no se encuentra por token, intentamos buscar por ID directo (caso UUID puro legado)
        if not qr:
            try:
                # Verificar si qr_token es un UUID válido antes de consultar
                UUID(qr_token)
                resultado = await db.execute(select(CodigoQR).filter(CodigoQR.id == qr_token))
                qr = resultado.scalars().first()
            except ValueError:
                pass

        if not qr:
            raise ValueError("QR no encontrado o no reconocido en el sistema")

        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == qr.id))
        vehiculo_pase = resultado_vp.scalars().first()

        if not vehiculo_pase:
            vehiculo_pase = VehiculoPase(
                qr_id=qr.id,
                placa=qr.vehiculo_placa or "DESCONOCIDO",
                zona_asignada_id=zona_id,
                ingresado=True,
                hora_ingreso=datetime.now(timezone.utc)
            )
            db.add(vehiculo_pase)
        else:
            vehiculo_pase.ingresado = True
            vehiculo_pase.hora_ingreso = datetime.now(timezone.utc)
            vehiculo_pase.zona_asignada_id = zona_id

        if hasattr(qr, 'verificado_por_parquero'):
            qr.verificado_por_parquero = True
        if hasattr(qr, 'hora_llegada_zona'):
            qr.hora_llegada_zona = datetime.now(timezone.utc)

        # Incrementar ocupación
        await self._actualizar_ocupacion_zona(db, zona_id, 1)

        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase

    async def asignar_puesto(
        self, db: AsyncSession, vehiculo_pase_id: UUID, puesto_id: UUID
    ) -> VehiculoPase:
        """
        Asignar un puesto físico específico a un vehículo ingresado.
        """
        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.id == vehiculo_pase_id))
        vehiculo_pase = resultado_vp.scalars().first()
        if not vehiculo_pase:
            raise ValueError("Vehículo no encontrado")

        resultado_p = await db.execute(select(PuestoEstacionamiento).filter(PuestoEstacionamiento.id == puesto_id))
        puesto = resultado_p.scalars().first()
        if not puesto:
            raise ValueError("Puesto no encontrado")

        if puesto.estado in [EstadoPuesto.ocupado, EstadoPuesto.mantenimiento]:
            raise ValueError("Puesto no disponible")

        if vehiculo_pase.puesto_asignado_id:
            res_panterior = await db.execute(select(PuestoEstacionamiento).filter(
                PuestoEstacionamiento.id == vehiculo_pase.puesto_asignado_id
            ))
            puesto_anterior = res_panterior.scalars().first()
            if puesto_anterior:
                puesto_anterior.estado = EstadoPuesto.libre
                puesto_anterior.vehiculo_actual_id = None
                puesto_anterior.qr_actual_id = None

        puesto.estado = EstadoPuesto.ocupado
        puesto.qr_actual_id = vehiculo_pase.qr_id
        puesto.ocupado_desde = datetime.now(timezone.utc)

        vehiculo_pase.puesto_asignado_id = puesto_id

        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase

    async def registrar_salida(
        self, db: AsyncSession, qr_token: str, parquero_id: UUID
    ) -> VehiculoPase:
        """
        Registrar la salida de la zona de estacionamiento por QR.
        Utiliza el token directamente para garantizar compatibilidad con IDs no-UUID (Base pases).
        """
        # Buscar el QR por su token JWT (es único e indexado)
        resultado = await db.execute(select(CodigoQR).filter(CodigoQR.token == qr_token))
        qr = resultado.scalars().first()
        
        # Si no se encuentra por token, intentamos buscar por ID directo (caso UUID puro legado)
        if not qr:
            try:
                # Verificar si qr_token es un UUID válido antes de consultar
                UUID(qr_token)
                resultado = await db.execute(select(CodigoQR).filter(CodigoQR.id == qr_token))
                qr = resultado.scalars().first()
            except ValueError:
                pass

        if not qr:
            raise ValueError("Pase no encontrado para registrar salida")

        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == qr.id))
        vehiculo_pase = resultado_vp.scalars().first()
        if not vehiculo_pase:
            raise ValueError("Vehículo no encontrado activo en zona")

        vehiculo_pase.ingresado = False
        vehiculo_pase.hora_salida = datetime.now(timezone.utc)

        # Restar ocupación
        if vehiculo_pase.zona_asignada_id:
            await self._actualizar_ocupacion_zona(db, vehiculo_pase.zona_asignada_id, -1)

        if vehiculo_pase.puesto_asignado_id:
            resultado_p = await db.execute(select(PuestoEstacionamiento).filter(
                PuestoEstacionamiento.id == vehiculo_pase.puesto_asignado_id
            ))
            puesto = resultado_p.scalars().first()
            if puesto:
                puesto.estado = EstadoPuesto.libre
                puesto.qr_actual_id = None
                puesto.vehiculo_actual_id = None
                puesto.ocupado_desde = None

        # Sincronización Aegis v2.3
        await self._sincronizar_salida_base(db, vehiculo_pase, parquero_id)

        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase


parquero_service = ParqueroService()
