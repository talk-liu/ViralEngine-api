#!/usr/bin/env python3
"""预下载 faster-whisper 模型（避免任务执行时联网超时）。

用法（在 media-worker 目录）:
  python scripts/download_whisper_model.py
  python scripts/download_whisper_model.py small
  HF_ENDPOINT=https://hf-mirror.com python scripts/download_whisper_model.py
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# 将 media-worker 加入 path，复用项目配置（含 HF_ENDPOINT）
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

from faster_whisper import download_model  # noqa: E402

try:
    from app.config import settings  # noqa: E402
except UnicodeDecodeError:
    # 根目录 .env 非 UTF-8 时回退默认
    settings = type("S", (), {"whisper_model": "small", "hf_endpoint": os.environ.get("HF_ENDPOINT")})()  # noqa: E501


def main() -> None:
    parser = argparse.ArgumentParser(description="Download faster-whisper model")
    parser.add_argument(
        "model",
        nargs="?",
        default=settings.whisper_model,
        help=f"模型尺寸或 Hub ID（默认: {settings.whisper_model}）",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="保存目录（默认使用 HuggingFace 缓存）",
    )
    args = parser.parse_args()

    print(f"HF_ENDPOINT={settings.hf_endpoint or '(huggingface.co)'}")
    print(f"Downloading model: {args.model} ...")

    path = download_model(args.model, output_dir=args.output)
    print(f"Done. Model path:\n  {path}")
    print("\n可在 .env 中设置（可选）:")
    print(f"  WHISPER_MODEL_PATH={path}")


if __name__ == "__main__":
    main()
