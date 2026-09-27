import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "RISKFORGE AI — Continuous Cyber Risk Intelligence & Investment Optimization"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cyberrisk.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-cyberrisk-jwt-key-sih-2026-quantification")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Environment & CORS
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # External integrations
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    OIDC_CLIENT_ID: str = os.getenv("OIDC_CLIENT_ID", "")
    OIDC_CLIENT_SECRET: str = os.getenv("OIDC_CLIENT_SECRET", "")
    
    # Defaults
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "INR")
    CURRENCY_SYMBOL: str = "₹"
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "ashwin-java-app-2026")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
