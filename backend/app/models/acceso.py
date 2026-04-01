"""
Modelo Acceso.
Log de entradas y salidas de la base (control de alcabala central).
"""
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import AccesoTipo

class Acceso(Base):
    __tablename__ = "accesos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Referencias de quién entró
    qr_id = Column(UUID(as_uuid=True), ForeignKey("codigos_qr.id", ondelete="RESTRICT"), nullable=True) # Puede ser manual
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    vehiculo_id = Column(UUID(as_uuid=True), ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=True)
    
    tipo = Column(SQLEnum(AccesoTipo, name="acceso_tipo", native_enum=True), nullable=False)
    
    punto_acceso = Column(String(100), nullable=False) # ej: "Alcabala Principal"
    registrado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    es_manual = Column(Boolean, default=False, nullable=False)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relaciones
    # qr = relationship("CodigoQR", back_populates="accesos")
    # visitante = relationship("Usuario", foreign_keys=[usuario_id])
    # vehiculo = relationship("Vehiculo")
    # registrador = relationship("Usuario", foreign_keys=[registrado_por])
