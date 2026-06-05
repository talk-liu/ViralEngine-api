import asyncio

from app.models import MediaJobPayload
from app.services.storage import StorageService


class JobProcessor:
    def __init__(self, storage: StorageService, callback=None) -> None:
        self.storage = storage
        self.callback = callback

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
        if payload.type == "live_slice":
            await self._process_live_slice(payload)
            return
        if payload.type == "tts":
            await self._process_tts(payload)
            return
        if payload.type == "flashhead":
            await self._process_flashhead(payload)
            return
        raise ValueError(f"不支持的任务类型: {payload.type}")

    async def _process_watermark(self, payload: MediaJobPayload) -> None:
        from app.workers.watermark import apply_watermark

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
        from app.workers.subtitle import extract_subtitles

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
        from app.workers.text2image import generate_image

        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params

        generate_image(
            output_path,
            prompt=str(params.get("prompt", "")),
            width=int(params.get("width", 1024)),
            height=int(params.get("height", 1024)),
        )

    async def _process_tts(self, payload: MediaJobPayload) -> None:
        from app.workers.indextts2 import synthesize_indextts2

        input_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params
        emo_key = params.get("emoInputKey")
        emo_path = self.storage.resolve(emo_key) if isinstance(emo_key, str) and emo_key else None

        await asyncio.to_thread(
            synthesize_indextts2,
            input_path,
            output_path,
            emo_audio_path=emo_path,
            params=params,
        )

    async def _process_flashhead(self, payload: MediaJobPayload) -> None:
        from app.workers.flashhead import generate_flashhead

        portrait_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params
        audio_key = params.get("audioInputKey")
        if not isinstance(audio_key, str) or not audio_key:
            raise ValueError("flashhead 任务缺少 audioInputKey")
        audio_path = self.storage.resolve(audio_key)

        await asyncio.to_thread(
            generate_flashhead,
            portrait_path,
            audio_path,
            output_path,
            params=params,
        )

    async def _process_live_slice(self, payload: MediaJobPayload) -> None:
        from app.workers.live_slice import process_live_slice

        input_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        callback = self.callback

        def progress_callback(progress: int) -> None:
            if callback is None:
                return
            try:
                callback.report_progress_sync(payload.jobId, progress)
            except Exception:
                pass

        await asyncio.to_thread(
            process_live_slice,
            input_path,
            output_path,
            storage=self.storage,
            user_id=payload.userId,
            job_id=payload.jobId,
            params=payload.params,
            progress_callback=progress_callback,
        )
