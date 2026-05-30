from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def detect_scene_boundaries(video_path) -> list[float]:
    try:
        from scenedetect import ContentDetector, detect
    except ImportError:
        logger.warning("PySceneDetect 未安装，跳过场景检测")
        return []

    try:
        scene_list = detect(str(video_path), ContentDetector())
    except Exception:
        logger.exception("场景检测失败")
        return []

    boundaries: set[float] = {0.0}
    for start_time, end_time in scene_list:
        boundaries.add(round(start_time.get_seconds(), 3))
        boundaries.add(round(end_time.get_seconds(), 3))
    return sorted(boundaries)
