from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # intentionally no default; if the environment doesn't provide
    # ``DATABASE_URL`` we want the application to fail fast rather than
    # silently connecting to a non‑existent local database.
    database_url: str
    secret_key: str = "changeme"
    team_number: str = "0000"
    environment: str = "production"  # 'development' or 'production'

    # IR thresholds in mΩ
    ir_warn_threshold: float = 22.0
    ir_retire_threshold: float = 30.0

    class Config:
        env_file = ".env"


settings = Settings()
