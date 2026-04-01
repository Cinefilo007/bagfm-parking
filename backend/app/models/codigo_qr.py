"""
Modelo CodigoQR.
Representa un código asociado a un socio, vehículo o acceso temporal.
"""
import uuid
from sqlalchemy import Column, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import QRTipo

class CodigoQR(Base):
    __tablename__ = "codigos_qr"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    vehiculo_id = Column(UUID(as_uuid=True), ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=True)
    membresia_id = Column(UUID(as_uuid=True), ForeignKey("membresias.id", ondelete="RESTRICT"), nullable=True)
    
    tipo = Column(SQLEnum(QRTipo, name="qr_tipo", native_enum=True), nullable=False)
    
    token = Column(Text, unique=True, index=True, nullable=False)  # El JWT firmado cifrado en BD
    fecha_expiracion = Column(DateTime(timezone=True), nullable=True)
    
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)

    # Relaciones
    # usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="codigos_qr")
    # vehiculo = relationship("Vehiculo", back_populates="codigos_qr")
    # membresia = relationship("Membresia", back_populates="codigos_qr")
    # accesos = relationship("Acceso", back_populates="qr")
