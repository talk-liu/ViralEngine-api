# 通用 Worker：消费 CPU / TTS / FlashHead 队列（不含 LatentSync）
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DefaultPython = Join-Path $Root ".venv\Scripts\python.exe"
$Python = if ($env:WORKER_PYTHON) { $env:WORKER_PYTHON } else { $DefaultPython }
$Prefix = if ($env:MEDIA_AI_QUEUE_PREFIX) { $env:MEDIA_AI_QUEUE_PREFIX } else { "media-ai:jobs" }

if (-not (Test-Path $Python)) {
    Write-Error "Python not found: $Python. Create media-worker/.venv or set WORKER_PYTHON."
}

if (-not $env:WORKER_QUEUE_KEYS) {
    $env:WORKER_QUEUE_KEYS = "$Prefix`:cpu,$Prefix`:tts,$Prefix`:flashhead"
}

Write-Host "Worker queues: $env:WORKER_QUEUE_KEYS"

Set-Location $Root
& $Python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
