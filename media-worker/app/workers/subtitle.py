import logging
import subprocess
import tempfile
from pathlib import Path

from faster_whisper import WhisperModel, download_model

from app.config import settings

logger = logging.getLogger(__name__)

_model: WhisperModel | None = None


def _resolve_model_source() -> str:
    if settings.whisper_model_path:
        path = Path(settings.whisper_model_path)
        if not path.is_dir():
            raise FileNotFoundError(f"本地模型目录不存在: {path}")
        return str(path)

    if settings.whisper_local_only:
        return download_model(
            settings.whisper_model,
            local_files_only=True,
        )

    return settings.whisper_model


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        model_source = _resolve_model_source()
        logger.info(
            "Loading Whisper model=%s device=%s compute_type=%s local_only=%s hf_endpoint=%s",
            model_source,
            settings.whisper_device,
            settings.whisper_compute_type,
            settings.whisper_local_only,
            settings.hf_endpoint or "(default)",
        )
        try:
            _model = WhisperModel(
                model_source,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
            )
        except Exception as exc:
            raise RuntimeError(
                "Whisper 模型加载失败。国内网络请在 .env 设置 HF_ENDPOINT=https://hf-mirror.com "
                "并运行: python scripts/download_whisper_model.py；"
                "或设置 WHISPER_MODEL_PATH 指向已下载的模型目录。"
            ) from exc
    return _model


def _extract_audio(video_path: Path, audio_path: Path) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(audio_path),
    ]
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() or "ffmpeg 音频提取失败"
        raise RuntimeError(stderr)


def _format_srt_timestamp(seconds: float) -> str:
    total_ms = int(round(max(seconds, 0) * 1000))
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _format_vtt_timestamp(seconds: float) -> str:
    total_ms = int(round(max(seconds, 0) * 1000))
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, millis = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def _write_srt(segments: list, output_path: Path) -> None:
    lines: list[str] = []
    index = 0
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        index += 1
        start = _format_srt_timestamp(segment.start)
        end = _format_srt_timestamp(segment.end)
        lines.append(f"{index}\n{start} --> {end}\n{text}")

    output_path.write_text(
        "\n\n".join(lines) + ("\n" if lines else ""),
        encoding="utf-8",
    )


def _write_vtt(segments: list, output_path: Path) -> None:
    lines: list[str] = ["WEBVTT", ""]
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        start = _format_vtt_timestamp(segment.start)
        end = _format_vtt_timestamp(segment.end)
        lines.extend([f"{start} --> {end}", text, ""])

    output_path.write_text("\n".join(lines), encoding="utf-8")


def extract_subtitles(
    input_path: Path,
    output_path: Path,
    *,
    language: str | None = None,
    output_format: str = "srt",
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"输入视频不存在: {input_path}")

    with tempfile.TemporaryDirectory(prefix="subtitle-") as tmp_dir:
        audio_path = Path(tmp_dir) / "audio.wav"
        _extract_audio(input_path, audio_path)

        model = _get_model()
        segments_iter, info = model.transcribe(
            str(audio_path),
            language=language or None,
            vad_filter=True,
            beam_size=5,
        )
        segments = list(segments_iter)

        detected = info.language if info else "unknown"
        logger.info(
            "Subtitle transcription finished: language=%s segments=%d",
            detected,
            len(segments),
        )

        if output_format == "vtt":
            _write_vtt(segments, output_path)
        else:
            _write_srt(segments, output_path)
