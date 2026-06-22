#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="${1:?用法: $0 <registry> [tag] [--gpu] [--push]}"
TAG="${2:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo latest)}"
GPU=false
PUSH=false
API_ONLY=false

for arg in "${@:3}"; do
  case "$arg" in
    --gpu) GPU=true ;;
    --push) PUSH=true ;;
    --api-only) API_ONLY=true ;;
  esac
done

API_IMAGE="${REGISTRY}/viralengine-api:${TAG}"
WORKER_IMAGE="${REGISTRY}/viralengine-media-worker:${TAG}"
WORKER_GPU_IMAGE="${REGISTRY}/viralengine-media-worker-gpu:${TAG}"

echo "Building API: ${API_IMAGE}"
docker build -t "${API_IMAGE}" "${ROOT}"

if [[ "${API_ONLY}" != true ]]; then
  echo "Building media-worker (CPU): ${WORKER_IMAGE}"
  docker build -t "${WORKER_IMAGE}" "${ROOT}/media-worker"
fi

if [[ "${GPU}" == true ]]; then
  echo "Building media-worker (GPU): ${WORKER_GPU_IMAGE}"
  docker build -f "${ROOT}/media-worker/Dockerfile.gpu" -t "${WORKER_GPU_IMAGE}" "${ROOT}/media-worker"
fi

if [[ "${PUSH}" == true ]]; then
  docker push "${API_IMAGE}"
  if [[ "${API_ONLY}" != true ]]; then
    docker push "${WORKER_IMAGE}"
  fi
  if [[ "${GPU}" == true ]]; then
    docker push "${WORKER_GPU_IMAGE}"
  fi
fi

cat <<EOF

Done. Set these in server .env:
API_IMAGE=${API_IMAGE}
EOF

if [[ "${API_ONLY}" != true ]]; then
  echo "MEDIA_WORKER_IMAGE=${WORKER_IMAGE}"
else
  echo "# 仅 API：服务器用 docker-compose.prod.api.yml，无需 MEDIA_WORKER_IMAGE"
fi

if [[ "${GPU}" == true ]]; then
  echo "MEDIA_WORKER_GPU_IMAGE=${WORKER_GPU_IMAGE}"
fi
