import subprocess
from pathlib import Path

POSITION_MAP = {
    "top-left": "x=10:y=10",
    "top-right": "x=w-tw-10:y=10",
    "bottom-left": "x=10:y=h-th-10",
    "bottom-right": "x=w-tw-10:y=h-th-10",
    "center": "x=(w-tw)/2:y=(h-th)/2",
}


def apply_watermark(
    input_path: Path,
    output_path: Path,
    *,
    text: str,
    position: str = "bottom-right",
    font_size: int = 24,
) -> None:
    coords = POSITION_MAP.get(position, POSITION_MAP["bottom-right"])
    escaped_text = text.replace(":", r"\:").replace("'", r"'\''")
    filter_expr = (
        f"drawtext=text='{escaped_text}':fontsize={font_size}:fontcolor=white:"
        f"box=1:boxcolor=black@0.45:boxborderw=8:{coords}"
    )

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-vf",
        filter_expr,
        "-codec:a",
        "copy",
        str(output_path),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() or "ffmpeg 执行失败"
        raise RuntimeError(stderr)
