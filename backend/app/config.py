import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db: str = os.getenv("MONGODB_DB", "sortr")
    jwt_secret: str = os.getenv("JWT_SECRET", "change-me-super-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


settings = Settings()
