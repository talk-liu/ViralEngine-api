#!/bin/sh
set -eu

check_dir() {
  name="$1"
  path="$2"
  if [ ! -d "$path" ]; then
    echo "[media-worker-gpu] ERROR: 缺少挂载目录 $name -> $path" >&2
    echo "请在 docker-compose.gpu.yml 中配置 ${name}_HOST_PATH 并挂载到容器。" >&2
    exit 1
  fi
}

check_dir "INDEXTTS2" "${INDEXTTS2_REPO_PATH:-/opt/indextts2}"
check_dir "FLASHHEAD" "${FLASHHEAD_REPO_PATH:-/opt/flashhead}"

if [ ! -f "${INDEXTTS2_MODEL_DIR:-/opt/indextts2/checkpoints}/config.yaml" ]; then
  echo "[media-worker-gpu] WARN: IndexTTS2 checkpoints 可能不完整（缺少 config.yaml）" >&2
fi

if [ ! -f "${FLASHHEAD_REPO_PATH:-/opt/flashhead}/generate_video.py" ]; then
  echo "[media-worker-gpu] ERROR: FlashHead 仓库不完整，缺少 generate_video.py" >&2
  exit 1
fi

exec "$@"
