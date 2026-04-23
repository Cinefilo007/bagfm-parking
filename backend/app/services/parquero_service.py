from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
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


class ParqueroService:

    # ──────────────────────────────────────────────────────────────────────────
    # DATOS DE ZONA
    # ──────────────────────────────────────────────────────────────────────────

    async def get_mi_zona(self, db: AsyncSession, usuario_id: UUID) -> Dict[str, Any]:
        """
        Retorna la zona asignada al parquero con KPIs corregidos.
        - Reservados: Se cuentan los registros físicos reales en puestos_estacionamiento.
        - Ocupados: Ocupación actual de la zona (incluye virtuales).
        - Total: Capacidad máxima de la zona.
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

        # ── 1. Contar Puestos Físicos Reales (para detectar los "Apartados") ──
        res_puestos = await db.execute(
            select(PuestoEstacionamiento)
            .where(PuestoEstacionamiento.zona_id == zona.id)
        )
        puestos_bd = res_puestos.scalars().all()
        
        # Clasificar los puestos que SÍ están en la base de datos
        n_reservados_base = 0
        n_reservados_entidad = 0
        n_mantenimiento = 0
        fisicos_ocupados = 0
        
        for p in puestos_bd:
            if p.estado == EstadoPuesto.mantenimiento:
                n_mantenimiento += 1
            elif p.reservado_base or p.estado == EstadoPuesto.reservado_base:
                n_reservados_base += 1
            elif p.reservado_entidad_id is not None:
                n_reservados_entidad += 1
            elif p.estado == EstadoPuesto.ocupado:
                fisicos_ocupados += 1

        # ── 2. Calcular KPIs ─────────────────────────────────────────────────
        total = zona.capacidad_total or 0
        # Ocupados: Usamos el contador de la zona (que es la fuente de verdad)
        ocupados = zona.ocupacion_actual or 0
        
        # Reservados Totales (los apartados VIP y Base)
        reservados = n_reservados_base + n_reservados_entidad
        
        # Libres = Total - (Ocupados + Reservados + Mantenimiento)
        # Nota: Si los reservados están ocupados, el contador de zona ya los incluye.
        # Pero normalmente los apartados se cuentan fuera de la ocupación general si están libres.
        libres = max(0, total - ocupados - reservados - n_mantenimiento)

        return {
            "id": str(zona.id),
            "nombre": zona.nombre,
            "capacidad_total": zona.capacidad_total,
            "ocupacion_actual": zona.ocupacion_actual or 0,
            "usa_puestos_identificados": zona.usa_puestos_identificados,
            "tipo": getattr(zona, "tipo", None),
            "descripcion_ubicacion": zona.descripcion_ubicacion,
            "activo": zona.activo,
            "kpis": {
                "libres":              libres,
                "ocupados":            ocupados,
                "reservados":          reservados,
                "reservados_base":     n_reservados_base,
                "reservados_entidad":  n_reservados_entidad,
                "mantenimiento":       n_mantenimiento,
                "total":               total,
                "tiene_puestos_fisicos": len(puestos_bd) > 0,
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
            await db.commit()
            await db.refresh(nuevo_vp)
            return {
                "sin_datos": False,
                "vehiculo_pase_id": str(nuevo_vp.id),
                "placa": nuevo_vp.placa,
                "marca": nuevo_vp.marca,
                "modelo": nuevo_vp.modelo,
                "color": nuevo_vp.color,
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
                    "mensaje": "Complete los datos del portador para finalizar el registro.",
                }

            # QR tiene datos completos → registrar directamente sin formulario
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
        nombre: str | None, cedula: str | None, telefono: str | None
    ) -> Dict[str, Any]:
        """
        Completa los datos del portador en el CodigoQR (accesos temporales/masivos).
        No toca la tabla de usuarios.
        """
        res_qr = await db.execute(select(CodigoQR).where(CodigoQR.id == qr_id))
        qr = res_qr.scalars().first()
        if not qr:
            raise ValueError("QR no encontrado")

        if nombre:
            qr.nombre_portador = nombre.strip().upper()
        if cedula:
            qr.cedula_portador = cedula.strip().upper()
        if telefono:
            qr.telefono_portador = telefono.strip()
        qr.datos_completos = True

        await db.commit()
        return {"ok": True, "qr_id": str(qr_id), "vehiculo_pase_id": str(vehiculo_pase_id)}



    # ──────────────────────────────────────────────────────────────────────────
    # SALIDA POR PLACA (MANUAL)
    # ──────────────────────────────────────────────────────────────────────────

    async def registrar_salida_placa(
        self, db: AsyncSession, placa: str, zona_id: UUID
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

    # ──────────────────────────────────────────────────────────────────────────
    # MÉTODOS ORIGINALES
    # ──────────────────────────────────────────────────────────────────────────

    async def registrar_llegada_qr(
        self, db: AsyncSession, qr_id: UUID, zona_id: UUID, parquero_id: UUID
    ) -> VehiculoPase:
        """
        El parquero escanea un QR para recibir un vehículo en su zona.
        """
        resultado = await db.execute(select(CodigoQR).filter(CodigoQR.id == qr_id))
        qr = resultado.scalars().first()
        if not qr:
            raise ValueError("QR no válido")

        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == qr_id))
        vehiculo_pase = resultado_vp.scalars().first()

        if not vehiculo_pase:
            vehiculo_pase = VehiculoPase(
                qr_id=qr_id,
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
        self, db: AsyncSession, qr_id: UUID
    ) -> VehiculoPase:
        """
        Registrar la salida de la zona de estacionamiento por QR.
        """
        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == qr_id))
        vehiculo_pase = resultado_vp.scalars().first()
        if not vehiculo_pase:
            raise ValueError("Vehículo no encontrado en zona")

        vehiculo_pase.ingresado = False

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

        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase


parquero_service = ParqueroService()
