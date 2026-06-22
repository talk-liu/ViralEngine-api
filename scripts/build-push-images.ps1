param(
    [Parameter(Mandatory = $true)]
    [string]$Registry,

    [string]$Tag = "",

    [switch]$Gpu,

    [switch]$ApiOnly,

    [switch]$Push
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not $Tag) {
    $Tag = (git -C $Root rev-parse --short HEAD 2>$null)
    if (-not $Tag) {
        $Tag = "latest"
    }
}

$ApiImage = "${Registry}/viralengine-api:${Tag}"
$WorkerImage = "${Registry}/viralengine-media-worker:${Tag}"
$WorkerGpuImage = "${Registry}/viralengine-media-worker-gpu:${Tag}"

Write-Host "Building API image: $ApiImage"
docker build -t $ApiImage $Root
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $ApiOnly) {
    Write-Host "Building media-worker (CPU) image: $WorkerImage"
    docker build -t $WorkerImage (Join-Path $Root "media-worker")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if ($Gpu) {
    Write-Host "Building media-worker (GPU) image: $WorkerGpuImage"
    docker build -f (Join-Path $Root "media-worker/Dockerfile.gpu") -t $WorkerGpuImage (Join-Path $Root "media-worker")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if ($Push) {
    Write-Host "Pushing $ApiImage"
    docker push $ApiImage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if (-not $ApiOnly) {
        Write-Host "Pushing $WorkerImage"
        docker push $WorkerImage
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    if ($Gpu) {
        Write-Host "Pushing $WorkerGpuImage"
        docker push $WorkerGpuImage
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}

Write-Host ""
Write-Host "Done. Set these in server .env:"
Write-Host "API_IMAGE=$ApiImage"
if (-not $ApiOnly) {
    Write-Host "MEDIA_WORKER_IMAGE=$WorkerImage"
} else {
    Write-Host "(API only) Use docker-compose.prod.api.yml on server; MEDIA_WORKER_IMAGE not required"
}
if ($Gpu) {
    Write-Host "MEDIA_WORKER_GPU_IMAGE=$WorkerGpuImage"
}
