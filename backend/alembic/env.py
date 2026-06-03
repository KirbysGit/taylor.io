import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv

from alembic import context

# Make backend/ importable when running alembic from that directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

load_dotenv()

# Import all models so their tables are registered on Base.metadata.
from models import Base  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tailor.db")


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        {"sqlalchemy.url": DATABASE_URL},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        is_sqlite = DATABASE_URL.startswith("sqlite")
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=is_sqlite,  # SQLite needs batch mode for ALTER TABLE
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
