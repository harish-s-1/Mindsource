"""SQLAlchemy engine, session factory and declarative base."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL

# check_same_thread=False is required for SQLite under FastAPI's threadpool.
_connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# New columns added for the live GPU connector, with SQLite-compatible DDL.
# Prototype-grade additive migration only (no Alembic) — enough to keep an
# existing mindsource.db working without a destructive reset.
_NODE_COLUMN_DDL: dict[str, str] = {
    "source": "VARCHAR NOT NULL DEFAULT 'simulated'",
    "hostname": "VARCHAR",
    "gpu_name": "VARCHAR",
    "memory_total_mb": "INTEGER",
    "memory_used_mb": "INTEGER",
    "temperature_c": "INTEGER",
    "last_seen": "VARCHAR",
}


def apply_light_migrations() -> None:
    """Add any missing Node columns to an existing SQLite database in place.

    create_all() creates missing tables but never alters existing ones, so a
    database seeded before the connector feature would lack the new columns.
    This adds only the missing ones and leaves existing data intact.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "nodes" not in inspector.get_table_names():
        return  # fresh DB — create_all() will build the current schema
    existing = {col["name"] for col in inspector.get_columns("nodes")}
    missing = {c: ddl for c, ddl in _NODE_COLUMN_DDL.items() if c not in existing}
    if not missing:
        return
    with engine.begin() as conn:
        for column, ddl in missing.items():
            conn.execute(text(f"ALTER TABLE nodes ADD COLUMN {column} {ddl}"))
