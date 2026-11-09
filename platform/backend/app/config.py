from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]  # platform/
STORAGE = ROOT / "storage"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "StarCompute Platform"
    api_prefix: str = "/api/v1"
    secret_key: str = "starcompute-dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 12
    database_url: str = f"sqlite:///{(STORAGE / 'starcompute.db').as_posix()}"
    storage_dir: Path = STORAGE
    algo_mode: str = "lite"  # lite | full
    cors_origins: list[str] = [
        "http://127.0.0.1:5104",
        "http://localhost:5104",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
(settings.storage_dir / "uploads").mkdir(exist_ok=True)
(settings.storage_dir / "exports").mkdir(exist_ok=True)
(settings.storage_dir / "masks").mkdir(exist_ok=True)
(settings.storage_dir / "models").mkdir(exist_ok=True)
(settings.storage_dir / "runs").mkdir(exist_ok=True)
