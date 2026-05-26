def generate_image(
    output_path,
    *,
    prompt: str,
    width: int = 1024,
    height: int = 1024,
) -> None:
    raise NotImplementedError(
        "文生图尚未启用。请接入云 API（通义/火山/OpenAI）或本地 Stable Diffusion。"
    )
