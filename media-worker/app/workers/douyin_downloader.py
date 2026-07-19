import json
import logging
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx

from app.workers.http_download import OnRatio, resolve_redirect, stream_to_file

logger = logging.getLogger(__name__)

MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 "
    "Mobile/15E148 Safari/604.1"
)
DEFAULT_HEADERS = {
    "User-Agent": MOBILE_UA,
    "Referer": "https://www.douyin.com/",
}


def extract_douyin_aweme_id(url: str) -> str:
    trimmed = url.strip()
    parsed = urlparse(trimmed if "://" in trimmed else f"https://{trimmed}")
    host = parsed.netloc.lower()
    query = parse_qs(parsed.query)

    modal_id = query.get("modal_id", [None])[0]
    if modal_id and modal_id.isdigit():
        return modal_id

    note_id = query.get("note_id", [None])[0] or query.get("aweme_id", [None])[0]
    if note_id and str(note_id).isdigit():
        return str(note_id)

    path_match = re.search(r"/(?:video|note)/(\d+)", parsed.path)
    if path_match:
        return path_match.group(1)

    if host in {"v.douyin.com", "vm.douyin.com"} or "/share/" in parsed.path:
        resolved = resolve_redirect(trimmed, headers=DEFAULT_HEADERS)
        return extract_douyin_aweme_id(resolved)

    text_match = re.search(r"(?:modal_id|note_id|aweme_id)[=:]/?(\d{8,})", trimmed)
    if text_match:
        return text_match.group(1)

    raise ValueError(f"无法从链接解析抖音视频 ID: {url}")


def _find_item_list(payload: object, depth: int = 0) -> dict | None:
    if depth > 12:
        return None
    if isinstance(payload, dict):
        item_list = payload.get("item_list")
        if isinstance(item_list, list) and item_list:
            first = item_list[0]
            if isinstance(first, dict):
                return first
        for value in payload.values():
            found = _find_item_list(value, depth + 1)
            if found:
                return found
    elif isinstance(payload, list):
        for value in payload:
            found = _find_item_list(value, depth + 1)
            if found:
                return found
    return None


def _extract_router_data(html: str) -> dict:
    match = re.search(
        r"window\._ROUTER_DATA\s*=\s*(\{.*?\})\s*;?\s*</script>",
        html,
        re.DOTALL,
    )
    if not match:
        raise ValueError("抖音分享页未找到视频数据，请检查链接是否有效")
    return json.loads(match.group(1))


def resolve_douyin_play_url(aweme_id: str) -> str:
    share_url = f"https://www.iesdouyin.com/share/video/{aweme_id}/"
    with httpx.Client(headers=DEFAULT_HEADERS, follow_redirects=True, timeout=20.0) as client:
        response = client.get(share_url)
        response.raise_for_status()

    item = _find_item_list(_extract_router_data(response.text))
    if not item:
        raise ValueError("抖音分享页解析失败，未找到视频信息")

    video = item.get("video")
    if not isinstance(video, dict):
        raise ValueError("抖音作品不是视频类型，暂不支持图文笔记转字幕")

    play_addr = video.get("play_addr")
    if not isinstance(play_addr, dict):
        raise ValueError("抖音视频缺少播放地址")

    url_list = play_addr.get("url_list")
    if isinstance(url_list, list) and url_list:
        play_url = str(url_list[0])
    else:
        uri = play_addr.get("uri")
        if not uri:
            raise ValueError("抖音视频缺少播放 URI")
        play_url = f"https://www.douyin.com/aweme/v1/play/?video_id={uri}&ratio=720p&line=0"

    return play_url.replace("playwm", "play")


def download_douyin_video(
    url: str,
    output_path: Path,
    *,
    on_ratio: OnRatio = None,
) -> None:
    aweme_id = extract_douyin_aweme_id(url)
    play_url = resolve_douyin_play_url(aweme_id)
    logger.info("Douyin download: aweme_id=%s play_url=%s", aweme_id, play_url[:120])

    size = stream_to_file(
        play_url,
        output_path,
        headers=DEFAULT_HEADERS,
        on_ratio=on_ratio,
    )
    logger.info(
        "Douyin video downloaded: aweme_id=%s size=%d path=%s",
        aweme_id,
        size,
        output_path,
    )
