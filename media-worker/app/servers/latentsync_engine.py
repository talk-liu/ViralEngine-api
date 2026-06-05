from __future__ import annotations

import logging
import os
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from omegaconf import OmegaConf
from torch import cuda, float16, float32

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LatentSyncPaths:
    repo_root: Path
    ckpt_path: Path
    unet_config: Path


def _ensure_repo_on_path(repo_root: Path) -> None:
    repo = str(repo_root.resolve())
    if repo not in sys.path:
        sys.path.insert(0, repo)


def resolve_latentsync_paths(
    *,
    repo_path: str | None,
    ckpt_path: str | None,
    unet_config: str | None,
) -> LatentSyncPaths:
    if not repo_path:
        raise RuntimeError("未配置 LATENTSYNC_REPO_PATH")

    repo_root = Path(repo_path).resolve()
    if not repo_root.is_dir():
        raise FileNotFoundError(f"LatentSync 目录不存在: {repo_root}")

    resolved_ckpt = (
        Path(ckpt_path).resolve()
        if ckpt_path
        else repo_root / "checkpoints" / "latentsync_unet.pt"
    )
    resolved_unet = (
        Path(unet_config).resolve()
        if unet_config
        else repo_root / "configs" / "unet" / "stage2_512.yaml"
    )

    if not resolved_ckpt.is_file():
        raise FileNotFoundError(f"LatentSync 权重不存在: {resolved_ckpt}")
    if not resolved_unet.is_file():
        raise FileNotFoundError(f"LatentSync UNet 配置不存在: {resolved_unet}")

    return LatentSyncPaths(
        repo_root=repo_root,
        ckpt_path=resolved_ckpt,
        unet_config=resolved_unet,
    )


def load_pipeline(paths: LatentSyncPaths, *, enable_deepcache: bool = True):
    _ensure_repo_on_path(paths.repo_root)
    original_cwd = os.getcwd()
    os.chdir(paths.repo_root)
    try:
        import torch
        from accelerate.utils import set_seed
        from diffusers import AutoencoderKL, DDIMScheduler
        from DeepCache import DeepCacheSDHelper

        from latentsync.models.unet import UNet3DConditionModel
        from latentsync.pipelines.lipsync_pipeline import LipsyncPipeline
        from latentsync.whisper.audio2feature import Audio2Feature

        config = OmegaConf.load(paths.unet_config)
        is_fp16_supported = torch.cuda.is_available() and torch.cuda.get_device_capability()[0] > 7
        dtype = float16 if is_fp16_supported else float32

        scheduler = DDIMScheduler.from_pretrained("configs")
        if config.model.cross_attention_dim == 768:
            whisper_model_path = "checkpoints/whisper/small.pt"
        elif config.model.cross_attention_dim == 384:
            whisper_model_path = "checkpoints/whisper/tiny.pt"
        else:
            raise NotImplementedError("cross_attention_dim must be 768 or 384")

        audio_encoder = Audio2Feature(
            model_path=whisper_model_path,
            device="cuda",
            num_frames=config.data.num_frames,
            audio_feat_length=config.data.audio_feat_length,
        )

        local_vae = "checkpoints/sd-vae-ft-mse"
        if os.path.isdir(local_vae):
            vae = AutoencoderKL.from_pretrained(local_vae, torch_dtype=dtype, local_files_only=True)
        else:
            vae = AutoencoderKL.from_pretrained("stabilityai/sd-vae-ft-mse", torch_dtype=dtype)
        vae.config.scaling_factor = 0.18215
        vae.config.shift_factor = 0

        unet, _ = UNet3DConditionModel.from_pretrained(
            OmegaConf.to_container(config.model),
            str(paths.ckpt_path),
            device="cpu",
        )
        unet = unet.to(dtype=dtype)

        pipeline = LipsyncPipeline(
            vae=vae,
            audio_encoder=audio_encoder,
            unet=unet,
            scheduler=scheduler,
        ).to("cuda")

        if enable_deepcache:
            helper = DeepCacheSDHelper(pipe=pipeline)
            helper.set_params(cache_interval=3, cache_branch_id=0)
            helper.enable()

        logger.info(
            "LatentSync pipeline loaded repo=%s ckpt=%s deepcache=%s",
            paths.repo_root,
            paths.ckpt_path,
            enable_deepcache,
        )
        return pipeline, config, dtype, set_seed
    finally:
        os.chdir(original_cwd)


def run_inference(
    pipeline,
    config,
    dtype,
    set_seed,
    *,
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    params: dict | None = None,
    repo_root: Path,
) -> None:
    if not video_path.is_file():
        raise FileNotFoundError(f"源视频不存在: {video_path}")
    if not audio_path.is_file():
        raise FileNotFoundError(f"驱动音频不存在: {audio_path}")

    payload = params or {}
    seed = int(payload.get("seed", 1247))
    inference_steps = int(payload.get("inferenceSteps", 20))
    guidance_scale = float(payload.get("guidanceScale", 1.5))
    landmark_smooth_alpha = float(payload.get("landmarkSmoothAlpha", 0.7))

    output_path.parent.mkdir(parents=True, exist_ok=True)

    original_cwd = os.getcwd()
    os.chdir(repo_root)
    try:
        import torch

        if seed != -1:
            set_seed(seed)
        else:
            torch.seed()

        with tempfile.TemporaryDirectory(prefix="latentsync-") as temp_dir:
            pipeline(
                video_path=str(video_path.resolve()),
                audio_path=str(audio_path.resolve()),
                video_out_path=str(output_path.resolve()),
                num_frames=config.data.num_frames,
                num_inference_steps=inference_steps,
                guidance_scale=guidance_scale,
                weight_dtype=dtype,
                width=config.data.resolution,
                height=config.data.resolution,
                mask_image_path=config.data.mask_image_path,
                temp_dir=temp_dir,
                mixed_noise_alpha=config.run.get("mixed_noise_alpha", 1.0),
                landmark_smooth_alpha=landmark_smooth_alpha,
            )
    finally:
        os.chdir(original_cwd)

    if not output_path.is_file():
        raise RuntimeError("LatentSync 未生成输出视频")

    if cuda.is_available():
        cuda.empty_cache()


def unload_pipeline(runtime: dict) -> bool:
    """Drop resident pipeline tensors and free GPU memory."""
    had_pipeline = "pipeline" in runtime
    for key in ("pipeline", "config", "dtype", "set_seed"):
        runtime.pop(key, None)
    if cuda.is_available():
        cuda.empty_cache()
    if had_pipeline:
        logger.info("LatentSync pipeline unloaded")
    return had_pipeline
