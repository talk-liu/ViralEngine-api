from __future__ import annotations

import asyncio
import logging
import re
import subprocess
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
import redis

from app.config import settings

logger = logging.getLogger(__name__)

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


@dataclass(frozen=True)
class GpuLease:
    token: str


def strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


def format_subprocess_error(
    *,
    stdout: str | None,
    stderr: str | None,
    returncode: int,
) -> str:
    parts: list[str] = []
    for chunk in (stderr, stdout):
        if not chunk:
            continue
        cleaned = strip_ansi(chunk).strip()
        if cleaned and cleaned not in parts:
            parts.append(cleaned)
    if parts:
        return "\n".join(parts)
    if returncode == -1073741819:
        return (
            "进程异常退出 (CUDA 访问冲突)，通常是 GPU 显存不足。"
            "请等待其他 GPU 任务完成后再试。"
        )
    return f"exit code {returncode}"


def _redis_client() -> redis.Redis:
    return redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password or None,
        db=settings.redis_db,
        decode_responses=True,
        socket_connect_timeout=5,
    )


def query_gpu_free_mb() -> int | None:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.free",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        if result.returncode != 0:
            return None
        line = result.stdout.strip().splitlines()[0].strip()
        return int(line)
    except Exception as exc:
        logger.warning("Failed to query GPU memory: %s", exc)
        return None


def release_latentsync_gpu(*, timeout: float = 120) -> bool:
    """Unload idle LatentSync resident model to free VRAM for the next job."""
    base_url = (settings.latentsync_server_url or "").rstrip("/")
    if not base_url:
        return False

    try:
        with httpx.Client(timeout=timeout) as client:
            health = client.get(f"{base_url}/health")
            if health.status_code >= 400:
                logger.warning("LatentSync health check failed: %s", health.text)
                return False

            loaded = health.json().get("loaded", False)
            if not loaded:
                return True

            response = client.post(f"{base_url}/unload")
            if response.status_code >= 400:
                detail = response.text.strip() or response.reason_phrase
                logger.warning("LatentSync unload failed: %s", detail)
                return False

            logger.info("LatentSync resident model unloaded")
            return True
    except Exception as exc:
        logger.warning("Failed to release LatentSync GPU: %s", exc)
        return False


def _prepare_memory(required_mb: int) -> bool:
    free = query_gpu_free_mb()
    if free is None:
        logger.warning("Cannot query GPU memory, proceeding without memory check")
        return True
    if free >= required_mb:
        logger.info("GPU memory ready: %s MiB free (need %s MiB)", free, required_mb)
        return True

    logger.info(
        "GPU free %s MiB < required %s MiB, releasing idle resident models",
        free,
        required_mb,
    )
    release_latentsync_gpu()
    time.sleep(2)
    free = query_gpu_free_mb()
    if free is None:
        return True
    if free >= required_mb:
        logger.info("GPU memory ready after release: %s MiB free", free)
        return True

    logger.warning("GPU still insufficient: %s MiB free, need %s MiB", free, required_mb)
    return False


def job_gpu_requirement(job_type: str) -> int | None:
    requirements = {
        "flashhead": settings.gpu_flashhead_required_mb,
        "latentsync": settings.gpu_latentsync_required_mb,
        "tts": settings.gpu_indextts2_required_mb,
    }
    if job_type not in requirements:
        return None
    if job_type == "tts" and not tts_requires_gpu():
        return None
    return requirements[job_type]


def tts_requires_gpu() -> bool:
    device = (settings.indextts2_device or "").strip().lower()
    return "cuda" in device


def acquire_gpu_slot_sync(job_id: str, model: str, required_mb: int) -> GpuLease:
    client = _redis_client()
    token = f"{job_id}:{model}"
    poll_timeout = max(int(settings.gpu_wait_poll_seconds), 1)

    while True:
        acquired = client.set(
            settings.gpu_lock_key,
            token,
            nx=True,
            ex=settings.gpu_lock_ttl_seconds,
        )
        if acquired:
            if _prepare_memory(required_mb):
                logger.info("GPU slot acquired job=%s model=%s", job_id, model)
                return GpuLease(token=token)

            client.delete(settings.gpu_lock_key)
            client.lpush(settings.gpu_signal_key, "1")
            logger.info(
                "GPU memory not ready, retry queue job=%s model=%s",
                job_id,
                model,
            )

        holder = client.get(settings.gpu_lock_key)
        logger.info(
            "GPU busy (holder=%s), waiting job=%s model=%s",
            holder or "unknown",
            job_id,
            model,
        )
        client.brpop(settings.gpu_signal_key, timeout=poll_timeout)


def release_gpu_slot_sync(lease: GpuLease) -> None:
    client = _redis_client()
    current = client.get(settings.gpu_lock_key)
    if current == lease.token:
        client.delete(settings.gpu_lock_key)
    client.lpush(settings.gpu_signal_key, "1")
    logger.info("GPU slot released token=%s", lease.token)


@asynccontextmanager
async def gpu_slot(job_id: str, model: str, required_mb: int):
    lease = await asyncio.to_thread(
        acquire_gpu_slot_sync,
        job_id,
        model,
        required_mb,
    )
    try:
        yield
    finally:
        await asyncio.to_thread(release_gpu_slot_sync, lease)
