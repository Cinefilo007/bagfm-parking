from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import func, or_
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.models.acceso import Acceso
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo
from app.models.membresia import Membresia
from app.models.infraccion import Infraccion
from app.models.codigo_qr import CodigoQR
from app.models.entidad_civil import EntidadCivil
from app.models.vehiculo_pase import VehiculoPase
from app.models.alcabala_evento import LotePaseMasivo
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from app.models.enums import AccesoTipo, MembresiaEstado, InfraccionEstado, QRTipo, TipoAccesoPase, RolTipo
from app.schemas.acceso import AccesoValidar, AccesoRegistrar, ResultadoValidacion, EventoTactico
from app.services.membresia_service import membresia_service
from app.services.notificacion_service import notificacion_service
from app.core.security import decodificar_token

class AccesoService:
    """
    🧠 Lógica de Negocio (SOP) para el Control de Accesos.
    Encapsula la validación integral de seguridad y cumplimiento.
    """
    
    async def validar_qr(self, db: AsyncSession, datos: AccesoValidar) -> ResultadoValidacion:
        """
        Valida un token de QR y retorna la ficha del socio con su estado de cumplimiento.
        """
        try:
            # 1. Decodificar Token
            try:
                payload = decodificar_token(datos.qr_token)
            except JWTError:
                return ResultadoValidacion(permitido=False, mensaje="Token QR expirado o corrupto", tipo_alerta="error")
                
            usuario_id_str = payload.get("sub")
            vehiculo_id_str = payload.get("vehiculo_id")
            
            # 2. Buscar QR en BD
            query_qr = select(CodigoQR).where(CodigoQR.token == datos.qr_token)
            res_qr = await db.execute(query_qr)
            qr_db = res_qr.scalar_one_or_none()
            
            if not qr_db:
                return ResultadoValidacion(permitido=False, mensaje="QR no registrado en el sistema", tipo_alerta="error")
            
            if not qr_db.activo:
                return ResultadoValidacion(permitido=False, mensaje="El QR ha sido revocado o ya no es válido", tipo_alerta="error")

            # 3. Buscar Usuario (Socio) - Usa qr_db.usuario_id que siempre es seguro
            socio = None
            if qr_db.usuario_id:
                query_socio = select(Usuario).where(Usuario.id == qr_db.usuario_id, Usuario.activo == True)
                res_socio = await db.execute(query_socio)
                socio = res_socio.scalar_one_or_none()

            # 4. Lógica de Pases Masivos
            if qr_db.lote_id:
                # Validar Límites de Acceso - Solo bloquea en ENTRADA
                if datos.tipo == AccesoTipo.entrada:
                    if qr_db.max_accesos is not None and qr_db.accesos_usados >= qr_db.max_accesos:
                        return ResultadoValidacion(
                            permitido=False, 
                            mensaje=f"LÍMITE DE ACCESOS ALCANZADO ({qr_db.max_accesos}/{qr_db.max_accesos})", 
                            tipo_alerta="error"
                        )
                
                # Buscar nombre del evento
                query_lote = select(LotePaseMasivo).where(LotePaseMasivo.id == qr_db.lote_id).options(selectinload(LotePaseMasivo.entidad))
                res_lote = await db.execute(query_lote)
                lote = res_lote.scalar_one_or_none()
                
                # Resolver Zona y Puesto legibles (Aegis Tactical v2.3 - Unificado)
                z_id = qr_db.zona_asignada_id or (lote.zona_estacionamiento_id if lote else None)
                p_id = qr_db.puesto_asignado_id
                z_nombre = None
                p_nombre = None

                if z_id:
                    z_db = await db.get(ZonaEstacionamiento, z_id)
                    if z_db:
                        z_nombre = z_db.nombre
                        
                if p_id:
                    p_db = await db.get(PuestoEstacionamiento, p_id)
                    if p_db:
                        p_nombre = str(p_db.numero_puesto)
                
                # ... (resto de validaciones de fechas igual) ...
                
                # Buscar todos los vehículos del socio (para selección múltiple)
                vehiculos_socio = []
                vehiculo = None
                if socio:
                    query_veh_socio = select(Vehiculo).where(Vehiculo.socio_id == socio.id, Vehiculo.activo == True)
                    res_veh_socio = await db.execute(query_veh_socio)
                    vehiculos_socio = res_veh_socio.scalars().all()
                    vehiculo = vehiculos_socio[0] if vehiculos_socio else None

                # Determinar si requiere datos manuales (Tipo A o falta de datos en el registro)
                necesita_datos = (qr_db.tipo == QRTipo.evento_simple) or (not socio) or (not vehiculo)

                # Si no hay socio en BD pero el QR ya tiene datos de portador empotrados (Excel), mockeamos para mostrar en frontend
                if not socio and (qr_db.nombre_portador or qr_db.cedula_portador):
                    # Solo lo mandamos para lectura en FichaSocio de ResultadoValidacion
                    entidad_nombre = "Pase Evento"
                    if lote and lote.entidad:
                        entidad_nombre = lote.entidad.nombre
                    elif qr_db.entidad_nombre_manual: # Solo si existiera este campo, por ahora fallback
                        entidad_nombre = qr_db.entidad_nombre_manual

                    socio = {
                        "id": qr_db.usuario_id or qr_db.id,
                        "nombre": qr_db.nombre_portador or "Visitante",
                        "apellido": "",
                        "cedula": qr_db.cedula_portador or "",
                        "telefono": qr_db.telefono_portador or "",
                        "rol": "SOCIO",
                        "activo": True,
                        "entidad_nombre": entidad_nombre,
                        "updated_at": qr_db.created_at,
                        "created_at": qr_db.created_at
                    }
                    vehiculos_socio = []
                    
                    # Primer vehículo (Principal embazado en la tabla codigos_qr)
                    if qr_db.vehiculo_placa:
                        v_mock = {
                            "id": qr_db.vehiculo_id or qr_db.id,
                            "placa": qr_db.vehiculo_placa,
                            "marca": qr_db.vehiculo_marca or "GENÉRICO",
                            "modelo": qr_db.vehiculo_modelo or "GENÉRICO",
                            "color": qr_db.vehiculo_color or "SIN COLOR",
                            "activo": True,
                            "socio_id": socio["id"],
                            "created_at": qr_db.created_at # Requerido por Pydantic (VehiculoSalida)
                        }
                        vehiculo = v_mock
                        vehiculos_socio.append(v_mock)
                    
                    # Adicionales (Tabla VehiculoPase)
                    query_veh_adi = select(VehiculoPase).where(VehiculoPase.qr_id == qr_db.id)
                    res_veh_adi = await db.execute(query_veh_adi)
                    vehiculos_adicionales = res_veh_adi.scalars().all()
                    
                    for va in vehiculos_adicionales:
                        v_adi = {
                            "id": va.id,
                            "placa": va.placa,
                            "marca": va.marca or "GENÉRICO",
                            "modelo": va.modelo or "GENÉRICO",
                            "color": va.color or "SIN COLOR",
                            "activo": True,
                            "socio_id": socio["id"],
                            "created_at": va.created_at
                        }
                        vehiculos_socio.append(v_adi)
                        
                    if not vehiculo and vehiculos_socio:
                        vehiculo = vehiculos_socio[0]
                    
                    # Si ya logramos mockear datos (Tipo B excel), no requiere datos manuales mandatorios
                    if qr_db.nombre_portador and vehiculos_socio:
                        necesita_datos = False

                return ResultadoValidacion(
                    permitido=True,
                    mensaje="Pase Masivo Válido",
                    tipo_alerta="warning" if qr_db.tipo == QRTipo.evento_simple else "info",
                    es_pase_masivo=True,
                    serial_legible=qr_db.serial_legible,
                    nombre_evento=lote.nombre_evento if lote else "Evento BAGFM",
                    accesos_restantes=qr_db.max_accesos - qr_db.accesos_usados if qr_db.max_accesos else None,
                    qr_id=qr_db.id,
                    usuario_id=socio["id"] if isinstance(socio, dict) else getattr(socio, "id", None),
                    socio=socio,
                    vehiculo=vehiculo,
                    vehiculos=vehiculos_socio,
                    vehiculo_id=vehiculo["id"] if isinstance(vehiculo, dict) else getattr(vehiculo, "id", None),
                    requiere_datos_manuales=necesita_datos,
                    zona_asignada_id=z_id,
                    zona_nombre=z_nombre,
                    puesto_asignado_id=p_id,
                    puesto_nombre=p_nombre,
                    tipo_acceso=qr_db.tipo_acceso
                )

            # 5. Pases de Base (tipo_acceso == base) — sin lote_id ni usuario_id
            if qr_db.tipo_acceso == TipoAccesoPase.base:
                # Verificar si el pase no está expirado por fecha
                if qr_db.fecha_expiracion and qr_db.fecha_expiracion < datetime.now(timezone.utc):
                    return ResultadoValidacion(
                        permitido=False,
                        mensaje=f"PASE BASE VENCIDO — Expiró el {qr_db.fecha_expiracion.strftime('%d/%m/%Y')}",
                        tipo_alerta="error"
                    )

                socio_mock = {
                    "id": str(qr_db.id),
                    "nombre": qr_db.nombre_portador or "PORTADOR BASE",
                    "apellido": "",
                    "cedula": qr_db.cedula_portador or "",
                    "telefono": qr_db.telefono_portador or "",
                    "rol": "SOCIO",
                    "activo": True,
                    "entidad_nombre": "PERSONAL DE BASE",
                    "updated_at": qr_db.created_at,
                    "created_at": qr_db.created_at
                }
                vehiculo_mock = None
                vehiculos_mock = []
                if qr_db.vehiculo_placa:
                    vehiculo_mock = {
                        "id": str(qr_db.id),
                        "placa": qr_db.vehiculo_placa,
                        "marca": qr_db.vehiculo_marca or "GENÉRICO",
                        "modelo": qr_db.vehiculo_modelo or "GENÉRICO",
                        "color": qr_db.vehiculo_color or "SIN COLOR",
                        "activo": True,
                        "socio_id": str(qr_db.id),
                        "created_at": qr_db.created_at
                    }
                    vehiculos_mock = [vehiculo_mock]

                # Resolver zona y puesto
                z_nombre = None
                p_nombre = None
                if qr_db.zona_asignada_id:
                    z_db = await db.get(ZonaEstacionamiento, qr_db.zona_asignada_id)
                    if z_db:
                        z_nombre = z_db.nombre
                if qr_db.puesto_asignado_id:
                    p_db = await db.get(PuestoEstacionamiento, qr_db.puesto_asignado_id)
                    if p_db:
                        p_nombre = str(p_db.numero_puesto)

                return ResultadoValidacion(
                    permitido=True,
                    mensaje=f"✅ PASE BASE — {qr_db.serial_legible}",
                    tipo_alerta="success",
                    es_pase_masivo=False,
                    serial_legible=qr_db.serial_legible,
                    nombre_evento="ACCESO BASE",
                    qr_id=qr_db.id,
                    usuario_id=None,
                    socio=socio_mock,
                    vehiculo=vehiculo_mock,
                    vehiculos=vehiculos_mock,
                    vehiculo_id=None,
                    requiere_datos_manuales=False,
                    zona_asignada_id=qr_db.zona_asignada_id,
                    zona_nombre=z_nombre,
                    puesto_asignado_id=qr_db.puesto_asignado_id,
                    puesto_nombre=p_nombre,
                    tipo_acceso=qr_db.tipo_acceso
                )

            # 6. Validación Estándar para Socios Permanentes
            if not socio:
                return ResultadoValidacion(permitido=False, mensaje="Socio no encontrado o inactivo", tipo_alerta="error")

            # 5.a Verificar Membresía
            query_mem = select(Membresia).where(
                Membresia.socio_id == socio.id
            ).order_by(Membresia.updated_at.desc())
            res_mem = await db.execute(query_mem)
            membresia = res_mem.scalars().first()

            if not membresia or membresia.estado not in [MembresiaEstado.activa, MembresiaEstado.exonerada]:
                msg = "Socio sin registro de membresía vigente"
                if membresia:
                    if membresia.estado == MembresiaEstado.suspendida:
                        msg = "MEMBRESÍA SUSPENDIDA ADMIN."
                    elif membresia.estado == MembresiaEstado.vencida:
                        msg = "MEMBRESÍA VENCIDA (PAGO PENDIENTE)"
                return ResultadoValidacion(permitido=False, mensaje=msg, tipo_alerta="error")

            # 5.b Vehículos del socio (todos, para selección múltiple)
            vehiculo = None
            vehiculos_socio = []
            if vehiculo_id_str:
                query_veh = select(Vehiculo).where(Vehiculo.id == UUID(vehiculo_id_str), Vehiculo.activo == True)
                res_veh = await db.execute(query_veh)
                vehiculo = res_veh.scalar_one_or_none()
            
            # Siempre obtener todos los vehículos del socio
            query_veh_all = select(Vehiculo).where(Vehiculo.socio_id == socio.id, Vehiculo.activo == True)
            res_veh_all = await db.execute(query_veh_all)
            vehiculos_socio = res_veh_all.scalars().all()
            
            if not vehiculo and vehiculos_socio:
                vehiculo = vehiculos_socio[0]

            # 5.c Infracciones
            query_inf = select(Infraccion).where(
                Infraccion.usuario_id == socio.id, 
                Infraccion.estado == InfraccionEstado.activa
            )
            res_inf = await db.execute(query_inf)
            infracciones = res_inf.scalars().all()
            
            bloqueado = False
            msg_bloqueo = ""
            if datos.tipo == AccesoTipo.salida:
                for inf in infracciones:
                    if inf.bloquea_salida:
                        bloqueado = True
                        msg_bloqueo = f"SALIDA BLOQUEADA: {inf.descripcion}"
                        break

            # 5.d Entidad
            query_ent = select(EntidadCivil).where(EntidadCivil.id == socio.entidad_id)
            res_ent = await db.execute(query_ent)
            entidad = res_ent.scalar_one_or_none()

            if entidad and not entidad.activo:
                return ResultadoValidacion(
                    permitido=False, 
                    mensaje=f"CESE DE SERVICIOS: CONCESIÓN {entidad.nombre} SUSPENDIDA", 
                    tipo_alerta="error"
                )

            # 5.e Última Entrada
            query_last = select(Acceso).where(
                Acceso.usuario_id == socio.id,
                Acceso.tipo == AccesoTipo.entrada
            ).order_by(Acceso.timestamp.desc()).limit(1)
            res_last = await db.execute(query_last)
            ultima_entrada = res_last.scalar_one_or_none()

            return ResultadoValidacion(
                permitido = not bloqueado,
                mensaje = msg_bloqueo if bloqueado else "Validación Exitosa",
                tipo_alerta = "error" if bloqueado else ("warning" if infracciones else "info"),
                socio = socio,
                vehiculo = vehiculo,
                vehiculos = vehiculos_socio,
                entidad_nombre = entidad.nombre if entidad else "N/A",
                qr_id = qr_db.id,
                usuario_id = socio.id,
                vehiculo_id = vehiculo.id if vehiculo else None,
                infracciones_activas = [{"tipo": i.tipo, "descripcion": i.descripcion, "bloquea": i.bloquea_salida} for i in infracciones],
                membresia_info = {
                    "id": membresia.id,
                    "estado": membresia.estado,
                    "fecha_inicio": membresia.fecha_inicio,
                    "fecha_fin": membresia.fecha_fin,
                    "progreso": membresia_service.calcular_progreso(membresia)
                } if membresia else None,
                ultima_entrada = ultima_entrada.timestamp if ultima_entrada else None
            )

        except Exception as e:
            print(f"DEBUG: Error inesperado en validación: {str(e)}")
            return ResultadoValidacion(permitido=False, mensaje=f"Error en validación: {str(e)}", tipo_alerta="error")

    async def registrar_acceso(self, db: AsyncSession, datos: AccesoRegistrar, registrado_por_id: UUID) -> Acceso:
        """
        Persiste el registro de acceso y actualiza contadores de pases masivos si aplica.
        Maneja creación de usuarios ligeros si vienen datos manuales.
        """
        final_usuario_id = datos.usuario_id
        final_vehiculo_id = datos.vehiculo_id
        final_vehiculo_pase_id = datos.vehiculo_pase_id

        # 0. Validar integridad de IDs provenientes del Frontend (Filtrar IDs mockeados de pases masivos excel)
        
        if final_usuario_id:
            q_exists_u = select(Usuario.id).where(Usuario.id == final_usuario_id)
            if not (await db.execute(q_exists_u)).scalar_one_or_none():
                final_usuario_id = None
                
        if final_vehiculo_id:
            q_exists_v = select(Vehiculo.id).where(Vehiculo.id == final_vehiculo_id)
            if not (await db.execute(q_exists_v)).scalar_one_or_none():
                # Evaluar si el ID es en realidad un VehiculoPase (Vehículos Múltiples Mock)
                q_exists_vp = select(VehiculoPase.id).where(VehiculoPase.id == final_vehiculo_id)
                if (await db.execute(q_exists_vp)).scalar_one_or_none():
                    final_vehiculo_pase_id = final_vehiculo_id
                
                # Desvincular de la tabla permanente para evitar ForeignKeyViolationError
                final_vehiculo_id = None

        # 1. Registro Ligero de Usuario/Vehículo si se proveen datos manuales
        if datos.cedula_manual:

            # Buscar si ya existe por cédula
            q_u = select(Usuario).where(Usuario.cedula == datos.cedula_manual)
            res_u = await db.execute(q_u)
            usuario_existente = res_u.scalar_one_or_none()

            if not usuario_existente:
                # Crear usuario temporal ligero
                usuario_existente = Usuario(
                    cedula=datos.cedula_manual,
                    nombre=datos.nombre_manual or "VISITANTE",
                    apellido="TEMPORAL",
                    telefono=datos.telefono_manual, # Nuevo campo de contacto
                    rol=RolTipo.SOCIO,
                    password_hash="MANUAL_REG", # No podrá loguearse sin reset
                    activo=True
                )
                db.add(usuario_existente)
                await db.flush()
            elif datos.telefono_manual:
                # Si el usuario ya existe, actualizar su teléfono para futuras comunicaciones
                usuario_existente.telefono = datos.telefono_manual

            
            final_usuario_id = usuario_existente.id

            # Si hay datos de vehículo manual (al menos la placa es requerida si se envía algo)
            if datos.vehiculo_placa:
                # Buscar vehículo por placa
                q_v = select(Vehiculo).where(Vehiculo.placa == datos.vehiculo_placa)
                res_v = await db.execute(q_v)
                v_existente = res_v.scalar_one_or_none()

                if not v_existente:
                    # Crear vehículo con campos desglosados
                    v_existente = Vehiculo(
                        placa=datos.vehiculo_placa,
                        marca=datos.vehiculo_marca or "GENÉRICO",
                        modelo=datos.vehiculo_modelo or "GENÉRICO",
                        color=datos.vehiculo_color or "SIN COLOR", # Evita NotNullViolation
                        socio_id=final_usuario_id,
                        activo=True
                    )
                    db.add(v_existente)
                    await db.flush()
                
                final_vehiculo_id = v_existente.id

        # 2. Si todavía no tenemos usuario_id, el registro de acceso quedará sin usuario asociado
        # logueando la entrada exclusivamente por el medio temporal (qr_id).
        # (Se eliminó la creación del usuario VISITANTE_ANÓNIMO a petición de mantener la tabla limpia)

        # 2.5 SOP Auto-Cierre por Re-entrada (Aegis v2.3 Mandatorio)
        # Si es una entrada, verificar si existe una entrada previa sin salida para este vehículo
        if datos.tipo == AccesoTipo.entrada:
            placa_para_buscar = datos.vehiculo_placa
            if not placa_para_buscar and final_vehiculo_id:
                v_db = await db.get(Vehiculo, final_vehiculo_id)
                if v_db: placa_para_buscar = v_db.placa
            elif not placa_para_buscar and final_vehiculo_pase_id:
                vp_db = await db.get(VehiculoPase, final_vehiculo_pase_id)
                if vp_db: placa_para_buscar = vp_db.placa
            
            if placa_para_buscar:
                q_last = select(Acceso).where(
                    or_(
                        Acceso.vehiculo_placa == placa_para_buscar,
                        Acceso.vehiculo_id == final_vehiculo_id if final_vehiculo_id else False
                    )
                ).order_by(Acceso.timestamp.desc()).limit(1)
                
                res_last = await db.execute(q_last)
                ultimo_acceso = res_last.scalar_one_or_none()
                
                if ultimo_acceso and ultimo_acceso.tipo == AccesoTipo.entrada:
                    # Crear salida automática para cerrar el ciclo previo
                    salida_auto = Acceso(
                        qr_id = ultimo_acceso.qr_id,
                        usuario_id = ultimo_acceso.usuario_id,
                        vehiculo_id = ultimo_acceso.vehiculo_id,
                        vehiculo_pase_id = ultimo_acceso.vehiculo_pase_id,
                        tipo = AccesoTipo.salida,
                        punto_acceso = "SISTEMA (RE-ENTRADA)",
                        registrado_por = registrado_por_id,
                        es_manual = True,
                        observaciones = f"Auto-cierre por entrada detectada en {datos.punto_acceso}"
                    )
                    db.add(salida_auto)
                    await db.flush() 

        # 3. Persistir Acceso
        nuevo_acceso = Acceso(
            qr_id = datos.qr_id,
            usuario_id = final_usuario_id,
            vehiculo_id = final_vehiculo_id,
            vehiculo_pase_id = final_vehiculo_pase_id,
            tipo = datos.tipo,
            punto_acceso = datos.punto_acceso,
            registrado_por = registrado_por_id,
            es_manual = datos.es_manual,
            # Nuevos campos de Aegis Tactical v2.2 (Vehículos Fantasma)
            nombre_manual = datos.nombre_manual,
            cedula_manual = datos.cedula_manual,
            telefono_manual = datos.telefono_manual,
            vehiculo_placa = datos.vehiculo_placa,
            vehiculo_marca = datos.vehiculo_marca,
            vehiculo_modelo = datos.vehiculo_modelo,
            vehiculo_color = datos.vehiculo_color,
            observaciones = datos.observaciones,
            es_excepcion = datos.es_excepcion
        )
        db.add(nuevo_acceso)

        # Si es un QR vinculado a un lote, incrementar accesos_usados SOLO en entrada
        if datos.qr_id:
            qr_db = await db.get(CodigoQR, datos.qr_id)
            if qr_db:
                if qr_db.lote_id and datos.tipo == AccesoTipo.entrada:
                    qr_db.accesos_usados += 1
                    
        # Si el QR no tenía usuario_id (evento_simple), vincularlo al creado ahora para trazabilidad futura
                if not qr_db.usuario_id and final_usuario_id:
                    qr_db.usuario_id = final_usuario_id
        
        # 4. Comprometer transacción principal
        await db.commit()
        await db.refresh(nuevo_acceso)

        # 5. Sistema de Notificaciones (Post-Commit)
        # 5.1 Alerta de Vehículo Excepcional / Fantasma / Intimidación
        if datos.es_excepcion:
            try:
                # Esta alerta va para supervisores y administradores
                await notificacion_service.notificar_excepcion_alcabala(nuevo_acceso)
            except Exception as e:
                print(f"[TACTICAL] Error notificar excepción: {e}")

        # 5.2 Notificaciones de flujo normal
        if datos.qr_id and datos.tipo == AccesoTipo.entrada:
            try:
                # Recargar QR para asegurar que tenemos los datos frescos post-commit
                qr_db = await db.get(CodigoQR, datos.qr_id)
                if qr_db and qr_db.lote_id:
                    # Resolver Zona
                    zona_id = qr_db.zona_asignada_id
                    if not zona_id:
                        lote = await db.get(LotePaseMasivo, qr_db.lote_id)
                        if lote:
                            zona_id = lote.zona_estacionamiento_id
                    
                    if zona_id:
                        # Datos para la notificación - Priorizar datos manuales de la captura actual
                        placa = nuevo_acceso.vehiculo_placa or (qr_db.vehiculo_placa if qr_db else "PENDIENTE CON ESE PASE")
                        
                        mca = nuevo_acceso.vehiculo_marca or (qr_db.vehiculo_marca if qr_db else "")
                        mod = nuevo_acceso.vehiculo_modelo or (qr_db.vehiculo_modelo if qr_db else "")
                        col = nuevo_acceso.vehiculo_color or (qr_db.vehiculo_color if qr_db else "")
                        
                        detalles = " ".join(filter(None, [mca, mod, col])) or "Pase Masivo"
                        nombre_visitante = nuevo_acceso.nombre_manual or (qr_db.nombre_portador if qr_db else "Visitante")
                        
                        await notificacion_service.notificar_entrada_vehiculo(
                            db,
                            zona_id=zona_id,
                            placa=placa,
                            detalles_vehiculo=detalles,
                            nombre_socio=nombre_visitante
                        )
            except Exception as e:
                # Loguear error pero no propagar para no romper la respuesta al guardia
                print(f"⚠️ ERROR no crítico enviando notificación: {str(e)}")

        return nuevo_acceso

    async def obtener_historial_tactico(self, db: AsyncSession, page: int, size: int, punto_nombre: str = None) -> dict:
        """Obtiene la bitácora de eventos paginada"""

        query = select(Acceso)
        if punto_nombre:
            query = query.where(func.trim(Acceso.punto_acceso) == punto_nombre.strip())

        # Contar total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Obtener página ordenada desc
        query = query.order_by(Acceso.timestamp.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        accesos = result.scalars().all()

        items = []
        for acc in accesos:
            # Rehydrate user
            u_query = select(Usuario).where(Usuario.id == acc.usuario_id)
            u = (await db.execute(u_query)).scalar_one_or_none()
            
            usuario_nombre = "Socio Desconocido"
            vehiculo_str = "SIN VEHÍCULO"
            es_pase_temporal = False
            
            # 1. Resolver Nombre y Tipo
            if u:
                usuario_nombre = f"{u.nombre} {u.apellido}"
            elif acc.qr_id:
                es_pase_temporal = True
                qr_db = await db.get(CodigoQR, acc.qr_id)
                if qr_db and qr_db.nombre_portador:
                    usuario_nombre = f"{qr_db.nombre_portador} (PASE)"
            
            # 2. Resolver Vehículo
            if acc.vehiculo_id:
                v = await db.get(Vehiculo, acc.vehiculo_id)
                if v:
                    vehiculo_str = f"{v.marca} {v.modelo} [{v.placa}]"
            elif acc.vehiculo_pase_id:
                # El usuario entró con un vehículo secundario del pase masivo
                vp = await db.get(VehiculoPase, acc.vehiculo_pase_id)
                if vp:
                    mca = vp.marca or ""
                    mod = vp.modelo or ""
                    col = vp.color or ""
                    detalles = " ".join(filter(None, [mca, mod, col]))
                    if detalles:
                        vehiculo_str = f"{detalles} [{vp.placa}]"
                    else:
                        vehiculo_str = f"PASE [{vp.placa}]"
            elif acc.qr_id:
                # Reutilizar qr_db si ya se cargó, sino cargarlo
                if 'qr_db' not in locals() or not qr_db:
                    qr_db = await db.get(CodigoQR, acc.qr_id)
                if qr_db and qr_db.vehiculo_placa:
                    mca = qr_db.vehiculo_marca or ""
                    mod = qr_db.vehiculo_modelo or ""
                    col = qr_db.vehiculo_color or ""
                    detalles = " ".join(filter(None, [mca, mod, col]))
                    if detalles:
                        vehiculo_str = f"{detalles} [{qr_db.vehiculo_placa}]"
                    else:
                        vehiculo_str = f"PASE [{qr_db.vehiculo_placa}]"

            items.append(EventoTactico(
                id=acc.id,
                tipo=acc.tipo,
                timestamp=acc.timestamp,
                usuario=usuario_nombre,
                vehiculo=vehiculo_str,
                punto=acc.punto_acceso,
                es_manual=acc.es_manual,
                es_pase_temporal=es_pase_temporal
            ))

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size
        }

    async def buscar_por_placa(self, db: AsyncSession, placa: str, tipo: AccesoTipo) -> ResultadoValidacion:
        """
        Busca un vehículo por placa exacta en todos los orígenes posibles.
        SOP: Aegis Tactical v2.2 - Verificación Manual de Contingencia.
        """
        placa = placa.strip().upper()
        
        # 1. Buscar en Vehiculo (Socio permanente)
        query_v = select(Vehiculo).where(Vehiculo.placa == placa, Vehiculo.activo == True)
        res_v = await db.execute(query_v)
        vehiculo = res_v.scalar_one_or_none()
        
        if vehiculo:
            # Buscar al socio
            query_socio = select(Usuario).where(Usuario.id == vehiculo.socio_id, Usuario.activo == True)
            res_socio = await db.execute(query_socio)
            socio = res_socio.scalar_one_or_none()
            
            if socio:
                # Validar membresía e infracciones (Lógica simplificada de validar_qr)
                query_mem = select(Membresia).where(Membresia.socio_id == socio.id).order_by(Membresia.updated_at.desc())
                res_mem = await db.execute(query_mem)
                membresia = res_mem.scalars().first()
                
                query_inf = select(Infraccion).where(Infraccion.usuario_id == socio.id, Infraccion.estado == InfraccionEstado.activa)
                res_inf = await db.execute(query_inf)
                infracciones = res_inf.scalars().all()
                
                query_ent = select(EntidadCivil).where(EntidadCivil.id == socio.entidad_id)
                res_ent = await db.execute(query_ent)
                entidad = res_ent.scalar_one_or_none()
                
                # Buscar QR activo para este socio si existe (para trazabilidad)
                query_qr = select(CodigoQR).where(CodigoQR.usuario_id == socio.id, CodigoQR.activo == True).order_by(CodigoQR.created_at.desc())
                res_qr = await db.execute(query_qr)
                qr_db = res_qr.scalar_one_or_none()
                
                bloqueado = False
                msg_bloqueo = ""
                if tipo == AccesoTipo.salida:
                    for inf in infracciones:
                        if inf.bloquea_salida:
                            bloqueado = True
                            msg_bloqueo = f"SALIDA BLOQUEADA: {inf.descripcion}"
                            break
                
                if not bloqueado and membresia and membresia.estado not in [MembresiaEstado.activa, MembresiaEstado.exonerada]:
                    bloqueado = False # El sistema de alcabala suele dejar pasar pero marcar warning? 
                    # Re-revisando validar_qr: ahí SÍ bloquea si la membresía no es activa/exonerada.
                    # Líneas 206-213 de validar_qr.
                    return ResultadoValidacion(
                        permitido=False, 
                        mensaje=f"MEMBRESÍA {(membresia.estado.value if membresia else 'INEXISTENTE').upper()}", 
                        tipo_alerta="error",
                        socio=socio,
                        vehiculo=vehiculo
                    )

                return ResultadoValidacion(
                    permitido = not bloqueado,
                    mensaje = msg_bloqueo or "Vehículo Permanente Identificado",
                    tipo_alerta = "error" if bloqueado else ("warning" if infracciones else "success"),
                    socio = socio,
                    vehiculo = vehiculo,
                    vehiculos = [vehiculo],
                    entidad_nombre = entidad.nombre if entidad else "N/A",
                    qr_id = qr_db.id if qr_db else None,
                    usuario_id = socio.id,
                    vehiculo_id = vehiculo.id,
                    infracciones_activas = [{"tipo": i.tipo, "descripcion": i.descripcion, "bloquea": i.bloquea_salida} for i in infracciones],
                    membresia_info = {
                        "id": membresia.id,
                        "estado": membresia.estado,
                        "progreso": membresia_service.calcular_progreso(membresia)
                    } if membresia else None
                )

        # 2. Buscar en VehiculoPase (Pases Masivos / Eventos)
        query_vp = select(VehiculoPase).where(VehiculoPase.placa == placa)
        res_vp = await db.execute(query_vp)
        vehiculo_pase = res_vp.scalar_one_or_none()
        
        if vehiculo_pase:
            # Buscar el QR
            qr_db = await db.get(CodigoQR, vehiculo_pase.qr_id)
            if qr_db:
                # Validar el QR
                datos_val = AccesoValidar(qr_token=qr_db.token, tipo=tipo)
                res = await self.validar_qr(db, datos_val)
                # Forzar el vehículo específico de la placa
                res.vehiculo = {
                    "id": vehiculo_pase.id,
                    "placa": vehiculo_pase.placa,
                    "marca": vehiculo_pase.marca or "GENÉRICO",
                    "modelo": vehiculo_pase.modelo or "GENÉRICO",
                    "color": vehiculo_pase.color or "SIN COLOR",
                    "activo": True,
                    "socio_id": res.usuario_id,
                    "created_at": vehiculo_pase.created_at
                }
                res.vehiculo_id = vehiculo_pase.id
                return res

        # 3. Buscar en CodigoQR (Placa principal del pase)
        query_qrp = select(CodigoQR).where(CodigoQR.vehiculo_placa == placa, CodigoQR.activo == True).order_by(CodigoQR.created_at.desc())
        res_qrp = await db.execute(query_qrp)
        qr_p = res_qrp.scalar_one_or_none()
        
        if qr_p:
            datos_val = AccesoValidar(qr_token=qr_p.token, tipo=tipo)
            return await self.validar_qr(db, datos_val)

        # 4. No encontrado
        return ResultadoValidacion(
            permitido=False, 
            mensaje=f"PLACA {placa} NO REGISTRADA", 
            tipo_alerta="error"
        )

acceso_service = AccesoService()
