import os


def configure_hf_env(
    *,
    hf_endpoint: str | None = None,
    hf_home: str | None = None,
) -> None:
    """Apply Hugging Face env before any hub download (must run early at import)."""
    if hf_endpoint:
        os.environ["HF_ENDPOINT"] = hf_endpoint.rstrip("/")
    if hf_home:
        os.environ["HF_HOME"] = hf_home
