import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ground-Zero AI Intelligence Microservice"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:3000")

    class Config:
        env_file = ".env"

settings = Settings()
