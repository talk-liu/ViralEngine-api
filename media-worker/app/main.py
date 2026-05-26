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


@asynccontextmanager
async def lifespan(_: FastAPI):
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
