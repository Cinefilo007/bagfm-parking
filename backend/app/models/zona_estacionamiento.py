"""
Modelo ZonaEstacionamiento.
Áreas físicas de la base.
"""
import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class ZonaEstacionamiento(Base):
    __tablename__ = "zonas_estacionamiento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(200), nullable=False)
    capacidad_total = Column(Integer, nullable=False)
    ocupacion_actual = Column(Integer, default=0, nullable=False)
    descripcion_ubicacion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relaciones
    # entidades = relationship("EntidadCivil", back_populates="zona", lazy="selectin")
    # accesos_zona = relationship("AccesoZona", back_populates="zona")
