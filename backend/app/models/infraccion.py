"""
Modelo Infraccion.
Infracciones registradas a los vehículos por los Supervisores/Comando.
"""
import uuid
from sqlalchemy import Column, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import InfraccionTipo, InfraccionEstado

class Infraccion(Base):
    __tablename__ = "infracciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehiculo_id = Column(UUID(as_uuid=True), ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=False, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    reportado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    
    tipo = Column(SQLEnum(InfraccionTipo, name="infraccion_tipo", native_enum=True), nullable=False)
    descripcion = Column(Text, nullable=False)
    foto_url = Column(Text, nullable=True)
    
    bloquea_salida = Column(Boolean, default=True, nullable=False)
    
    estado = Column(SQLEnum(InfraccionEstado, name="infraccion_estado", native_enum=True), nullable=False, index=True)
    
    resuelta_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)
    resuelta_at = Column(DateTime(timezone=True), nullable=True)
    observaciones_resolucion = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relaciones
    # vehiculo = relationship("Vehiculo", back_populates="infracciones")
    # infractor = relationship("Usuario", foreign_keys=[usuario_id])
    # reportero = relationship("Usuario", foreign_keys=[reportado_por])
    # resolutor = relationship("Usuario", foreign_keys=[resuelta_por])
