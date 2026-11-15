import base64
import io
import os
import subprocess
import sys
from pathlib import Path

import gradio as gr
import spaces
import torch
from huggingface_hub import snapshot_download
from PIL import Image

# TRY ON / CatVTON MaskFree / ZeroGPU
# Public portfolio prototype. CatVTON is CC BY-NC-SA 4.0 and non-commercial.

SOURCE_DIR = Path("/tmp/catvton_source")
MODEL_ID = os.getenv("CATVTON_MODEL", "zhengchong/CatVTON-MaskFree")
BASE_MODEL = os.getenv("CATVTON_BASE_MODEL", "timbrooks/instruct-pix2pix")
WIDTH = int(os.getenv("CATVTON_WIDTH", "768"))
HEIGHT = int(os.getenv("CATVTON_HEIGHT", "1024"))
MAX_INPUT_BYTES = 15 * 1024 * 1024


def ensure_source():
    marker = SOURCE_DIR / "model" / "pipeline.py"
    if marker.exists():
        return
    SOURCE_DIR.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "git", "clone", "--depth", "1",
            "https://github.com/Zheng-Chong/CatVTON.git",
            str(SOURCE_DIR),
        ],
        check=True,
    )


ensure_source()
sys.path.insert(0, str(SOURCE_DIR))

from model.pipeline import CatVTONPix2PixPipeline
from utils import resize_and_crop, resize_and_padding


print("Downloading CatVTON MaskFree checkpoint...")
model_path = snapshot_download(repo_id=MODEL_ID)

print("Loading CatVTON MaskFree pipeline...")
pipeline = CatVTONPix2PixPipeline(
    base_ckpt=BASE_MODEL,
    attn_ckpt=model_path,
    attn_ckpt_version="mix-48k-1024",
    weight_dtype=torch.bfloat16,
    use_tf32=True,
    device="cuda",
)


def decode_data_url(value, label):
    if not value or not isinstance(value, str):
        raise gr.Error(f"Missing {label} image.")
    try:
        payload = value.split(",", 1)[1] if "," in value else value
        raw = base64.b64decode(payload, validate=True)
    except Exception as exc:
        raise gr.Error(f"Invalid {label} image data.") from exc
    if len(raw) > MAX_INPUT_BYTES:
        raise gr.Error(f"{label} image is too large.")
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise gr.Error(f"Unsupported {label} image format.") from exc


def encode_data_url(image):
    output = io.BytesIO()
    image.convert("RGB").save(output, format="JPEG", quality=92, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")


@spaces.GPU(duration=120)
def try_on(person_data, garment_data, garment_type="upper", steps=30, guidance=2.5, seed=-1):
    del garment_type  # MaskFree automatically infers the replacement area.
    person = resize_and_crop(decode_data_url(person_data, "person"), (WIDTH, HEIGHT))
    garment = resize_and_padding(decode_data_url(garment_data, "garment"), (WIDTH, HEIGHT))

    steps = max(10, min(40, int(steps)))
    guidance = max(1.0, min(5.0, float(guidance)))
    seed = int(seed)
    generator = None if seed < 0 else torch.Generator(device="cuda").manual_seed(seed)

    with torch.inference_mode():
        result = pipeline(
            image=person,
            condition_image=garment,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
        )[0]
    return encode_data_url(result)


def health():
    return "ok"


with gr.Blocks(title="TRY ON AI · CatVTON ZeroGPU") as demo:
    gr.Markdown(
        """
# TRY ON AI · 免费真实试穿后端
这是 TRY ON 苹果手机网页的开源 CatVTON ZeroGPU 后端。
上传内容仅用于本次推理，不在本应用中建立永久云端相册。
"""
    )
    with gr.Row():
        person_data = gr.Textbox(label="Person image (data URL)", visible=False)
        garment_data = gr.Textbox(label="Garment image (data URL)", visible=False)
        garment_type = gr.Dropdown(["upper", "lower", "overall"], value="upper", visible=False)
        steps = gr.Number(value=30, visible=False)
        guidance = gr.Number(value=2.5, visible=False)
        seed = gr.Number(value=-1, visible=False)
        result_data = gr.Textbox(label="Result data URL", visible=False)
    status = gr.Textbox(value="AI 后端已就绪，可由 TRY ON 网页调用。", interactive=False)
    generate = gr.Button("API 测试", visible=False)
    generate.click(
        try_on,
        inputs=[person_data, garment_data, garment_type, steps, guidance, seed],
        outputs=result_data,
        api_name="try_on",
    )
    demo.load(health, outputs=status, api_name="health")


if __name__ == "__main__":
    demo.queue(max_size=8, default_concurrency_limit=1).launch()
