import os
from pathlib import Path
from pydantic import BaseModel

# ponytail: simple os.getenv configuration with .env file fallback, no complex settings class needed
_env_file = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        pass


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://green-ospf-simulator.vercel.app")
    origins: set[str] = set()
    for item in raw.split(","):
        cleaned = item.strip().rstrip("/")
        if cleaned:
            origins.add(cleaned)
    # Always allow local development origins alongside any production URLs
    origins.add("http://localhost:5173")
    origins.add("http://127.0.0.1:5173")
    origins.add("https://green-ospf-simulator.vercel.app")
    return sorted(list(origins))


class Settings(BaseModel):
    project_name: str = os.getenv("PROJECT_NAME", "Green OSPF Network Simulator")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    cors_origins: list[str] = _parse_cors_origins()


settings = Settings()
