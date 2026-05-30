from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.workers.asr import TranscriptSegment
from app.workers.subtitle import _get_model


def transcribe_whisper(
    audio_path: Path,
    *,
    language: str | None = None,
) -> list[TranscriptSegment]:
    model = _get_model()
    segments_iter, _info = model.transcribe(
        str(audio_path),
        language=language or None,
        vad_filter=True,
        beam_size=5,
    )
    return [
        TranscriptSegment(
            start=float(segment.start),
            end=float(segment.end),
            text=segment.text.strip(),
        )
        for segment in segments_iter
        if segment.text.strip()
    ]
