from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.servers.latentsync_engine import (
    load_pipeline,
    resolve_latentsync_paths,
    run_inference,
    unload_pipeline,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

_runtime: dict[str, Any] = {}
_load_lock = asyncio.Lock()


class LatentSyncInferRequest(BaseModel):
    video_path: str = Field(alias="videoPath")
    audio_path: str = Field(alias="audioPath")
    output_path: str = Field(alias="outputPath")
    params: dict[str, Any] = Field(default_factory=dict)
    job_id: str | None = Field(default=None, alias="jobId")

    model_config = {"populate_by_name": True}


async def _load_runtime_pipeline() -> None:
    paths = _runtime.get("paths")
    if paths is None:
        paths = resolve_latentsync_paths(
            repo_path=settings.latentsync_repo_path,
            ckpt_path=settings.latentsync_ckpt_path,
            unet_config=settings.latentsync_unet_config,
        )
        _runtime["paths"] = paths

    pipeline, config, dtype, set_seed = await asyncio.to_thread(
        load_pipeline,
        paths,
        enable_deepcache=True,
    )
    _runtime["pipeline"] = pipeline
    _runtime["config"] = config
    _runtime["dtype"] = dtype
    _runtime["set_seed"] = set_seed
    logger.info("LatentSync inference server ready")


async def _ensure_pipeline_loaded() -> None:
    if "pipeline" in _runtime:
        return
    async with _load_lock:
        if "pipeline" in _runtime:
            return
        await _load_runtime_pipeline()


@asynccontextmanager
async def lifespan(_: FastAPI):
    paths = resolve_latentsync_paths(
        repo_path=settings.latentsync_repo_path,
        ckpt_path=settings.latentsync_ckpt_path,
        unet_config=settings.latentsync_unet_config,
    )
    _runtime["paths"] = paths
    logger.info("LatentSync inference server started (lazy model load)")
    yield
    unload_pipeline(_runtime)
    _runtime.clear()


app = FastAPI(
    title="LatentSync Inference Server",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    paths = _runtime.get("paths")
    return {
        "status": "ok",
        "model": "latentsync",
        "loaded": "pipeline" in _runtime,
        "repoPath": str(paths.repo_root) if paths else None,
    }


@app.post("/unload")
async def unload():
    unloaded = await asyncio.to_thread(unload_pipeline, _runtime)
    return {"status": "ok", "unloaded": unloaded}


@app.post("/reload")
async def reload():
    async with _load_lock:
        await _load_runtime_pipeline()
    return {"status": "ok", "loaded": True}


@app.post("/infer")
async def infer(request: LatentSyncInferRequest):
    await _ensure_pipeline_loaded()

    paths = _runtime["paths"]
    video_path = Path(request.video_path)
    audio_path = Path(request.audio_path)
    output_path = Path(request.output_path)

    logger.info(
        "Infer job=%s video=%s audio=%s output=%s",
        request.job_id,
        video_path,
        audio_path,
        output_path,
    )

    try:
        await asyncio.to_thread(
            run_inference,
            _runtime["pipeline"],
            _runtime["config"],
            _runtime["dtype"],
            _runtime["set_seed"],
            video_path=video_path,
            audio_path=audio_path,
            output_path=output_path,
            params=request.params,
            repo_root=paths.repo_root,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("LatentSync inference failed job=%s", request.job_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "ok",
        "outputPath": str(output_path),
        "jobId": request.job_id,
    }
