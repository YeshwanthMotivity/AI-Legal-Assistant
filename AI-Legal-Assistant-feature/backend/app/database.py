from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, func
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import uuid
import bcrypt


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def get_db() -> AsyncSession:
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    # Ensure all model modules are imported so metadata is fully registered.
    from app.modules.user import models as user_models  # noqa: F401
    from app.modules.case import models as case_models  # noqa: F401
    from app.modules.document import models as document_models  # noqa: F401
    from app.modules.evaluation import models as evaluation_models  # noqa: F401
    from app.modules.audit import models as audit_models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default auth users for local/dev environments.
    from app.modules.user.models import User, UserRole

    async with AsyncSessionLocal() as session:
        count_result = await session.execute(select(func.count(User.id)))
        user_count = count_result.scalar_one()
        if user_count == 0:
            default_users = [
                User(
                    id=str(uuid.uuid4()),
                    email="admin@example.com",
                    username="admin",
                    full_name="Admin User",
                    role=UserRole.ADMIN,
                    hashed_password=_hash_password("admin"),
                    is_active="true",
                ),
                User(
                    id=str(uuid.uuid4()),
                    email="judge@example.com",
                    username="judge",
                    full_name="Judge User",
                    role=UserRole.JUDGE,
                    hashed_password=_hash_password("judge"),
                    is_active="true",
                ),
                User(
                    id=str(uuid.uuid4()),
                    email="clerk@example.com",
                    username="clerk",
                    full_name="Clerk User",
                    role=UserRole.CLERK,
                    hashed_password=_hash_password("clerk"),
                    is_active="true",
                ),
            ]
            session.add_all(default_users)
            await session.commit()


async def close_db():
    """Close database connections."""
    await engine.dispose()

