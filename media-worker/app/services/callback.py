import httpx

from app.config import settings


class CallbackService:
    def __init__(self) -> None:
        self.base_url = settings.api_base_url.rstrip("/")
        self.headers = {"X-Worker-Secret": settings.worker_secret}
        self._client = httpx.AsyncClient(timeout=30.0)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def mark_processing(self, job_id: str) -> None:
        response = await self._client.patch(
            f"{self.base_url}/media-ai/internal/jobs/{job_id}/processing",
            headers=self.headers,
        )
        response.raise_for_status()

    async def complete(
        self,
        job_id: str,
        *,
        status: str,
        output_key: str | None = None,
        error_message: str | None = None,
        progress: int | None = None,
    ) -> None:
        payload: dict[str, object] = {"status": status}
        if output_key:
            payload["outputKey"] = output_key
        if error_message:
            payload["errorMessage"] = error_message
        if progress is not None:
            payload["progress"] = progress

        response = await self._client.post(
            f"{self.base_url}/media-ai/internal/jobs/{job_id}/complete",
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()

    def report_progress_sync(self, job_id: str, progress: int) -> None:
        with httpx.Client(timeout=30.0) as client:
            response = client.patch(
                f"{self.base_url}/media-ai/internal/jobs/{job_id}/progress",
                headers=self.headers,
                json={"progress": progress},
            )
            response.raise_for_status()

    async def recover_stale_jobs(self) -> int:
        response = await self._client.post(
            f"{self.base_url}/media-ai/internal/jobs/recover-stale",
            headers=self.headers,
        )
        response.raise_for_status()
        return int(response.json().get("recovered", 0))
