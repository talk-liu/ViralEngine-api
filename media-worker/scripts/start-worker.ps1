# 默认 Worker：监听全部 4 个分队列（cpu/tts/latentsync/flashhead）
# 生产建议拆分：start-worker-general.ps1 + start-worker-latentsync.ps1 + start-latentsync-server.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DefaultPython = Join-Path $Root ".venv\Scripts\python.exe"
$Python = if ($env:WORKER_PYTHON) { $env:WORKER_PYTHON } else { $DefaultPython }

if (-not (Test-Path $Python)) {
    Write-Error "Python not found: $Python. Create media-worker/.venv or set WORKER_PYTHON."
}

Set-Location $Root
if ($env:WORKER_RELOAD -eq "1") {
    & $Python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
} else {
    & $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
}
