# IndexTTS2 TTS 需使用其 venv（含 torchaudio/CUDA 与匹配的 transformers）
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Python = if ($env:INDEXTTS2_PYTHON) { $env:INDEXTTS2_PYTHON } else { "D:\workbench\talk\IndexTTS2\.venv\Scripts\python.exe" }

if (-not (Test-Path $Python)) {
    Write-Error "未找到 Python: $Python。请设置环境变量 INDEXTTS2_PYTHON 或安装 IndexTTS2 venv。"
}

Set-Location $Root
& $Python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
