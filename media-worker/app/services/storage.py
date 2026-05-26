import os
from pathlib import Path

from app.config import settings


class StorageService:
    def __init__(self) -> None:
        self.root = Path(settings.storage_local_path).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def resolve(self, storage_key: str) -> Path:
        normalized = os.path.normpath(storage_key).replace("\\", "/")
        if normalized.startswith("..") or "/../" in f"/{normalized}/":
            raise ValueError("非法存储路径")
        return self.root / normalized

    def ensure_parent(self, storage_key: str) -> Path:
        path = self.resolve(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path
