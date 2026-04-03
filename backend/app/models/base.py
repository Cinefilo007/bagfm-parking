"""
Base y registro para SQLAlchemy.
Importar todos los modelos aquí para que Alembic los detecte correctamente
cuando importe `Base.metadata`.
"""
from app.core.database import Base

from app.models.enums import RolTipo, MembresiaEstado, QRTipo, AccesoTipo, InfraccionTipo, InfraccionEstado, SolicitudEstado
from app.models.configuracion import ConfiguracionSistema
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.entidad_civil import EntidadCivil
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo
from app.models.membresia import Membresia
from app.models.codigo_qr import CodigoQR
from app.models.acceso import Acceso
from app.models.infraccion import Infraccion
from app.models.alcabala_evento import PuntoAcceso, SolicitudEvento
