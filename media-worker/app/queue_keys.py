from app.config import settings

DEFAULT_QUEUE_PREFIX = "media-ai:jobs"

GPU_QUEUE_SUFFIXES = {
    "tts": "tts",
    "latentsync": "latentsync",
    "flashhead": "flashhead",
}


def normalize_queue_prefix(prefix: str) -> str:
    return prefix.rstrip(":")


def resolve_queue_key(job_type: str, prefix: str | None = None) -> str:
    normalized_prefix = normalize_queue_prefix(prefix or settings.media_ai_queue_prefix)
    suffix = GPU_QUEUE_SUFFIXES.get(job_type, "cpu")
    return f"{normalized_prefix}:{suffix}"


def list_default_worker_queue_keys(prefix: str | None = None) -> list[str]:
    normalized_prefix = normalize_queue_prefix(prefix or settings.media_ai_queue_prefix)
    return [
        f"{normalized_prefix}:cpu",
        f"{normalized_prefix}:tts",
        f"{normalized_prefix}:latentsync",
        f"{normalized_prefix}:flashhead",
    ]


def resolve_worker_queue_keys() -> list[str]:
    if settings.worker_queue_keys:
        keys = [key.strip() for key in settings.worker_queue_keys.split(",") if key.strip()]
        if keys:
            return keys
    return list_default_worker_queue_keys()
