"""
Modelo VehiculoPase.
Para manejar los pases multi-vehículo, permitiendo a VIPS o miembros del Staff registrar varios vehículos bajo un solo pase (QR).
"""
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class VehiculoPase(Base):
    __tablename__ = "vehiculos_pase"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qr_id = Column(UUID(as_uuid=True), ForeignKey("codigos_qr.id", ondelete="CASCADE"), nullable=False, index=True)
    
    placa = Column(String(20), nullable=False)
    marca = Column(String(50), nullable=True)
    modelo = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    
    zona_asignada_id = Column(UUID(as_uuid=True), ForeignKey("zonas_estacionamiento.id", ondelete="RESTRICT"), nullable=True)
    puesto_asignado_id = Column(UUID(as_uuid=True), ForeignKey("puestos_estacionamiento.id", ondelete="RESTRICT"), nullable=True)
    
    ingresado = Column(Boolean, default=False, nullable=False)
    hora_ingreso = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relaciones
    # codigo_qr = relationship("CodigoQR")
