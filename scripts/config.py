from __future__ import annotations

import os
from pathlib import Path


def load_database_url(env_path: str | Path | None = None) -> str:
    """Load DATABASE_URL without printing secrets.

    Supports normal KEY=VALUE .env files and the current project bootstrap shape where
    the .env file contains only a raw postgres connection string.
    """
    root = Path(__file__).resolve().parents[1]
    path = Path(env_path) if env_path else root / ".env"

    if path.exists():
        for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip().strip('"').strip("'")
            if not line or line.startswith("#"):
                continue
            if line.startswith(("postgresql://", "postgres://")):
                os.environ.setdefault("DATABASE_URL", line)
                break
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key == "DATABASE_URL" or value.startswith(("postgresql://", "postgres://")):
                    os.environ.setdefault("DATABASE_URL", value)
                    break

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured in .env or environment")
    if not database_url.startswith(("postgresql://", "postgres://")):
        raise RuntimeError("DATABASE_URL must be a PostgreSQL connection string")
    return database_url
