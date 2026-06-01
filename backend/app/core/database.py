from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Creates the connection to PostgreSQL
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True  # logs all SQL queries to the terminal, helpful during development
)

# A session is like a temporary workspace for database operations
# Each request gets its own session, which is closed when the request is done
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class that all models (tables) will inherit from
class Base(DeclarativeBase):
    pass

# This function is called by controllers to get a database session
# 'yield' means it hands the session to the caller, then closes it automatically when done
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session