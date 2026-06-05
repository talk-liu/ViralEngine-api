from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parents[2]
_WORKER_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Worker 专用配置放 media-worker/.env，避免根目录 .env 编码问题
        env_file=_WORKER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    queue_key: str = Field(default="media-ai:jobs", alias="MEDIA_AI_QUEUE_KEY")
    media_ai_queue_prefix: str = Field(
        default="media-ai:jobs",
        alias="MEDIA_AI_QUEUE_PREFIX",
    )
    worker_queue_keys: str | None = Field(default=None, alias="WORKER_QUEUE_KEYS")
    latentsync_server_url: str | None = Field(
        default=None,
        alias="LATENTSYNC_SERVER_URL",
    )
    latentsync_server_port: int = Field(default=8102, alias="LATENTSYNC_SERVER_PORT")

    storage_local_path: str = Field(default="storage", alias="STORAGE_LOCAL_PATH")
    api_base_url: str = Field(default="http://localhost:3000/api", alias="API_BASE_URL")
    worker_secret: str = Field(
        default="change-me-media-worker-secret",
        alias="MEDIA_WORKER_SECRET",
    )

    worker_poll_timeout: int = Field(default=5, alias="WORKER_POLL_TIMEOUT")

    gpu_lock_key: str = Field(default="media-ai:gpu:lock", alias="GPU_LOCK_KEY")
    gpu_signal_key: str = Field(default="media-ai:gpu:signal", alias="GPU_SIGNAL_KEY")
    gpu_lock_ttl_seconds: int = Field(default=7200, alias="GPU_LOCK_TTL_SECONDS")
    gpu_wait_poll_seconds: float = Field(default=2.0, alias="GPU_WAIT_POLL_SECONDS")
    gpu_flashhead_required_mb: int = Field(default=8000, alias="GPU_FLASHHEAD_REQUIRED_MB")
    gpu_indextts2_required_mb: int = Field(default=6000, alias="GPU_INDEXTTS2_REQUIRED_MB")
    gpu_latentsync_required_mb: int = Field(default=14000, alias="GPU_LATENTSYNC_REQUIRED_MB")

    whisper_model: str = Field(default="small", alias="WHISPER_MODEL")
    whisper_device: str = Field(default="cpu", alias="WHISPER_DEVICE")
    whisper_compute_type: str = Field(default="int8", alias="WHISPER_COMPUTE_TYPE")
    # 本地已下载的 CTranslate2 模型目录，设置后优先于 whisper_model
    whisper_model_path: str | None = Field(default=None, alias="WHISPER_MODEL_PATH")
    whisper_local_only: bool = Field(default=False, alias="WHISPER_LOCAL_ONLY")
    # 国内网络建议 https://hf-mirror.com
    hf_endpoint: str | None = Field(default=None, alias="HF_ENDPOINT")
    hf_home: str | None = Field(default=None, alias="HF_HOME")

    # ASR：funasr | whisper | auto（先 FunASR，失败回退 Whisper）
    asr_engine: str = Field(default="auto", alias="ASR_ENGINE")
    funasr_model: str = Field(default="paraformer-zh", alias="FUNASR_MODEL")
    funasr_vad_model: str = Field(default="fsmn-vad", alias="FUNASR_VAD_MODEL")
    funasr_punc_model: str = Field(default="ct-punc", alias="FUNASR_PUNC_MODEL")
    funasr_device: str = Field(default="cpu", alias="FUNASR_DEVICE")
    funasr_batch_size_s: int = Field(default=300, alias="FUNASR_BATCH_SIZE_S")

    # LLM 高光识别（OpenAI 兼容接口，支持通义/DeepSeek 等）
    llm_api_base: str = Field(
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        alias="LLM_API_BASE",
    )
    llm_api_key: str = Field(default="", alias="LLM_API_KEY")
    llm_model: str = Field(default="qwen-plus", alias="LLM_MODEL")
    llm_timeout: float = Field(default=120.0, alias="LLM_TIMEOUT")

    # IndexTTS2 语音合成（需本机已下载模型，见 INDEXTTS2_REPO_PATH）
    indextts2_repo_path: str | None = Field(default=None, alias="INDEXTTS2_REPO_PATH")
    indextts2_model_dir: str | None = Field(default=None, alias="INDEXTTS2_MODEL_DIR")
    indextts2_device: str | None = Field(default=None, alias="INDEXTTS2_DEVICE")
    indextts2_use_fp16: bool = Field(default=False, alias="INDEXTTS2_USE_FP16")
    indextts2_use_deepspeed: bool = Field(default=False, alias="INDEXTTS2_USE_DEEPSPEED")
    indextts2_use_cuda_kernel: bool = Field(
        default=False,
        alias="INDEXTTS2_USE_CUDA_KERNEL",
    )
    # Docker GPU 模式下指向 /opt/venvs/indextts2/bin/python；本地留空则进程内推理
    indextts2_python: str | None = Field(default=None, alias="INDEXTTS2_PYTHON")

    # SoulX FlashHead Pro 口播数字人（见 FLASHHEAD_REPO_PATH）
    flashhead_repo_path: str | None = Field(default=None, alias="FLASHHEAD_REPO_PATH")
    flashhead_ckpt_dir: str | None = Field(default=None, alias="FLASHHEAD_CKPT_DIR")
    flashhead_wav2vec_dir: str | None = Field(default=None, alias="FLASHHEAD_WAV2VEC_DIR")
    flashhead_python: str | None = Field(default=None, alias="FLASHHEAD_PYTHON")

    # LatentSync 视频对口型（见 LATENTSYNC_REPO_PATH）
    latentsync_repo_path: str | None = Field(default=None, alias="LATENTSYNC_REPO_PATH")
    latentsync_ckpt_path: str | None = Field(default=None, alias="LATENTSYNC_CKPT_PATH")
    latentsync_unet_config: str | None = Field(
        default=None,
        alias="LATENTSYNC_UNET_CONFIG",
    )
    latentsync_python: str | None = Field(default=None, alias="LATENTSYNC_PYTHON")

    @field_validator("storage_local_path")
    @classmethod
    def resolve_storage_local_path(cls, value: str) -> str:
        path = Path(value)
        if path.is_absolute():
            return str(path)
        return str((_ROOT_DIR / path).resolve())

    @field_validator(
        "indextts2_repo_path",
        "indextts2_model_dir",
        "flashhead_repo_path",
        "flashhead_ckpt_dir",
        "flashhead_wav2vec_dir",
        "flashhead_python",
        "indextts2_python",
        "latentsync_repo_path",
        "latentsync_ckpt_path",
        "latentsync_unet_config",
        "latentsync_python",
    )
    @classmethod
    def resolve_optional_absolute_path(cls, value: str | None) -> str | None:
        if not value:
            return None
        path = Path(value)
        if path.is_absolute():
            return str(path.resolve())
        return str(path.resolve())


settings = Settings()

from app.hf_env import configure_hf_env

configure_hf_env(
    hf_endpoint=settings.hf_endpoint,
    hf_home=settings.hf_home,
)
