from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path
from typing import Callable

from app.services.storage import StorageService
from app.workers.asr import transcribe
from app.workers.highlight_analyzer import analyze_highlights
from app.workers.scene_detect import detect_scene_boundaries
from app.workers.subtitle import _extract_audio, _format_srt_timestamp
from app.workers.video_utils import cut_clip, extract_cover, probe_duration, snap_to_scene

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int], None] | None


def _build_clip_storage_key(
    user_id: str,
    job_id: str,
    clip_id: str,
    file_name: str,
) -> str:
    return f"{user_id}/media-jobs/{job_id}/output/clips/{clip_id}/{file_name}"


def _write_clip_subtitle(
    segments,
    *,
    start_sec: float,
    end_sec: float,
    output_path: Path,
) -> None:
    filtered = [
        segment
        for segment in segments
        if segment.end > start_sec and segment.start < end_sec
    ]
    if not filtered:
        output_path.write_text("", encoding="utf-8")
        return

    lines: list[str] = []
    index = 0
    for segment in filtered:
        text = segment.text.strip()
        if not text:
            continue
        index += 1
        rel_start = max(segment.start - start_sec, 0)
        rel_end = min(segment.end - start_sec, end_sec - start_sec)
        lines.append(
            f"{index}\n"
            f"{_format_srt_timestamp(rel_start)} --> {_format_srt_timestamp(rel_end)}\n"
            f"{text}"
        )
    output_path.write_text("\n\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


def process_live_slice(
    input_path: Path,
    manifest_path: Path,
    *,
    storage: StorageService,
    user_id: str,
    job_id: str,
    params: dict,
    progress_callback: ProgressCallback = None,
) -> None:
    def report(progress: int) -> None:
        if progress_callback:
            progress_callback(progress)

    min_duration = float(params.get("minDuration", 15))
    max_duration = float(params.get("maxDuration", 60))
    max_clips = int(params.get("maxClips", 20))
    aspect_ratio = str(params.get("aspectRatio", "9:16"))
    language = params.get("language")
    if isinstance(language, str) and not language.strip():
        language = None
    cart_items = params.get("cartItems") or []
    if not isinstance(cart_items, list):
        cart_items = []
    highlight_prompt = params.get("highlightPrompt")
    if isinstance(highlight_prompt, str) and not highlight_prompt.strip():
        highlight_prompt = None

    if not input_path.exists():
        raise FileNotFoundError(f"输入视频不存在: {input_path}")

    source_duration = probe_duration(input_path)
    report(5)

    hotwords = [
        str(item.get("title", "")).strip()
        for item in cart_items
        if isinstance(item, dict) and item.get("title")
    ]

    with tempfile.TemporaryDirectory(prefix="live-slice-") as tmp_dir:
        audio_path = Path(tmp_dir) / "audio.wav"
        _extract_audio(input_path, audio_path)
        report(10)

        segments, asr_engine = transcribe(
            audio_path,
            language=language if isinstance(language, str) else None,
            hotwords=hotwords,
        )
        if not segments:
            raise RuntimeError("未识别到有效口播内容，无法生成切片")
        report(30)

        scene_boundaries = detect_scene_boundaries(input_path)
        report(40)

        highlights = analyze_highlights(
            segments,
            cart_items=cart_items,
            min_duration=min_duration,
            max_duration=max_duration,
            max_clips=max_clips,
            highlight_prompt=highlight_prompt,
        )
        if not highlights:
            raise RuntimeError("未找到合适的高光片段")
        report(55)

        manifest_clips: list[dict] = []
        for index, highlight in enumerate(highlights, start=1):
            clip_id = f"clip-{index:03d}"
            start_sec = snap_to_scene(highlight.start, scene_boundaries)
            end_sec = snap_to_scene(highlight.end, scene_boundaries)
            if end_sec <= start_sec:
                end_sec = highlight.end
            duration = end_sec - start_sec
            if duration < min_duration:
                end_sec = min(start_sec + min_duration, source_duration)
            if end_sec - start_sec > max_duration:
                end_sec = start_sec + max_duration

            clip_dir = manifest_path.parent / "clips" / clip_id
            clip_dir.mkdir(parents=True, exist_ok=True)

            video_file = "video.mp4"
            cover_file = "cover.jpg"
            subtitle_file = "subtitle.srt"
            video_path = clip_dir / video_file
            cover_path = clip_dir / cover_file
            subtitle_path = clip_dir / subtitle_file

            cut_clip(
                input_path,
                video_path,
                start_sec=start_sec,
                end_sec=end_sec,
                aspect_ratio=aspect_ratio,
            )
            extract_cover(input_path, cover_path, at_sec=(start_sec + end_sec) / 2)
            _write_clip_subtitle(
                segments,
                start_sec=start_sec,
                end_sec=end_sec,
                output_path=subtitle_path,
            )

            video_key = _build_clip_storage_key(user_id, job_id, clip_id, video_file)
            cover_key = _build_clip_storage_key(user_id, job_id, clip_id, cover_file)
            subtitle_key = _build_clip_storage_key(user_id, job_id, clip_id, subtitle_file)

            manifest_clips.append(
                {
                    "id": clip_id,
                    "startSec": round(start_sec, 3),
                    "endSec": round(end_sec, 3),
                    "durationSec": round(end_sec - start_sec, 3),
                    "score": round(highlight.score, 3),
                    "reason": highlight.reason,
                    "productName": highlight.product_name,
                    "productId": highlight.product_id,
                    "title": highlight.title,
                    "description": highlight.description,
                    "topics": highlight.topics,
                    "tags": highlight.tags,
                    "videoKey": video_key,
                    "coverKey": cover_key,
                    "subtitleKey": subtitle_key,
                }
            )

            clip_progress = 55 + int((index / len(highlights)) * 35)
            report(min(clip_progress, 90))

    manifest = {
        "version": 1,
        "sourceDurationSec": round(source_duration, 3),
        "asrEngine": asr_engine,
        "clips": manifest_clips,
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    report(100)
    logger.info(
        "Live slice finished: job=%s clips=%d asr=%s",
        job_id,
        len(manifest_clips),
        asr_engine,
    )
