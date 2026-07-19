# 仅消费 LatentSync 队列，推理走常驻 LATENTSYNC_SERVER_URL
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DefaultPython = Join-Path $Root ".venv\Scripts\python.exe"
$Python = if ($env:WORKER_PYTHON) { $env:WORKER_PYTHON } else { $DefaultPython }
$Prefix = if ($env:MEDIA_AI_QUEUE_PREFIX) { $env:MEDIA_AI_QUEUE_PREFIX } else { "media-ai:jobs" }

if (-not (Test-Path $Python)) {
    Write-Error "Python not found: $Python. Create media-worker/.venv or set WORKER_PYTHON."
}

if (-not $env:WORKER_QUEUE_KEYS) {
    $env:WORKER_QUEUE_KEYS = "$Prefix`:latentsync"
}
if (-not $env:LATENTSYNC_SERVER_URL) {
    $Port = if ($env:LATENTSYNC_SERVER_PORT) { $env:LATENTSYNC_SERVER_PORT } else { "8102" }
    $env:LATENTSYNC_SERVER_URL = "http://127.0.0.1:$Port"
}

Write-Host "Worker queues: $env:WORKER_QUEUE_KEYS"
Write-Host "LatentSync server: $env:LATENTSYNC_SERVER_URL"

Set-Location $Root
if ($env:WORKER_RELOAD -eq "1") {
    & $Python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
} else {
    & $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
}
