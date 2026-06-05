import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.queue_consumer import QueueConsumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

consumer = QueueConsumer()


def _preload_indextts2() -> None:
    if not settings.indextts2_repo_path:
        return
    if settings.indextts2_python:
        import sys
        from pathlib import Path

        if Path(settings.indextts2_python).resolve() != Path(sys.executable).resolve():
            logging.getLogger(__name__).info(
                "IndexTTS2 subprocess mode (INDEXTTS2_PYTHON), skip preload"
            )
            return
    from app.workers.indextts2 import _get_tts

    _get_tts()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.indextts2_preload and settings.indextts2_repo_path:
        logging.getLogger(__name__).info(
            "Preloading IndexTTS2 (INDEXTTS2_PRELOAD=true)…"
        )
        await asyncio.to_thread(_preload_indextts2)
    task = asyncio.create_task(consumer.start())
    yield
    await consumer.stop()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="ViralEngine Media Worker",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "queueKey": settings.queue_key,
        "storagePath": settings.storage_local_path,
        "whisperModel": settings.whisper_model,
        "whisperDevice": settings.whisper_device,
    }
