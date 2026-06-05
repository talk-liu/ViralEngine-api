from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

_tts = None
_INFER_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "run_indextts2_infer.py"


def _repo_root() -> Path:
    if not settings.indextts2_repo_path:
        raise RuntimeError(
            "未配置 INDEXTTS2_REPO_PATH，请在 media-worker/.env 中设置 IndexTTS2 项目目录"
        )
    root = Path(settings.indextts2_repo_path)
    if not root.is_dir():
        raise FileNotFoundError(f"IndexTTS2 目录不存在: {root}")
    return root.resolve()


def _model_dir() -> Path:
    if settings.indextts2_model_dir:
        return Path(settings.indextts2_model_dir).resolve()
    return _repo_root() / "checkpoints"


def _ensure_import_path() -> None:
    root = str(_repo_root())
    indextts_pkg = os.path.join(root, "indextts")
    for entry in (root, indextts_pkg):
        if entry not in sys.path:
            sys.path.insert(0, entry)


def _configure_hf_cache(model_dir: Path) -> None:
    hf_cache = model_dir / "hf_cache"
    if hf_cache.is_dir():
        os.environ.setdefault("HF_HUB_CACHE", str(hf_cache.resolve()))


def _get_tts():
    global _tts
    if _tts is not None:
        return _tts

    _ensure_import_path()
    model_dir = _model_dir()
    _configure_hf_cache(model_dir)
    cfg_path = model_dir / "config.yaml"
    if not cfg_path.is_file():
        raise FileNotFoundError(f"缺少模型配置: {cfg_path}")

    from indextts.infer_v2 import IndexTTS2

    device = settings.indextts2_device.strip() if settings.indextts2_device else None
    if device == "":
        device = None

    logger.info(
        "Loading IndexTTS2 model_dir=%s device=%s fp16=%s cuda_kernel=%s",
        model_dir,
        device or "auto",
        settings.indextts2_use_fp16,
        settings.indextts2_use_cuda_kernel,
    )
    _tts = IndexTTS2(
        cfg_path=str(cfg_path),
        model_dir=str(model_dir),
        use_fp16=settings.indextts2_use_fp16,
        use_deepspeed=settings.indextts2_use_deepspeed,
        use_cuda_kernel=settings.indextts2_use_cuda_kernel,
        device=device,
    )
    return _tts


def _resolve_emo_vector(params: dict) -> list[float] | None:
    raw = params.get("emoVector")
    if raw is None:
        return None
    if isinstance(raw, list):
        vec = raw
    else:
        raise ValueError("emoVector 格式无效")
    if len(vec) != 8:
        raise ValueError("emoVector 必须是 8 维数组")
    tts = _get_tts()
    return tts.normalize_emo_vec([float(x) for x in vec], apply_bias=True)


def _uses_subprocess() -> bool:
    if not settings.indextts2_python:
        return False
    return Path(settings.indextts2_python).resolve() != Path(sys.executable).resolve()


def _synthesize_subprocess(
    spk_audio_path: Path,
    output_path: Path,
    *,
    emo_audio_path: Path | None,
    payload: dict,
) -> None:
    python = Path(settings.indextts2_python).resolve()
    if not python.is_file():
        raise FileNotFoundError(f"IndexTTS2 Python 不存在: {python}")
    if not _INFER_SCRIPT.is_file():
        raise FileNotFoundError(f"缺少推理脚本: {_INFER_SCRIPT}")

    params_file: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".json",
            delete=False,
            encoding="utf-8",
        ) as handle:
            json.dump(payload, handle, ensure_ascii=False)
            params_file = handle.name

        cmd = [
            str(python),
            str(_INFER_SCRIPT),
            "--repo",
            str(_repo_root()),
            "--model-dir",
            str(_model_dir()),
            "--spk",
            str(spk_audio_path.resolve()),
            "--output",
            str(output_path.resolve()),
            "--params-json",
            params_file,
        ]
        if settings.indextts2_device:
            cmd.extend(["--device", settings.indextts2_device])
        if settings.indextts2_use_fp16:
            cmd.append("--use-fp16")
        if settings.indextts2_use_deepspeed:
            cmd.append("--use-deepspeed")
        if settings.indextts2_use_cuda_kernel:
            cmd.append("--use-cuda-kernel")
        if emo_audio_path and emo_audio_path.is_file():
            cmd.extend(["--emo", str(emo_audio_path.resolve())])

        logger.info("Running IndexTTS2 subprocess spk=%s output=%s", spk_audio_path, output_path)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode != 0:
            stderr = (result.stderr or "").strip()
            stdout = (result.stdout or "").strip()
            detail = stderr or stdout or f"exit code {result.returncode}"
            raise RuntimeError(f"IndexTTS2 推理失败: {detail}")
    finally:
        if params_file:
            Path(params_file).unlink(missing_ok=True)

    if not output_path.is_file():
        raise RuntimeError("IndexTTS2 未生成输出音频")


def synthesize_indextts2(
    spk_audio_path: Path,
    output_path: Path,
    *,
    emo_audio_path: Path | None = None,
    params: dict | None = None,
) -> None:
    if not spk_audio_path.is_file():
        raise FileNotFoundError(f"音色参考音频不存在: {spk_audio_path}")

    payload = params or {}
    text = str(payload.get("text", "")).strip()
    if not text:
        raise ValueError("text 不能为空")

    emo_control_method = int(payload.get("emoControlMethod", 0))
    emo_weight = float(payload.get("emoWeight", 0.65))
    emo_text = payload.get("emoText")
    if isinstance(emo_text, str) and not emo_text.strip():
        emo_text = None

    emo_ref_path: str | None = None
    emo_vector = None
    use_emo_text = False

    if emo_control_method == 0:
        emo_ref_path = None
    elif emo_control_method == 1:
        if not emo_audio_path or not emo_audio_path.is_file():
            raise FileNotFoundError("情感参考音频不存在")
        emo_ref_path = str(emo_audio_path)
    elif emo_control_method == 2:
        emo_vector = _resolve_emo_vector(payload)
    elif emo_control_method == 3:
        use_emo_text = True
    else:
        raise ValueError(f"不支持的 emoControlMethod: {emo_control_method}")

    if _uses_subprocess():
        _synthesize_subprocess(
            spk_audio_path,
            output_path,
            emo_audio_path=emo_audio_path,
            payload=payload,
        )
        return

    top_k = int(payload.get("topK", 30))
    generation_kwargs = {
        "do_sample": bool(payload.get("doSample", True)),
        "top_p": float(payload.get("topP", 0.8)),
        "top_k": top_k if top_k > 0 else None,
        "temperature": float(payload.get("temperature", 0.8)),
        "length_penalty": float(payload.get("lengthPenalty", 0.0)),
        "num_beams": int(payload.get("numBeams", 1)),
        "repetition_penalty": float(payload.get("repetitionPenalty", 10.0)),
        "max_mel_tokens": int(payload.get("maxMelTokens", 1500)),
    }

    tts = _get_tts()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result = tts.infer(
        spk_audio_prompt=str(spk_audio_path),
        text=text,
        output_path=str(output_path),
        emo_audio_prompt=emo_ref_path,
        emo_alpha=emo_weight,
        emo_vector=emo_vector,
        use_emo_text=use_emo_text,
        emo_text=emo_text,
        use_random=bool(payload.get("emoRandom", False)),
        interval_silence=int(payload.get("intervalSilence", 200)),
        verbose=bool(payload.get("verbose", False)),
        max_text_tokens_per_segment=int(payload.get("maxTextTokensPerSegment", 120)),
        **generation_kwargs,
    )

    if not result or not output_path.is_file():
        raise RuntimeError("IndexTTS2 未生成输出音频")
