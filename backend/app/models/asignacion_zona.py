"""
Modelo AsignacionZona.
Asigna una capacidad específica a una Entidad dentro de una Zona compartida.
"""
import uuid
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class AsignacionZona(Base):
    __tablename__ = "asignaciones_zona"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zona_id = Column(UUID(as_uuid=True), ForeignKey("zonas_estacionamiento.id", ondelete="CASCADE"), nullable=False, index=True)
    entidad_id = Column(UUID(as_uuid=True), ForeignKey("entidades_civiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    capacidad_asignada = Column(Integer, nullable=False)
    fecha_inicio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=True)
    activa = Column(Boolean, default=True, nullable=False)

    # Relaciones
    # zona = relationship("ZonaEstacionamiento")
    # entidad = relationship("EntidadCivil")
