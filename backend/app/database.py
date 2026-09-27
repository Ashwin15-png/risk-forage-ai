import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Configure engine based on SQLite or PostgreSQL
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Serverless Neon PostgreSQL connection optimization
    engine_kwargs["pool_recycle"] = 300
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import app.models  # Ensure all models are registered
    Base.metadata.create_all(bind=engine)

    # Safe schema migration for newly added vulnerability columns
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "vulnerabilities" in inspector.get_table_names():
        existing_cols = {c["name"] for c in inspector.get_columns("vulnerabilities")}
        new_cols = [
            ("epss_score", "FLOAT DEFAULT 0.0"),
            ("epss_percentile", "FLOAT DEFAULT 0.0"),
            ("is_cisa_kev", "BOOLEAN DEFAULT FALSE"),
            ("kev_date_added", "VARCHAR(50)"),
            ("affected_product", "VARCHAR(255)"),
            ("cpe_uri", "VARCHAR(255)"),
            ("confidence_score", "FLOAT DEFAULT 90.0"),
            ("source", "VARCHAR(100) DEFAULT 'NVD'"),
            ("source_timestamp", "TIMESTAMP"),
            ("correlation_status", "VARCHAR(50) DEFAULT 'CORRELATED'"),
            ("correlation_confidence", "FLOAT DEFAULT 95.0"),
        ]
        with engine.begin() as conn:
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE vulnerabilities ADD COLUMN {col_name} {col_type}"))
                    except Exception as ex:
                        pass

    # Safe schema migration for Firebase authentication columns on users table
    if "users" in inspector.get_table_names():
        existing_user_cols = {c["name"] for c in inspector.get_columns("users")}
        new_user_cols = [
            ("firebase_uid", "VARCHAR(128)"),
            ("photo_url", "VARCHAR(500)"),
            ("provider", "VARCHAR(100) DEFAULT 'password'"),
            ("last_login_at", "TIMESTAMP"),
        ]
        with engine.begin() as conn:
            for col_name, col_type in new_user_cols:
                if col_name not in existing_user_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    except Exception as ex:
                        pass
            # Also make hashed_password nullable for Google-only users
            if "hashed_password" in existing_user_cols:
                try:
                    if db_url.startswith("sqlite"):
                        pass  # SQLite doesn't enforce NOT NULL changes
                    else:
                        conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
                except Exception:
                    pass

