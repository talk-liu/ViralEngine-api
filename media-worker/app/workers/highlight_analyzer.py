from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.services.llm_client import chat_json, is_llm_configured
from app.workers.asr import TranscriptSegment

logger = logging.getLogger(__name__)


@dataclass
class HighlightClip:
    start: float
    end: float
    score: float
    reason: str
    product_name: str | None
    product_id: str | None
    title: str
    description: str
    topics: list[str]
    tags: list[str]


def analyze_highlights(
    segments: list[TranscriptSegment],
    *,
    cart_items: list[dict],
    min_duration: float,
    max_duration: float,
    max_clips: int,
    highlight_prompt: str | None = None,
) -> list[HighlightClip]:
    if not is_llm_configured():
        logger.warning("未配置 LLM_API_KEY，使用规则引擎生成切片")
        return _rule_based_highlights(
            segments,
            cart_items=cart_items,
            min_duration=min_duration,
            max_duration=max_duration,
            max_clips=max_clips,
        )

    transcript = [
        {
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text,
        }
        for segment in segments
    ]
    if not transcript:
        return []

    products = [
        {
            "id": item.get("id"),
            "title": item.get("title"),
        }
        for item in cart_items
        if item.get("title")
    ]

    system_prompt = (
        "你是直播电商切片策划。根据带时间戳的口播文本，找出最适合发短视频的卖货高光片段。"
        "优先选择：完整卖点闭环（痛点-产品-价格-行动号召）、限时优惠、产品演示、逼单话术。"
        f"每段时长 {min_duration}-{max_duration} 秒，最多 {max_clips} 段。"
        "边界必须对齐完整句子，不可切半句。相邻高分片段间隔小于 5 秒应合并。"
        "为每段生成吸引人的短视频标题、卖货话术式描述、相关话题与标签。"
        "只输出 JSON，格式："
        '{"clips":[{"start":120.5,"end":175.2,"score":0.92,"reason":"...","productName":"...",'
        '"productId":"...","title":"...","description":"...","topics":["..."],"tags":["..."]}]}'
    )
    if highlight_prompt:
        system_prompt += f"\n额外策略：{highlight_prompt}"

    user_content = json.dumps(
        {
            "products": products,
            "transcript": transcript,
            "constraints": {
                "minDuration": min_duration,
                "maxDuration": max_duration,
                "maxClips": max_clips,
            },
        },
        ensure_ascii=False,
    )

    try:
        parsed = chat_json(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
        )
    except RuntimeError as exc:
        logger.warning("LLM 高光识别失败，回退规则引擎: %s", exc)
        return _rule_based_highlights(
            segments,
            cart_items=cart_items,
            min_duration=min_duration,
            max_duration=max_duration,
            max_clips=max_clips,
        )

    clips_raw = parsed.get("clips", parsed if isinstance(parsed, list) else [])
    if not isinstance(clips_raw, list):
        clips_raw = []

    highlights: list[HighlightClip] = []
    for item in clips_raw:
        if not isinstance(item, dict):
            continue
        start = float(item.get("start", 0))
        end = float(item.get("end", 0))
        duration = end - start
        if duration < min_duration or duration > max_duration * 1.2:
            continue
        highlights.append(
            HighlightClip(
                start=start,
                end=end,
                score=float(item.get("score", 0.5)),
                reason=str(item.get("reason", "")),
                product_name=item.get("productName") or item.get("product_name"),
                product_id=item.get("productId") or item.get("product_id"),
                title=str(item.get("title", "直播高光片段")),
                description=str(item.get("description", "")),
                topics=list(item.get("topics") or []),
                tags=list(item.get("tags") or []),
            )
        )

    highlights.sort(key=lambda clip: clip.score, reverse=True)
    if not highlights:
        return _rule_based_highlights(
            segments,
            cart_items=cart_items,
            min_duration=min_duration,
            max_duration=max_duration,
            max_clips=max_clips,
        )
    return highlights[:max_clips]


def _rule_based_highlights(
    segments: list[TranscriptSegment],
    *,
    cart_items: list[dict],
    min_duration: float,
    max_duration: float,
    max_clips: int,
) -> list[HighlightClip]:
    keywords = [
        "限时",
        "优惠",
        "包邮",
        "秒杀",
        "下单",
        "链接",
        "库存",
        "最后",
        "今天",
        "直播间",
    ]
    for item in cart_items:
        title = str(item.get("title", "")).strip()
        if title:
            keywords.append(title)

    highlights: list[HighlightClip] = []
    window: list[TranscriptSegment] = []
    window_start = 0.0

    def flush_window() -> None:
        nonlocal window, window_start
        if not window:
            return
        start = window_start
        end = window[-1].end
        duration = end - start
        if duration < min_duration:
            window = []
            return
        if duration > max_duration:
            end = start + max_duration
        text = "".join(segment.text for segment in window)
        score = 0.4
        for keyword in keywords:
            if keyword and keyword in text:
                score += 0.1
        matched_product = next(
            (item for item in cart_items if item.get("title") and item["title"] in text),
            None,
        )
        highlights.append(
            HighlightClip(
                start=start,
                end=end,
                score=min(score, 0.95),
                reason="规则引擎：命中卖货关键词",
                product_name=matched_product.get("title") if matched_product else None,
                product_id=matched_product.get("id") if matched_product else None,
                title=(matched_product or {}).get("title") or text[:20] or "直播高光",
                description=text[:120],
                topics=[],
                tags=[],
            )
        )
        window = []

    for segment in segments:
        if not window:
            window_start = segment.start
        window.append(segment)
        joined = "".join(item.text for item in window)
        if any(keyword in joined for keyword in keywords):
            duration = segment.end - window_start
            if duration >= min_duration:
                flush_window()

    if window:
        flush_window()

    highlights.sort(key=lambda clip: clip.score, reverse=True)
    return highlights[:max_clips]
