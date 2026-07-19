import logging
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp

from app.config import settings
from app.workers.douyin_downloader import download_douyin_video
from app.workers.http_download import OnRatio
from app.workers.kuaishou_downloader import download_kuaishou_video

logger = logging.getLogger(__name__)

_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mkv", ".mov", ".m4v", ".flv", ".ts"}


def _normalize_ytdlp_url(url: str, platform_id: str | None) -> str:
    trimmed = url.strip()
    parsed = urlparse(trimmed if "://" in trimmed else f"https://{trimmed}")
    host = parsed.netloc.lower()

    if platform_id == "bilibili" or "bilibili.com" in host or host == "b23.tv":
        bvid_match = re.search(r"/video/(BV[\w]+)", parsed.path, re.I)
        if bvid_match:
            return f"https://www.bilibili.com/video/{bvid_match.group(1)}"

    return trimmed


def _find_downloaded_video(directory: Path) -> Path:
    candidates = [
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in _VIDEO_EXTENSIONS
    ]
    if not candidates:
        raise RuntimeError("视频下载完成但未找到媒体文件")
    return max(candidates, key=lambda path: path.stat().st_size)


def _build_ydl_opts(tmp_path: Path) -> dict:
    opts: dict = {
        "outtmpl": str(tmp_path / "video.%(ext)s"),
        "format": "best[ext=mp4]/best[height<=1080]/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "merge_output_format": "mp4",
        "retries": 3,
        "socket_timeout": 30,
    }

    if settings.ytdlp_cookies_file:
        cookie_path = Path(settings.ytdlp_cookies_file)
        if cookie_path.is_file():
            opts["cookiefile"] = str(cookie_path)
    elif settings.ytdlp_cookies_from_browser:
        opts["cookiesfrombrowser"] = (settings.ytdlp_cookies_from_browser,)

    return opts


def _download_with_ytdlp(url: str, output_path: Path, platform_id: str | None) -> None:
    download_url = _normalize_ytdlp_url(url, platform_id)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="platform-video-") as tmp_dir:
        tmp_path = Path(tmp_dir)
        ydl_opts = _build_ydl_opts(tmp_path)

        logger.info(
            "Downloading with yt-dlp: platform=%s url=%s resolved=%s",
            platform_id or "auto",
            url,
            download_url,
        )

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([download_url])
        except Exception as exc:
            raise RuntimeError(
                f"平台视频下载失败（{platform_id or 'unknown'}）：{exc}"
            ) from exc

        downloaded = _find_downloaded_video(tmp_path)
        if output_path.exists():
            output_path.unlink()
        shutil.move(str(downloaded), str(output_path))


def download_platform_video(
    url: str,
    output_path: Path,
    *,
    platform_id: str | None = None,
    on_ratio: OnRatio = None,
) -> None:
    if not url.strip():
        raise ValueError("downloadUrl 不能为空")

    if platform_id == "douyin" or _looks_like_douyin(url):
        download_douyin_video(url, output_path, on_ratio=on_ratio)
        return

    if platform_id == "kuaishou" or _looks_like_kuaishou(url):
        download_kuaishou_video(url, output_path, on_ratio=on_ratio)
        return

    _download_with_ytdlp(url, output_path, platform_id)


def _looks_like_douyin(url: str) -> bool:
    host = urlparse(url.strip()).netloc.lower()
    return "douyin.com" in host or "iesdouyin.com" in host


def _looks_like_kuaishou(url: str) -> bool:
    host = urlparse(url.strip()).netloc.lower()
    return (
        "kuaishou.com" in host
        or "chenzhongtech.com" in host
        or "gifshow.com" in host
    )
