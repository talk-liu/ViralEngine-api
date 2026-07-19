import asyncio
from pathlib import Path

from app.models import MediaJobPayload
from app.services.gpu_coordinator import gpu_slot, job_gpu_requirement
from app.services.job_progress import JobProgressReporter
from app.services.storage import StorageService


class JobProcessor:
    def __init__(self, storage: StorageService, callback=None) -> None:
        self.storage = storage
        self.callback = callback

    async def _run_with_gpu_slot(self, payload: MediaJobPayload, runner) -> None:
        required_mb = job_gpu_requirement(payload.type)
        if required_mb is None:
            await runner()
            return
        async with gpu_slot(payload.jobId, payload.type, required_mb):
            await runner()

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
        if payload.type == "latentsync":
            await self._process_latentsync(payload)
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

    def _progress(self, job_id: str) -> JobProgressReporter | None:
        if self.callback is None:
            return None

        def report(progress: int) -> None:
            try:
                self.callback.report_progress_sync(job_id, progress)
            except Exception:
                pass

        return JobProgressReporter(report)

    async def _process_subtitle(self, payload: MediaJobPayload) -> None:
        from app.workers.subtitle import extract_subtitles

        params = payload.params or {}
        progress = self._progress(payload.jobId)
        on_progress = progress.update if progress else None

        input_path = await self._resolve_subtitle_input(payload, params, progress)
        output_path = self.storage.ensure_parent(payload.outputKey)
        language = params.get("language")
        if isinstance(language, str) and not language.strip():
            language = None

        try:
            await asyncio.to_thread(
                extract_subtitles,
                input_path,
                output_path,
                language=language,
                output_format=str(params.get("format", "srt")),
                on_progress=on_progress,
            )
        finally:
            await asyncio.to_thread(self._cleanup_subtitle_input, input_path)

    async def _resolve_subtitle_input(
        self,
        payload: MediaJobPayload,
        params: dict,
        progress: JobProgressReporter | None,
    ) -> Path:
        input_path = self.storage.ensure_parent(payload.inputKey)
        if input_path.exists() and input_path.stat().st_size > 0:
            if progress:
                progress.update(35)
            return input_path

        download_url = params.get("downloadUrl") or params.get("sourceUrl")
        if isinstance(download_url, str) and download_url.strip():
            from app.workers.platform_video_downloader import download_platform_video

            platform_id = params.get("platformId")
            on_ratio = progress.ratio(12, 35) if progress else None
            await asyncio.to_thread(
                download_platform_video,
                download_url.strip(),
                input_path,
                platform_id=platform_id if isinstance(platform_id, str) else None,
                on_ratio=on_ratio,
            )
            if progress:
                progress.update(35)
            return input_path

        if not input_path.exists():
            raise FileNotFoundError(f"输入视频不存在: {input_path}")
        return input_path

    def _cleanup_subtitle_input(self, input_path: Path) -> None:
        try:
            if input_path.is_file():
                input_path.unlink()
            input_dir = input_path.parent
            if input_dir.name == "input" and input_dir.is_dir() and not any(
                input_dir.iterdir()
            ):
                input_dir.rmdir()
        except OSError:
            pass

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

        async def _run() -> None:
            await asyncio.to_thread(
                synthesize_indextts2,
                input_path,
                output_path,
                emo_audio_path=emo_path,
                params=params,
            )

        await self._run_with_gpu_slot(payload, _run)

    async def _process_flashhead(self, payload: MediaJobPayload) -> None:
        from app.workers.flashhead import generate_flashhead

        portrait_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params
        audio_key = params.get("audioInputKey")
        if not isinstance(audio_key, str) or not audio_key:
            raise ValueError("flashhead 任务缺少 audioInputKey")
        audio_path = self.storage.resolve(audio_key)

        async def _run() -> None:
            await asyncio.to_thread(
                generate_flashhead,
                portrait_path,
                audio_path,
                output_path,
                params=params,
            )

        await self._run_with_gpu_slot(payload, _run)

    async def _process_latentsync(self, payload: MediaJobPayload) -> None:
        from app.workers.latentsync import generate_latentsync

        video_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        params = payload.params
        audio_key = params.get("audioInputKey")
        if not isinstance(audio_key, str) or not audio_key:
            raise ValueError("latentsync 任务缺少 audioInputKey")
        audio_path = self.storage.resolve(audio_key)

        async def _run() -> None:
            await asyncio.to_thread(
                generate_latentsync,
                video_path,
                audio_path,
                output_path,
                params=params,
                job_id=payload.jobId,
            )

        await self._run_with_gpu_slot(payload, _run)

    async def _process_live_slice(self, payload: MediaJobPayload) -> None:
        from app.workers.live_slice import process_live_slice

        input_path = self.storage.resolve(payload.inputKey)
        output_path = self.storage.ensure_parent(payload.outputKey)
        progress = self._progress(payload.jobId)

        await asyncio.to_thread(
            process_live_slice,
            input_path,
            output_path,
            storage=self.storage,
            user_id=payload.userId,
            job_id=payload.jobId,
            params=payload.params,
            progress_callback=progress.update if progress else None,
        )
