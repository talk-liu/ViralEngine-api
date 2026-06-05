# LatentSync 常驻推理服务：启动时加载一次模型，后续任务复用显存
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DefaultPython = if ($env:LATENTSYNC_PYTHON) { $env:LATENTSYNC_PYTHON } else { "D:/workbench/LatentSync/venv/Scripts/python.exe" }
$Python = $DefaultPython
$Port = if ($env:LATENTSYNC_SERVER_PORT) { $env:LATENTSYNC_SERVER_PORT } else { "8102" }

if (-not (Test-Path $Python)) {
    Write-Error "Python not found: $Python. Set LATENTSYNC_PYTHON to LatentSync venv."
}

$env:PYTHONPATH = $Root
Set-Location $Root
& $Python -m uvicorn app.servers.latentsync_server:app --host 127.0.0.1 --port $Port
