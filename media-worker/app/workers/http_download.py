from collections.abc import Callable
from pathlib import Path

import httpx

OnRatio = Callable[[float], None] | None


def resolve_redirect(url: str, *, headers: dict[str, str], timeout: float = 20.0) -> str:
    with httpx.Client(headers=headers, follow_redirects=True, timeout=timeout) as client:
        response = client.get(url)
        response.raise_for_status()
        return str(response.url)


def stream_to_file(
    url: str,
    output_path: Path,
    *,
    headers: dict[str, str],
    timeout: float = 120.0,
    on_ratio: OnRatio = None,
) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    last_ratio = 0.0
    with httpx.stream(
        "GET",
        url,
        headers=headers,
        follow_redirects=True,
        timeout=timeout,
    ) as response:
        response.raise_for_status()
        total = int(response.headers.get("content-length") or 0)
        downloaded = 0
        with output_path.open("wb") as file:
            for chunk in response.iter_bytes(65536):
                if not chunk:
                    continue
                file.write(chunk)
                downloaded += len(chunk)
                if on_ratio and total > 0:
                    ratio = min(1.0, downloaded / total)
                    if ratio - last_ratio >= 0.05 or ratio >= 1.0:
                        on_ratio(ratio)
                        last_ratio = ratio

    if on_ratio:
        on_ratio(1.0)

    size = output_path.stat().st_size if output_path.exists() else 0
    if size == 0:
        raise RuntimeError(f"下载失败，输出文件无效: {output_path}")
    return size
