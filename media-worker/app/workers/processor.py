import asyncio
from app.models import MediaJobPayload
from app.services.storage import StorageService
from app.workers.subtitle import extract_subtitles
from app.workers.text2image import generate_image
from app.workers.watermark import apply_watermark


class JobProcessor:
    def __init__(self, storage: StorageService) -> None:
        self.storage = storage

    async def process(self, payload: MediaJobPayload) -> None:
        if payload.type == "watermark":
            await self._process_watermark(payload)
            return
        if payload.type == "subtitle":
            await self._process_subtitle(payload)
            return
        if payload.type == "text2image":
            await self._process_text2image(payload)
            return
        raise ValueError(f"不支持的任务类型: {payload.type}")

    async def _process_watermark(self, payload: MediaJobPayload) -> None:
        input_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params

        await asyncio.to_thread(
            apply_watermark,
            input_path,
            output_path,
            text=str(params.get("text", "ViralEngine")),
            position=str(params.get("position", "bottom-right")),
            font_size=int(params.get("fontSize", 24)),
        )

    async def _process_subtitle(self, payload: MediaJobPayload) -> None:
        input_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params
        language = params.get("language")
        if isinstance(language, str) and not language.strip():
            language = None

        await asyncio.to_thread(
            extract_subtitles,
            input_path,
            output_path,
            language=language,
            output_format=str(params.get("format", "srt")),
        )

    async def _process_text2image(self, payload: MediaJobPayload) -> None:
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params

        generate_image(
            output_path,
            prompt=str(params.get("prompt", "")),
            width=int(params.get("width", 1024)),
            height=int(params.get("height", 1024)),
        )
