from __future__ import annotations

import json
import subprocess
from pathlib import Path


def probe_duration(video_path: Path) -> float:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(video_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffprobe 执行失败")
    payload = json.loads(result.stdout)
    return float(payload["format"]["duration"])


def probe_video_size(video_path: Path) -> tuple[int, int]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        str(video_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffprobe 执行失败")
    payload = json.loads(result.stdout)
    stream = payload["streams"][0]
    return int(stream["width"]), int(stream["height"])


def build_vertical_crop_filter(width: int, height: int) -> str:
    target_ratio = 9 / 16
    current_ratio = width / height
    if abs(current_ratio - target_ratio) < 0.01:
        return "scale=1080:1920"
    if current_ratio > target_ratio:
        crop_width = int(height * target_ratio)
        crop_width -= crop_width % 2
        x_offset = max((width - crop_width) // 2, 0)
        return f"crop={crop_width}:{height}:{x_offset}:0,scale=1080:1920"
    crop_height = int(width / target_ratio)
    crop_height -= crop_height % 2
    y_offset = max((height - crop_height) // 2, 0)
    return f"crop={width}:{crop_height}:0:{y_offset},scale=1080:1920"


def cut_clip(
    input_path: Path,
    output_path: Path,
    *,
    start_sec: float,
    end_sec: float,
    aspect_ratio: str = "9:16",
) -> None:
    duration = max(end_sec - start_sec, 0.5)
    vf_parts: list[str] = []
    if aspect_ratio == "9:16":
        width, height = probe_video_size(input_path)
        vf_parts.append(build_vertical_crop_filter(width, height))

    command = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{start_sec:.3f}",
        "-i",
        str(input_path),
        "-t",
        f"{duration:.3f}",
    ]
    if vf_parts:
        command.extend(
            [
                "-vf",
                ",".join(vf_parts),
                "-c:a",
                "aac",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
            ]
        )
    else:
        command.extend(["-c", "copy"])
    command.append(str(output_path))

    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffmpeg 切片失败")


def extract_cover(input_path: Path, output_path: Path, *, at_sec: float) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{at_sec:.3f}",
        "-i",
        str(input_path),
        "-frames:v",
        "1",
        "-q:v",
        "2",
        str(output_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffmpeg 抽帧失败")


def snap_to_scene(value: float, boundaries: list[float], tolerance: float = 2.0) -> float:
    if not boundaries:
        return value
    candidates = [point for point in boundaries if abs(point - value) <= tolerance]
    if not candidates:
        return value
    return min(candidates, key=lambda point: abs(point - value))
