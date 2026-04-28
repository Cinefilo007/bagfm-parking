"""
Service para el Mapa Táctico (Async).
Agrega información de múltiples entidades para proporcionar una visión situacional completa.
"""
from datetime import date
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, Date, cast
from app.models.entidad_civil import EntidadCivil
from app.models.alcabala_evento import PuntoAcceso
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.acceso import Acceso
from app.models.infraccion import Infraccion
from app.models.enums import InfraccionEstado, RolTipo
from app.models.usuario import Usuario

async def get_situacion_actual(db: AsyncSession):
    hoy = date.today()
    
    # 1. Entidades Civiles + Ocupación Dinámica (Aproximada por accesos hoy)
    # Contamos vehículos que entraron hoy y no tienen salida posterior hoy (para usuarios de esa entidad)
    query_entidades = select(EntidadCivil).filter(EntidadCivil.activo == True)
    result_entidades = await db.execute(query_entidades)
    entidades = result_entidades.scalars().all()
    
    entidades_data = []
    for ent in entidades:
        # Miembros de esta entidad que han entrado hoy
        query_entradas = select(func.count(Acceso.id)).join(
            Usuario, Acceso.usuario_id == Usuario.id
        ).filter(
            Usuario.entidad_id == ent.id,
            Acceso.tipo == "entrada",
            func.cast(Acceso.timestamp, Date) == hoy
        )
        
        # Miembros de esta entidad que han salido hoy
        query_salidas = select(func.count(Acceso.id)).join(
            Usuario, Acceso.usuario_id == Usuario.id
        ).filter(
            Usuario.entidad_id == ent.id,
            Acceso.tipo == "salida",
            func.cast(Acceso.timestamp, Date) == hoy
        )
        
        entradas = (await db.execute(query_entradas)).scalar() or 0
        salidas = (await db.execute(query_salidas)).scalar() or 0
        ocupacion = max(0, entradas - salidas)
        
        ent_dict = {
            "id": ent.id,
            "nombre": ent.nombre,
            "latitud": ent.latitud,
            "longitud": ent.longitud,
            "capacidad_total": ent.capacidad_vehiculos,
            "ocupacion_actual": ocupacion
        }
        entidades_data.append(ent_dict)

    # 2. Alcabalas (Puntos de Acceso) + Estadísticas de Flujo
    query_alcabalas = select(PuntoAcceso).filter(PuntoAcceso.activo == True)
    result_alcabalas = await db.execute(query_alcabalas)
    alcabalas_objs = result_alcabalas.scalars().all()
    
    alcabalas_data = []
    for a in alcabalas_objs:
        # Flujo por nombre de punto de acceso (Normalizado para evitar discrepancias)
        nombre_normalizado = a.nombre.strip()
        q_ent = select(func.count(Acceso.id)).filter(
            func.trim(Acceso.punto_acceso) == nombre_normalizado,
            Acceso.tipo == "entrada",
            func.cast(Acceso.timestamp, Date) == hoy
        )
        q_sal = select(func.count(Acceso.id)).filter(
            func.trim(Acceso.punto_acceso) == nombre_normalizado,
            Acceso.tipo == "salida",
            func.cast(Acceso.timestamp, Date) == hoy
        )
        entradas = (await db.execute(q_ent)).scalar() or 0
        salidas = (await db.execute(q_sal)).scalar() or 0
        
        # Obtener personal si existe
        from app.services.alcabala_mgmt_service import alcabala_service
        guardia = await alcabala_service.obtener_guardia_actual(db, a.id)
        
        alcabalas_data.append({
            "id": str(a.id),
            "nombre": a.nombre,
            "latitud": a.latitud,
            "longitud": a.longitud,
            "entradas_hoy": entradas,
            "salidas_hoy": salidas,
            "personal_activo": f"{guardia.grado} {guardia.nombre}" if guardia else "SIN COMANDO"
        })

    # 3. Zonas de Estacionamiento (Convertir a dict para serialización limpia)
    query_zonas = select(ZonaEstacionamiento).filter(ZonaEstacionamiento.activo == True)
    result_zonas = await db.execute(query_zonas)
    zonas_objs = result_zonas.scalars().all()
    
    zonas_data = []
    for z in zonas_objs:
        zonas_data.append({
            "id": z.id,
            "nombre": z.nombre,
            "latitud": z.latitud,
            "longitud": z.longitud,
            "poligono": z.poligono,
            "area_m2": z.area_m2,
            "capacidad_total": z.capacidad_total,
            "ocupacion_actual": z.ocupacion_actual,
            "config_ia": z.config_ia,
            "grilla_tactica": z.grilla_tactica
        })

    # 4. Eventos Recientes (Monitor en tiempo real)
    # Combinar los últimos 15 accesos con info vehicular
    query_recientes = select(Acceso).order_by(Acceso.timestamp.desc()).limit(15)
    result_recientes = await db.execute(query_recientes)
    accesos_recientes = result_recientes.scalars().all()
    
    eventos_data = []
    for acc in accesos_recientes:
        # Rehidratar usuario para nombre
        q_u = select(Usuario).filter(Usuario.id == acc.usuario_id)
        u = (await db.execute(q_u)).scalar_one_or_none()
        
        # Obtener vehículo si existe
        vehiculo_str = "SIN VEHÍCULO"
        if acc.vehiculo_id:
            from app.models.vehiculo import Vehiculo
            v = await db.get(Vehiculo, acc.vehiculo_id)
            if v:
                vehiculo_str = f"{v.marca} {v.modelo} [{v.placa}]"

        eventos_data.append({
            "id": acc.id,
            "tipo": acc.tipo, # entrada / salida
            "timestamp": acc.timestamp.isoformat(),
            "usuario": f"{u.nombre} {u.apellido}" if u else "Socio Desconocido",
            "vehiculo": vehiculo_str,
            "punto": acc.punto_acceso,
            "es_manual": acc.es_manual
        })

    # 5. Globales Refinados
    query_entradas = select(func.count(Acceso.id)).filter(
        func.cast(Acceso.timestamp, Date) == hoy,
        Acceso.tipo == "entrada"
    )
    total_entradas = (await db.execute(query_entradas)).scalar() or 0
    
    # Nuevo cálculo de Vehículos Dentro basado en Pases Activos (Parqueros)
    # Esto elimina el error de conteo cuando un vehículo entra en un día y asume ocupación 
    # constante sin límite de hoy vs ayer.
    from app.models.vehiculo_pase import VehiculoPase
    query_vp_activos = select(func.count(VehiculoPase.id)).filter(VehiculoPase.ingresado == True)
    vehiculos_dentro = (await db.execute(query_vp_activos)).scalar() or 0

    # 6. Bloqueados reales (Socios con activo=False)
    query_bloqueados = select(func.count(Usuario.id)).filter(
        Usuario.activo == False,
        Usuario.rol == RolTipo.SOCIO
    )
    bloqueados_reales = (await db.execute(query_bloqueados)).scalar() or 0

    # 6. Alertas (Deshabilitado temporalmente - Módulo no disponible)
    alertas_activas = 0

    return {
        "entidades": entidades_data,
        "alcabalas": alcabalas_data,
        "zonas_estacionamiento": zonas_data,
        "vehiculos_dentro": vehiculos_dentro,
        "total_accesos_hoy": total_entradas,
        "alertas_activas": alertas_activas,
        "bloqueados_total": bloqueados_reales,
        "eventos_recientes": eventos_data
    }

async def get_trafico_historico(db: AsyncSession, weeks_ago: int = 0):
    """Retorna el conteo de entradas diarias para una semana específica."""
    from datetime import timedelta, date as datetime_date
    
    hoy = datetime_date.today()
    offset = weeks_ago * 7
    fin_rango = hoy - timedelta(days=offset)
    inicio_rango = fin_rango - timedelta(days=6)
    
    # Generar todos los días del rango para asegurar que haya datos (incluso ceros)
    dias_rango = []
    for i in range(7):
        dias_rango.append(inicio_rango + timedelta(days=i))
    
    # Consulta: Contar entradas por día
    query = select(
        cast(Acceso.timestamp, Date).label('fecha'),
        func.count(Acceso.id).label('total')
    ).filter(
        Acceso.tipo == "entrada",
        cast(Acceso.timestamp, Date) >= inicio_rango,
        cast(Acceso.timestamp, Date) <= fin_rango
    ).group_by(
        cast(Acceso.timestamp, Date)
    ).order_by(
        cast(Acceso.timestamp, Date)
    )
    
    result = await db.execute(query)
    data_map = {row.fecha: row.total for row in result.all()}
    
    # Consolidar con ceros para días sin tráfico
    resultado = []
    for d in dias_rango:
        resultado.append({
            "fecha": d.isoformat(),
            "dia": d.strftime("%a").upper(), # Eje X: Lun, Mar, etc.
            "total": data_map.get(d, 0)
        })
        
    return {
        "semana": {
            "inicio": inicio_rango.isoformat(),
            "fin": fin_rango.isoformat(),
            "weeks_ago": weeks_ago
        },
        "puntos": resultado
    }

async def actualizar_georreferencia(
    db: AsyncSession, 
    tipo: Literal['entidad', 'alcabala', 'zona'], 
    res_id: str, 
    lat: float, 
    lng: float
):
    """Actualiza la ubicación física de una entidad táctica en el mapa."""
    if tipo == 'entidad':
        obj = await db.get(EntidadCivil, res_id)
    elif tipo == 'alcabala':
        obj = await db.get(PuntoAcceso, res_id)
    elif tipo == 'zona':
        obj = await db.get(ZonaEstacionamiento, res_id)
    else:
        return False
    
    if obj:
        obj.latitud = lat
        obj.longitud = lng
        await db.commit()
        return True
    return False
