import json
import logging
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx

from app.workers.http_download import OnRatio, resolve_redirect, stream_to_file

logger = logging.getLogger(__name__)

MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 "
    "Mobile/15E148 Safari/604.1"
)
DEFAULT_HEADERS = {
    "User-Agent": MOBILE_UA,
    "Referer": "https://www.kuaishou.com/",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

_MP4_PATTERN = re.compile(r"https?://[^\s\"']+?\.mp4(?:\?[^\s\"']+)?")


def extract_kuaishou_photo_id(url: str) -> str:
    trimmed = url.strip()
    parsed = urlparse(trimmed if "://" in trimmed else f"https://{trimmed}")
    host = parsed.netloc.lower()
    query = parse_qs(parsed.query)

    photo_id = query.get("photoId", [None])[0]
    if photo_id:
        return str(photo_id)

    path_match = re.search(
        r"/(?:short-video|photo|f)/([a-zA-Z0-9_-]+)",
        parsed.path,
    )
    if path_match:
        return path_match.group(1)

    if host in {"v.kuaishou.com", "f.kuaishou.com"}:
        resolved = resolve_redirect(trimmed, headers=DEFAULT_HEADERS)
        return extract_kuaishou_photo_id(resolved)

    text_match = re.search(
        r"(?:photoId|clientCacheKey)=([a-zA-Z0-9_-]+)",
        trimmed,
    )
    if text_match:
        return text_match.group(1).split("_", 1)[0]

    raise ValueError(f"无法从链接解析快手视频 ID: {url}")


def _extract_balanced_json(text: str, marker: str) -> dict:
    start = text.find(marker)
    if start < 0:
        raise ValueError(f"页面缺少 {marker}")
    brace_start = text.find("{", start)
    if brace_start < 0:
        raise ValueError("JSON 起始位置未找到")

    depth = 0
    in_string = False
    escape = False
    for index in range(brace_start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[brace_start : index + 1])
    raise ValueError("JSON 结束位置未找到")


def _find_photo_node(payload: object, depth: int = 0) -> dict | None:
    if depth > 16:
        return None
    if isinstance(payload, dict):
        main_mv = payload.get("mainMvUrls")
        if isinstance(main_mv, list) and main_mv:
            return payload
        photo = payload.get("photo")
        if isinstance(photo, dict) and photo.get("mainMvUrls"):
            return photo
        for value in payload.values():
            found = _find_photo_node(value, depth + 1)
            if found:
                return found
    elif isinstance(payload, list):
        for value in payload:
            found = _find_photo_node(value, depth + 1)
            if found:
                return found
    return None


def _pick_mp4_from_html(html: str) -> str | None:
    seen: dict[str, str] = {}
    for match in _MP4_PATTERN.finditer(html):
        url = match.group(0)
        base = url.split("?", 1)[0]
        seen.setdefault(base, url)

    if not seen:
        return None

    std = [u for b, u in seen.items() if "_b_" in b]
    hd = [u for b, u in seen.items() if "hd15" in b or "_hd" in b]
    other = [u for u in seen.values() if u not in std and u not in hd]
    for group in (std, hd, other):
        if group:
            return group[0]
    return None


def _pick_mp4_from_init_state(html: str) -> str | None:
    try:
        data = _extract_balanced_json(html, "window.INIT_STATE")
    except (ValueError, json.JSONDecodeError):
        return None

    photo = _find_photo_node(data)
    if not photo:
        return None

    main_mv = photo.get("mainMvUrls") or []
    if not main_mv:
        return None

    first = main_mv[0]
    if isinstance(first, dict):
        url = first.get("url")
        if isinstance(url, str) and url:
            return url
    if isinstance(first, str):
        return first
    return None


def resolve_kuaishou_play_url(photo_id: str) -> str:
    page_url = f"https://v.m.chenzhongtech.com/fw/photo/{photo_id}"

    with httpx.Client(headers=DEFAULT_HEADERS, follow_redirects=True, timeout=20.0) as client:
        response = client.get(page_url)
        response.raise_for_status()
        html = response.text

    play_url = _pick_mp4_from_html(html) or _pick_mp4_from_init_state(html)
    if not play_url:
        raise ValueError("快手分享页解析失败，未找到视频播放地址")

    return play_url


def download_kuaishou_video(
    url: str,
    output_path: Path,
    *,
    on_ratio: OnRatio = None,
) -> None:
    photo_id = extract_kuaishou_photo_id(url)
    play_url = resolve_kuaishou_play_url(photo_id)
    logger.info(
        "Kuaishou download: photo_id=%s play_url=%s",
        photo_id,
        play_url[:120],
    )

    size = stream_to_file(
        play_url,
        output_path,
        headers=DEFAULT_HEADERS,
        on_ratio=on_ratio,
    )
    logger.info(
        "Kuaishou video downloaded: photo_id=%s size=%d path=%s",
        photo_id,
        size,
        output_path,
    )
