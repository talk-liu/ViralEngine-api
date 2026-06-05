from __future__ import annotations

import logging
import subprocess
import sys
import tempfile
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    if not settings.latentsync_repo_path:
        raise RuntimeError(
            "未配置 LATENTSYNC_REPO_PATH，请在 media-worker/.env 中设置 LatentSync 项目目录"
        )
    root = Path(settings.latentsync_repo_path)
    if not root.is_dir():
        raise FileNotFoundError(f"LatentSync 目录不存在: {root}")
    return root.resolve()


def _ckpt_path() -> Path:
    if settings.latentsync_ckpt_path:
        return Path(settings.latentsync_ckpt_path).resolve()
    return _repo_root() / "checkpoints" / "latentsync_unet.pt"


def _unet_config_path() -> Path:
    if settings.latentsync_unet_config:
        return Path(settings.latentsync_unet_config).resolve()
    return _repo_root() / "configs" / "unet" / "stage2_512.yaml"


def _python_executable() -> Path:
    if settings.latentsync_python:
        return Path(settings.latentsync_python).resolve()
    repo = _repo_root()
    for candidate in (
        Path("/opt/venvs/latentsync/bin/python"),
        repo / "venv" / "bin" / "python",
        repo / "venv" / "Scripts" / "python.exe",
        repo / ".venv" / "bin" / "python",
        repo / ".venv" / "Scripts" / "python.exe",
    ):
        if candidate.is_file():
            return candidate.resolve()
    return Path(sys.executable).resolve()


def _generate_via_server(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    *,
    params: dict | None = None,
    job_id: str | None = None,
) -> None:
    base_url = (settings.latentsync_server_url or "").rstrip("/")
    if not base_url:
        raise RuntimeError("未配置 LATENTSYNC_SERVER_URL")

    payload = {
        "videoPath": str(video_path.resolve()),
        "audioPath": str(audio_path.resolve()),
        "outputPath": str(output_path.resolve()),
        "params": params or {},
        "jobId": job_id,
    }

    logger.info(
        "Calling LatentSync server video=%s audio=%s output=%s",
        video_path,
        audio_path,
        output_path,
    )
    with httpx.Client(timeout=None) as client:
        response = client.post(f"{base_url}/infer", json=payload)
        if response.status_code >= 400:
            detail = response.text.strip() or response.reason_phrase
            raise RuntimeError(f"LatentSync 服务推理失败: {detail}")
        response.raise_for_status()

    if not output_path.is_file():
        raise RuntimeError("LatentSync 未生成输出视频")

    logger.info("LatentSync output saved: %s", output_path)


def _generate_via_subprocess(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    *,
    params: dict | None = None,
) -> None:
    payload = params or {}
    seed = int(payload.get("seed", 1247))
    inference_steps = int(payload.get("inferenceSteps", 20))
    guidance_scale = float(payload.get("guidanceScale", 1.5))
    enable_deepcache = bool(payload.get("enableDeepcache", True))
    landmark_smooth_alpha = float(payload.get("landmarkSmoothAlpha", 0.7))

    repo_root = _repo_root()
    ckpt_path = _ckpt_path()
    unet_config = _unet_config_path()
    python = _python_executable()

    if not python.is_file():
        raise FileNotFoundError(f"LatentSync Python 不存在: {python}")
    if not ckpt_path.is_file():
        raise FileNotFoundError(f"LatentSync 权重不存在: {ckpt_path}")
    if not unet_config.is_file():
        raise FileNotFoundError(f"LatentSync UNet 配置不存在: {unet_config}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="latentsync-") as temp_dir:
        cmd = [
            str(python),
            "-u",
            "-m",
            "scripts.inference",
            "--unet_config_path",
            str(unet_config),
            "--inference_ckpt_path",
            str(ckpt_path),
            "--video_path",
            str(video_path.resolve()),
            "--audio_path",
            str(audio_path.resolve()),
            "--video_out_path",
            str(output_path.resolve()),
            "--inference_steps",
            str(inference_steps),
            "--guidance_scale",
            str(guidance_scale),
            "--seed",
            str(seed),
            "--temp_dir",
            temp_dir,
            "--landmark_smooth_alpha",
            str(landmark_smooth_alpha),
        ]
        if enable_deepcache:
            cmd.append("--enable_deepcache")

        logger.info(
            "Running LatentSync subprocess video=%s audio=%s output=%s",
            video_path,
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
            raise RuntimeError(f"LatentSync 推理失败: {detail}")

    if not output_path.is_file():
        raise RuntimeError("LatentSync 未生成输出视频")

    logger.info("LatentSync output saved: %s", output_path)


def generate_latentsync(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    *,
    params: dict | None = None,
    job_id: str | None = None,
) -> None:
    if not video_path.is_file():
        raise FileNotFoundError(f"源视频不存在: {video_path}")
    if not audio_path.is_file():
        raise FileNotFoundError(f"驱动音频不存在: {audio_path}")

    if settings.latentsync_server_url:
        _generate_via_server(
            video_path,
            audio_path,
            output_path,
            params=params,
            job_id=job_id,
        )
        return

    _generate_via_subprocess(
        video_path,
        audio_path,
        output_path,
        params=params,
    )
