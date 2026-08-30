import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ground-Zero AI Intelligence Microservice"
    HOST: str = "0.0.0.0"
    PORT: int = 8005
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:3000")
    
    # LangGraph & Agent Config
    GROQ_API_KEY: Optional[str] = None
    MONGODB_URI: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
