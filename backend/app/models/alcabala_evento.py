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
    latitud = Column(Numeric(10, 8), nullable=True)
    longitud = Column(Numeric(11, 8), nullable=True)
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
