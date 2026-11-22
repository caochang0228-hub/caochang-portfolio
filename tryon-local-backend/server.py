import base64
import io
import os
import sys
import threading
from pathlib import Path

os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True,max_split_size_mb:128")

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from PIL import Image, ImageOps
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
CATVTON_HOME = Path(os.environ.get("CATVTON_HOME", ROOT / "vendor" / "CatVTON")).resolve()
if not CATVTON_HOME.exists():
    raise RuntimeError("CatVTON 尚未安装，请先运行 install_windows.bat")
sys.path.insert(0, str(CATVTON_HOME))

from model.cloth_masker import AutoMasker
from model.pipeline import CatVTONPipeline
from utils import resize_and_crop, resize_and_padding

def gpu_profile():
    if not torch.cuda.is_available():
        return {"vram_gb": 0.0, "width": 0, "height": 0, "steps": 0, "mode": "cuda-unavailable"}
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    if vram_gb >= 7.5:
        defaults = (768, 1024, 24, "quality-8gb")
    elif vram_gb >= 5.5:
        defaults = (576, 768, 22, "balanced-6gb")
    else:
        defaults = (512, 672, 18, "memory-safe-4gb")
    width = int(os.environ.get("TRYON_WIDTH", defaults[0]))
    height = int(os.environ.get("TRYON_HEIGHT", defaults[1]))
    steps = int(os.environ.get("TRYON_STEPS", defaults[2]))
    return {"vram_gb": round(vram_gb, 1), "width": width, "height": height, "steps": steps, "mode": defaults[3]}


GPU_PROFILE = gpu_profile()
WIDTH = GPU_PROFILE["width"]
HEIGHT = GPU_PROFILE["height"]
STEPS = GPU_PROFILE["steps"]
MODEL_ID = os.environ.get("CATVTON_MODEL", "zhengchong/CatVTON")
BASE_MODEL = os.environ.get("CATVTON_BASE_MODEL", "booksforcharlie/stable-diffusion-inpainting")

app = FastAPI(title="TRY ON Local 8GB Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://u2zqev.com.cn", "http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r"https://.*\.ts\.net",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_lock = threading.Lock()
_pipeline = None
_automasker = None
_pose_model = None
_object_model = None
_segment_model = None


def load_image(data: bytes) -> Image.Image:
    try:
        return ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"BAD_IMAGE: {exc}") from exc


def ensure_validation_models():
    global _pose_model, _object_model
    if _pose_model is None:
        _pose_model = YOLO("yolov8n-pose.pt")
    if _object_model is None:
        _object_model = YOLO("yolov8n.pt")


def ensure_segment_model():
    global _segment_model
    if _segment_model is None:
        _segment_model = YOLO("yolov8n-seg.pt")


def overlap_ratio(box_a, box_b):
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    inter = max(0, min(ax2, bx2) - max(ax1, bx1)) * max(0, min(ay2, by2) - max(ay1, by1))
    area = max(1, (bx2 - bx1) * (by2 - by1))
    return inter / area


def inspect_person(image: Image.Image):
    ensure_validation_models()
    array = np.asarray(image)
    pose_result = _pose_model.predict(array, device="cpu", imgsz=640, conf=0.25, verbose=False)[0]
    if pose_result.boxes is None or len(pose_result.boxes) != 1:
        return {"usable": False, "error_code": "SINGLE_PERSON_REQUIRED", "message": "请只保留一位完整人物"}
    person_box = pose_result.boxes.xyxy[0].cpu().numpy().tolist()
    keypoints = pose_result.keypoints.conf[0].cpu().numpy() if pose_result.keypoints is not None else np.zeros(17)
    coordinates = pose_result.keypoints.xy[0].cpu().numpy() if pose_result.keypoints is not None else np.zeros((17, 2))
    required = [0, 1, 2, 5, 6, 11, 12, 13, 14, 15, 16]
    missing = [index for index in required if index >= len(keypoints) or float(keypoints[index]) < 0.20]
    if missing:
        return {"usable": False, "error_code": "BODY_INCOMPLETE", "message": "肩、髋、膝或脚踝没有完整识别，请上传头脚完整的正面照"}
    person_width = max(1.0, person_box[2] - person_box[0])
    shoulder_width = abs(float(coordinates[6][0]) - float(coordinates[5][0]))
    if shoulder_width / person_width < 0.22:
        return {"usable": False, "error_code": "BODY_NOT_FRONTAL", "message": "人物角度偏侧，请面向镜头正面站立后重新拍摄"}

    object_result = _object_model.predict(array, device="cpu", imgsz=640, conf=0.22, verbose=False)[0]
    blockers = {"backpack", "handbag", "suitcase", "umbrella"}
    detected = []
    if object_result.boxes is not None:
        for cls_id, box in zip(object_result.boxes.cls.cpu().numpy(), object_result.boxes.xyxy.cpu().numpy()):
            name = object_result.names[int(cls_id)]
            if name in blockers and overlap_ratio(person_box, box.tolist()) > 0.12:
                detected.append(name)
    if detected:
        return {"usable": False, "error_code": "BODY_OCCLUDED", "message": "检测到包袋或物体遮挡身体，请移开后重新拍摄", "objects": detected}
    return {"usable": True, "error_code": "", "message": "人体识别通过", "box": person_box}


def standardize_avatar(image: Image.Image) -> Image.Image:
    ensure_segment_model()
    result = _segment_model.predict(np.asarray(image), device="cpu", imgsz=640, conf=0.25, verbose=False)[0]
    if result.boxes is None or result.masks is None:
        raise HTTPException(422, {"error_code": "PERSON_MASK_MISSING", "message": "没有识别到完整人物轮廓"})
    person_indices = [index for index, cls_id in enumerate(result.boxes.cls.cpu().numpy()) if int(cls_id) == 0]
    if len(person_indices) != 1:
        raise HTTPException(422, {"error_code": "SINGLE_PERSON_REQUIRED", "message": "请只保留一位完整人物"})
    mask_array = result.masks.data[person_indices[0]].cpu().numpy()
    mask = Image.fromarray(np.uint8(mask_array * 255), mode="L").resize(image.size, Image.Resampling.BILINEAR)
    mask_np = np.asarray(mask) > 96
    ys, xs = np.where(mask_np)
    if not len(xs) or not len(ys):
        raise HTTPException(422, {"error_code": "PERSON_MASK_MISSING", "message": "人物轮廓不完整，请更换照片"})
    rgb = np.asarray(image)
    cutout = np.where(mask_np[..., None], rgb, 255).astype(np.uint8)
    min_x, max_x, min_y, max_y = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    pad_x = int((max_x - min_x) * 0.08)
    pad_y = int((max_y - min_y) * 0.04)
    crop_box = (
        max(0, min_x - pad_x),
        max(0, min_y - pad_y),
        min(image.width, max_x + pad_x + 1),
        min(image.height, max_y + pad_y + 1),
    )
    person = Image.fromarray(cutout, mode="RGB").crop(crop_box)
    person.thumbnail((int(WIDTH * 0.90), int(HEIGHT * 0.94)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "white")
    canvas.paste(person, ((WIDTH - person.width) // 2, (HEIGHT - person.height) // 2))
    return canvas


def ensure_catvton():
    global _pipeline, _automasker
    if _pipeline is not None:
        return
    if not torch.cuda.is_available():
        raise RuntimeError("未检测到 NVIDIA CUDA 显卡")
    repo_path = snapshot_download(repo_id=MODEL_ID)
    _pipeline = CatVTONPipeline(
        base_ckpt=BASE_MODEL,
        attn_ckpt=repo_path,
        attn_ckpt_version="mix",
        weight_dtype=torch.float16,
        use_tf32=True,
        device="cuda",
    )
    _automasker = AutoMasker(
        densepose_ckpt=os.path.join(repo_path, "DensePose"),
        schp_ckpt=os.path.join(repo_path, "SCHP"),
        device="cpu",
    )


def encode_png(image: Image.Image):
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")


@app.get("/health")
def health():
    return {
        "ready": torch.cuda.is_available(),
        "cuda": torch.cuda.is_available(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "vram_gb": GPU_PROFILE["vram_gb"],
        "resolution": [WIDTH, HEIGHT],
        "steps": STEPS,
        "mode": GPU_PROFILE["mode"],
    }


@app.post("/validate")
async def validate(person: UploadFile = File(...)):
    image = load_image(await person.read())
    return inspect_person(image)


@app.post("/avatar")
async def avatar(person: UploadFile = File(...)):
    image = load_image(await person.read())
    quality = inspect_person(image)
    if not quality["usable"]:
        raise HTTPException(422, quality)
    return {"ok": True, "image": encode_png(standardize_avatar(image)), "quality": quality}


@app.post("/tryon")
async def tryon(
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
    category: str = Form("upper"),
    seed: int = Form(42),
):
    person_image = load_image(await person.read())
    garment_image = load_image(await garment.read())
    quality = inspect_person(person_image)
    if not quality["usable"]:
        raise HTTPException(422, quality)
    cloth_type = {"upper": "upper", "lower": "lower", "dress": "overall", "overall": "overall"}.get(category, "upper")
    with _lock:
        try:
            ensure_catvton()
            person_image = resize_and_crop(person_image, (WIDTH, HEIGHT))
            garment_image = resize_and_padding(garment_image, (WIDTH, HEIGHT))
            mask = _automasker(person_image, cloth_type)["mask"]
            generator = torch.Generator(device="cuda").manual_seed(seed)
            with torch.inference_mode(), torch.autocast("cuda", dtype=torch.float16):
                result = _pipeline(
                    image=person_image,
                    condition_image=garment_image,
                    mask=mask,
                    num_inference_steps=STEPS,
                    guidance_scale=2.5,
                    generator=generator,
                )[0]
            return {"ok": True, "image": encode_png(result), "category": cloth_type}
        except torch.cuda.OutOfMemoryError as exc:
            torch.cuda.empty_cache()
            raise HTTPException(507, "GPU_OUT_OF_MEMORY: 请关闭其他占用显存的软件后重试") from exc
        finally:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

