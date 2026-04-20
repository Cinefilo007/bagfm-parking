"""add vehiculo data to codigos_qr

Revision ID: a1b2c3d4e5f6
Revises: 0331f3e6c442
Create Date: 2026-04-20 05:52:00.000000

Añade las columnas del modelo CodigoQR que no fueron incluidas
en migraciones anteriores: datos de vehículo, flags operativos,
y timestamps de entrada.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0331f3e6c442'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Añade columnas faltantes del modelo CodigoQR v2.0."""
    # Datos del vehículo principal
    op.add_column('codigos_qr', sa.Column('vehiculo_marca', sa.String(length=100), nullable=True))
    op.add_column('codigos_qr', sa.Column('vehiculo_modelo', sa.String(length=100), nullable=True))
    op.add_column('codigos_qr', sa.Column('vehiculo_color', sa.String(length=50), nullable=True))

    # Flags operativos
    op.add_column('codigos_qr', sa.Column('multi_vehiculo', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('codigos_qr', sa.Column('datos_completos', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('codigos_qr', sa.Column('verificado_por_parquero', sa.Boolean(), nullable=False, server_default='false'))

    # Timestamps de control de acceso
    op.add_column('codigos_qr', sa.Column('hora_entrada_base', sa.DateTime(timezone=True), nullable=True))
    op.add_column('codigos_qr', sa.Column('hora_llegada_zona', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Revierte la adición de columnas."""
    op.drop_column('codigos_qr', 'hora_llegada_zona')
    op.drop_column('codigos_qr', 'hora_entrada_base')
    op.drop_column('codigos_qr', 'verificado_por_parquero')
    op.drop_column('codigos_qr', 'datos_completos')
    op.drop_column('codigos_qr', 'multi_vehiculo')
    op.drop_column('codigos_qr', 'vehiculo_color')
    op.drop_column('codigos_qr', 'vehiculo_modelo')
    op.drop_column('codigos_qr', 'vehiculo_marca')
