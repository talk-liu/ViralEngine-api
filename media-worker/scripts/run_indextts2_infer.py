#!/usr/bin/env python3
"""IndexTTS2 独立推理脚本，供 Docker 子进程 / 独立 venv 调用。"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def _ensure_import_path(repo: Path) -> None:
    indextts_pkg = repo / "indextts"
    for entry in (str(repo), str(indextts_pkg)):
        if entry not in sys.path:
            sys.path.insert(0, entry)


def _configure_hf_cache(model_dir: Path) -> None:
    hf_cache = model_dir / "hf_cache"
    if hf_cache.is_dir():
        os.environ.setdefault("HF_HUB_CACHE", str(hf_cache.resolve()))


def main() -> None:
    parser = argparse.ArgumentParser(description="IndexTTS2 inference subprocess")
    parser.add_argument("--repo", required=True)
    parser.add_argument("--model-dir")
    parser.add_argument("--device")
    parser.add_argument("--use-fp16", action="store_true")
    parser.add_argument("--use-deepspeed", action="store_true")
    parser.add_argument("--use-cuda-kernel", action="store_true")
    parser.add_argument("--spk", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--emo")
    parser.add_argument("--params-json", required=True)
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    model_dir = Path(args.model_dir).resolve() if args.model_dir else repo / "checkpoints"
    spk_path = Path(args.spk).resolve()
    output_path = Path(args.output).resolve()
    emo_path = Path(args.emo).resolve() if args.emo else None
    payload = json.loads(Path(args.params_json).read_text(encoding="utf-8"))

    if not repo.is_dir():
        raise FileNotFoundError(f"IndexTTS2 目录不存在: {repo}")
    if not spk_path.is_file():
        raise FileNotFoundError(f"音色参考音频不存在: {spk_path}")

    _ensure_import_path(repo)
    _configure_hf_cache(model_dir)
    cfg_path = model_dir / "config.yaml"
    if not cfg_path.is_file():
        raise FileNotFoundError(f"缺少模型配置: {cfg_path}")

    from indextts.infer_v2 import IndexTTS2

    device = args.device.strip() if args.device else None
    if device == "":
        device = None

    tts = IndexTTS2(
        cfg_path=str(cfg_path),
        model_dir=str(model_dir),
        use_fp16=args.use_fp16,
        use_deepspeed=args.use_deepspeed,
        use_cuda_kernel=args.use_cuda_kernel,
        device=device,
    )

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
        if not emo_path or not emo_path.is_file():
            raise FileNotFoundError("情感参考音频不存在")
        emo_ref_path = str(emo_path)
    elif emo_control_method == 2:
        raw = payload.get("emoVector")
        if not isinstance(raw, list) or len(raw) != 8:
            raise ValueError("emoVector 必须是 8 维数组")
        emo_vector = tts.normalize_emo_vec([float(x) for x in raw], apply_bias=True)
    elif emo_control_method == 3:
        use_emo_text = True
    else:
        raise ValueError(f"不支持的 emoControlMethod: {emo_control_method}")

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

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result = tts.infer(
        spk_audio_prompt=str(spk_path),
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


if __name__ == "__main__":
    main()
