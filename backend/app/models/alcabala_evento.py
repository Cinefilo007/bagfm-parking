"""
Modelos para Gestión de Alcabalas y Eventos.
Sigue la directiva FL-08 para pases masivos.
"""
import uuid
from sqlalchemy import Column, String, Boolean, Text, DateTime, Date, ForeignKey, Integer, Numeric, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.enums import SolicitudEstado

class PuntoAcceso(Base):
    __tablename__ = "puntos_acceso"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(200), nullable=False)
    ubicacion = Column(String(500), nullable=True)
    latitud = Column(Numeric(10, 8), nullable=True)
    longitud = Column(Numeric(11, 8), nullable=True)
    
    # Usuario fijo de guardia para esta alcabala
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)
    
    # Semillas para rotación de claves
    # secret_key: semilla persistente única por alcabala
    # key_salt: salt variable para regeneración manual de emergencia
    secret_key = Column(String(100), nullable=True)
    key_salt = Column(String(100), nullable=True)
    
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SolicitudEvento(Base):
    __tablename__ = "solicitudes_evento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entidad_id = Column(UUID(as_uuid=True), ForeignKey("entidades_civiles.id", ondelete="RESTRICT"), nullable=False)
    solicitado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    
    nombre_evento = Column(String(200), nullable=False)
    fecha_evento = Column(Date, nullable=False)
    cantidad_solicitada = Column(Integer, nullable=False)
    cantidad_aprobada = Column(Integer, nullable=True)
    motivo = Column(Text, nullable=False)
    
    estado = Column(SQLEnum(SolicitudEstado, name="solicitud_estado", native_enum=True), default=SolicitudEstado.pendiente)
    
    revisado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)
    motivo_rechazo = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revisado_at = Column(DateTime(timezone=True), nullable=True)

class GuardiaTurno(Base):
    """
    Registro histórico de quién estuvo físicamente operando la alcabala.
    Se crea un registro cada vez que un guardia se identifica al iniciar el turno.
    """
    __tablename__ = "guardias_turno"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    punto_id = Column(UUID(as_uuid=True), ForeignKey("puntos_acceso.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    
    # Datos de identificación personal suministrados en el relevo
    grado = Column(String(100), nullable=True)
    nombre = Column(String(200), nullable=False)
    apellido = Column(String(200), nullable=False)
    telefono = Column(String(50), nullable=True)
    unidad = Column(String(200), nullable=True)
    
    # Tiempos del turno
    inicio_turno = Column(DateTime(timezone=True), server_default=func.now())
    # Una clave 'clonada' o salt para el que inició el turno (opcional por auditoría)
    key_version = Column(String(50), nullable=True) 
    
    activo = Column(Boolean, default=True) # Si es el guardia actual
