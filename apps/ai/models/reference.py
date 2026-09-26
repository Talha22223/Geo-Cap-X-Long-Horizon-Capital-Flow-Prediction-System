"""
SQLAlchemy models for normalized reference tables.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base, TimestampMixin


class Region(Base, TimestampMixin):
    __tablename__ = "ref_regions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Country(Base, TimestampMixin):
    __tablename__ = "ref_countries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    code2: Mapped[str | None] = mapped_column(String(2), unique=True, nullable=True)  # ISO 2
    code3: Mapped[str | None] = mapped_column(String(3), unique=True, nullable=True)  # ISO 3
    region_name: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)


class Sector(Base, TimestampMixin):
    __tablename__ = "ref_sectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Industry(Base, TimestampMixin):
    __tablename__ = "ref_industries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    sector_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)


class Commodity(Base, TimestampMixin):
    __tablename__ = "ref_commodities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g., Energy, Metals


class Currency(Base, TimestampMixin):
    __tablename__ = "ref_currencies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)  # ISO 3
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(10), nullable=True)
