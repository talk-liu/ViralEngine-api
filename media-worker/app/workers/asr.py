from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable

from app.config import settings

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int], None] | None


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


def transcribe(
    audio_path,
    *,
    language: str | None = None,
    hotwords: list[str] | None = None,
) -> tuple[list[TranscriptSegment], str]:
    engine = settings.asr_engine.lower()
    if engine in {"auto", "funasr"}:
        try:
            from app.workers.asr_funasr import transcribe_funasr

            segments = transcribe_funasr(audio_path, hotwords=hotwords)
            if segments:
                return segments, "funasr"
        except Exception:
            logger.exception("FunASR 转写失败，回退 Whisper")

    from app.workers.asr_whisper import transcribe_whisper

    segments = transcribe_whisper(audio_path, language=language)
    return segments, "whisper"
