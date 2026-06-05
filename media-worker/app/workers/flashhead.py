from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    if not settings.flashhead_repo_path:
        raise RuntimeError(
            "未配置 FLASHHEAD_REPO_PATH，请在 media-worker/.env 中设置 FlashHead 项目目录"
        )
    root = Path(settings.flashhead_repo_path)
    if not root.is_dir():
        raise FileNotFoundError(f"FlashHead 目录不存在: {root}")
    return root.resolve()


def _ckpt_dir() -> Path:
    if settings.flashhead_ckpt_dir:
        return Path(settings.flashhead_ckpt_dir).resolve()
    return _repo_root() / "models" / "SoulX-FlashHead-1_3B"


def _wav2vec_dir() -> Path:
    if settings.flashhead_wav2vec_dir:
        return Path(settings.flashhead_wav2vec_dir).resolve()
    return _repo_root() / "models" / "wav2vec2-base-960h"


def _python_executable() -> Path:
    if settings.flashhead_python:
        return Path(settings.flashhead_python).resolve()
    repo = _repo_root()
    for candidate in (
        Path("/opt/venvs/flashhead/bin/python"),
        repo / ".venv" / "bin" / "python",
        repo / ".venv" / "Scripts" / "python.exe",
    ):
        if candidate.is_file():
            return candidate.resolve()
    return Path(sys.executable).resolve()


def generate_flashhead(
    portrait_path: Path,
    audio_path: Path,
    output_path: Path,
    *,
    params: dict | None = None,
) -> None:
    if not portrait_path.is_file():
        raise FileNotFoundError(f"人像参考图不存在: {portrait_path}")
    if not audio_path.is_file():
        raise FileNotFoundError(f"驱动音频不存在: {audio_path}")

    payload = params or {}
    seed = int(payload.get("seed", 42))
    use_face_crop = bool(payload.get("useFaceCrop", True))
    audio_encode_mode = str(payload.get("audioEncodeMode", "once"))

    if audio_encode_mode not in {"once", "stream"}:
        raise ValueError(f"不支持的 audioEncodeMode: {audio_encode_mode}")

    repo_root = _repo_root()
    ckpt_dir = _ckpt_dir()
    wav2vec_dir = _wav2vec_dir()
    python = _python_executable()
    generate_script = repo_root / "generate_video.py"

    if not generate_script.is_file():
        raise FileNotFoundError(f"缺少推理脚本: {generate_script}")
    if not python.is_file():
        raise FileNotFoundError(f"FlashHead Python 不存在: {python}")
    if not ckpt_dir.is_dir():
        raise FileNotFoundError(f"FlashHead 模型目录不存在: {ckpt_dir}")
    if not wav2vec_dir.is_dir():
        raise FileNotFoundError(f"wav2vec 模型目录不存在: {wav2vec_dir}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        str(python),
        "-u",
        str(generate_script),
        "--ckpt_dir",
        str(ckpt_dir),
        "--wav2vec_dir",
        str(wav2vec_dir),
        "--model_type",
        "pro",
        "--cond_image",
        str(portrait_path.resolve()),
        "--audio_path",
        str(audio_path.resolve()),
        "--audio_encode_mode",
        audio_encode_mode,
        "--base_seed",
        str(seed),
        "--save_file",
        str(output_path.resolve()),
    ]
    if use_face_crop:
        cmd.append("--use_face_crop")

    logger.info(
        "Running FlashHead Pro portrait=%s audio=%s output=%s",
        portrait_path,
        audio_path,
        output_path,
    )
    result = subprocess.run(
        cmd,
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        detail = stderr or stdout or f"exit code {result.returncode}"
        raise RuntimeError(f"FlashHead 推理失败: {detail}")

    if not output_path.is_file():
        raise RuntimeError("FlashHead 未生成输出视频")

    logger.info("FlashHead output saved: %s", output_path)
