import asyncio
import json
import logging

import redis.asyncio as redis

from app.config import settings
from app.models import MediaJobPayload
from app.services.callback import CallbackService
from app.services.storage import StorageService
from app.workers.processor import JobProcessor

logger = logging.getLogger(__name__)


class QueueConsumer:
    def __init__(self) -> None:
        self.redis = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password or None,
            db=settings.redis_db,
            decode_responses=True,
        )
        self.callback = CallbackService()
        self.processor = JobProcessor(StorageService())
        self._running = False

    async def start(self) -> None:
        self._running = True
        logger.info("Queue consumer started, waiting for jobs on %s", settings.queue_key)
        while self._running:
            try:
                item = await self.redis.brpop(
                    settings.queue_key,
                    timeout=settings.worker_poll_timeout,
                )
                if not item:
                    continue
                _, raw_payload = item
                payload = MediaJobPayload.model_validate_json(raw_payload)
                await self._handle_job(payload)
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Queue consumer loop error")
                await asyncio.sleep(1)

    async def stop(self) -> None:
        self._running = False
        await self.callback.aclose()
        await self.redis.aclose()

    async def _handle_job(self, payload: MediaJobPayload) -> None:
        logger.info("Processing job %s (%s)", payload.jobId, payload.type)
        try:
            await self.callback.mark_processing(payload.jobId)
            await self.processor.process(payload)
            await self.callback.complete(
                payload.jobId,
                status="completed",
                output_key=payload.outputKey,
                progress=100,
            )
            logger.info("Job %s completed", payload.jobId)
        except Exception as exc:
            logger.exception("Job %s failed", payload.jobId)
            try:
                await self.callback.complete(
                    payload.jobId,
                    status="failed",
                    error_message=str(exc),
                )
            except Exception:
                logger.exception("Failed to report job failure for %s", payload.jobId)
