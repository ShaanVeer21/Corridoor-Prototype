"""
Database configuration for Corridoor backend.
Currently using SQLite for prototype.
To switch to PostgreSQL, change DATABASE_URL to:
    postgresql+asyncpg://user:password@localhost:5432/corridoor
and install asyncpg: pip install asyncpg
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

# ── SQLite for prototype (swap this one line for Postgres) ──
DATABASE_URL = "sqlite+aiosqlite:///./corridoor.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency for FastAPI route injection."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)