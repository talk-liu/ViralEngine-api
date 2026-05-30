from __future__ import annotations

import logging

from app.config import settings
from app.workers.asr import TranscriptSegment

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    global _model
    if _model is None:
        from funasr import AutoModel

        logger.info(
            "Loading FunASR model=%s device=%s",
            settings.funasr_model,
            settings.funasr_device,
        )
        _model = AutoModel(
            model=settings.funasr_model,
            vad_model=settings.funasr_vad_model,
            punc_model=settings.funasr_punc_model,
            device=settings.funasr_device,
            disable_update=True,
        )
    return _model


def transcribe_funasr(
    audio_path,
    *,
    hotwords: list[str] | None = None,
) -> list[TranscriptSegment]:
    model = _get_model()
    hotword = " ".join(hotwords) if hotwords else None
    kwargs: dict = {
        "input": str(audio_path),
        "batch_size_s": settings.funasr_batch_size_s,
    }
    if hotword:
        kwargs["hotword"] = hotword

    result = model.generate(**kwargs)
    if not result:
        return []

    item = result[0]
    segments: list[TranscriptSegment] = []

    sentence_info = item.get("sentence_info")
    if isinstance(sentence_info, list) and sentence_info:
        for entry in sentence_info:
            text = str(entry.get("text", "")).strip()
            if not text:
                continue
            start_ms = float(entry.get("start", 0))
            end_ms = float(entry.get("end", start_ms))
            segments.append(
                TranscriptSegment(
                    start=max(start_ms / 1000.0, 0),
                    end=max(end_ms / 1000.0, 0),
                    text=text,
                )
            )
        return segments

    text = str(item.get("text", "")).strip()
    timestamp = item.get("timestamp")
    if text and isinstance(timestamp, list) and timestamp:
        cursor = 0
        for pair in timestamp:
            if not isinstance(pair, (list, tuple)) or len(pair) < 2:
                continue
            start_ms = float(pair[0])
            end_ms = float(pair[1])
            chunk = text[cursor : cursor + 1].strip()
            cursor += 1
            if chunk:
                segments.append(
                    TranscriptSegment(
                        start=max(start_ms / 1000.0, 0),
                        end=max(end_ms / 1000.0, 0),
                        text=chunk,
                    )
                )
        if segments:
            return segments

    if text:
        segments.append(TranscriptSegment(start=0, end=0, text=text))

    return segments
