#!/usr/bin/env python3
"""验证通义（DashScope）OpenAI 兼容接口是否配置正确。

用法（在 media-worker 目录）:
  python scripts/verify_llm.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.services.llm_client import chat_completion, is_llm_configured, llm_status  # noqa: E402


def main() -> None:
    status = llm_status()
    print(f"API Base : {status['apiBase']}")
    print(f"Model    : {status['model']}")
    print(f"Configured: {status['configured']}")

    if not is_llm_configured():
        print("\n未配置 LLM_API_KEY。")
        print("请在 media-worker/.env 中设置：")
        print("  LLM_API_KEY=sk-xxx")
        sys.exit(1)

    print("\n发送测试请求...")
    try:
        reply = chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": "用一句话介绍一款适合直播带货的面膜，不超过30字。",
                }
            ],
            temperature=0.3,
        )
    except RuntimeError as exc:
        print(f"\n失败: {exc}")
        sys.exit(1)

    print("\n通义 API 连接正常。回复示例：")
    print(reply.strip())


if __name__ == "__main__":
    main()
