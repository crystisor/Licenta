"""
FastAPI backend server for the AI Video Generator.

Endpoints:
  POST /generate/image    - Generate image via ComfyUI (comfy_script)
  POST /generate/video    - Image-to-video only (accepts image upload)
  GET  /output/{filename} - Serve generated files
"""

import io
import random
import shutil
import traceback
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel

from backend.config import get_comfy_output_dir
from backend.pipelines import image_to_video

app = FastAPI(title="AI Video Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"[ERROR] {request.url}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
    )


OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

COMFY_URL = "http://127.0.0.1:8188/"

DEFAULT_NEGATIVE_PROMPT = (
    "low quality, worst quality, blurry, jpeg artifacts, bad anatomy, "
    "extra fingers, missing fingers, extra limbs, malformed hands, "
    "deformed face, cross-eyed, poorly drawn hands, poorly drawn face, "
    "duplicate body, cropped, watermark, text, logo, oversaturated, "
    "flat lighting, mutated anatomy"
)


# ---------------------------------------------------------------------------
# Lazy ComfyUI connection
# ---------------------------------------------------------------------------
_comfy_loaded = False


def _ensure_comfy():
    global _comfy_loaded
    if not _comfy_loaded:
        from comfy_script.runtime import load
        load(COMFY_URL)
        _comfy_loaded = True


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class GenerateImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = DEFAULT_NEGATIVE_PROMPT
    seed: int | None = None


class ImageResponse(BaseModel):
    image_urls: list[str]


class VideoResponse(BaseModel):
    video_url: str


# ---------------------------------------------------------------------------
# Image generation via ComfyUI (comfy_script)
# ---------------------------------------------------------------------------
def _generate_image_comfy(req: GenerateImageRequest) -> ImageResponse:
    _ensure_comfy()
    from comfy_script.runtime import Workflow
    from comfy_script.runtime.nodes import (
        CheckpointLoaderSimple,
        CLIPTextEncode,
        EmptyLatentImage,
        KSampler,
        LoraLoaderModelOnly,
        SaveImage,
        VAEDecode,
    )

    seed = req.seed if req.seed is not None else random.randint(0, 2**63)
    batch_id = uuid.uuid4().hex[:8]

    with Workflow(wait=True):
        model, clip, vae = CheckpointLoaderSimple(
            "juggernautXL_ragnarokBy.safetensors"
        )
        model = LoraLoaderModelOnly(
            model, "dmd2_sdxl_4step_lora.safetensors", 0.5
        )
        model = LoraLoaderModelOnly(
            model, "dmd2_sdxl_4step_lora_fp16.safetensors", 0.5
        )
        conditioning = CLIPTextEncode(req.prompt, clip)
        conditioning2 = CLIPTextEncode(req.negative_prompt, clip)
        latent = EmptyLatentImage(832, 1216, 1)
        latent = KSampler(
            model, seed, 8, 1.4,
            "lcm", "normal",
            conditioning, conditioning2,
            latent, 1,
        )
        image = VAEDecode(latent, vae)
        SaveImage(image, batch_id)

    # Collect saved images from ComfyUI output dir and copy to our output dir
    comfy_output = get_comfy_output_dir()
    saved = sorted(comfy_output.glob(f"{batch_id}_*.png"))
    if not saved:
        raise RuntimeError(
            f"No images found in ComfyUI output with prefix '{batch_id}'. "
            "Check that ComfyUI is running and the workflow completed."
        )

    filenames: list[str] = []
    for src in saved:
        dest = OUTPUT_DIR / src.name
        shutil.copy2(src, dest)
        filenames.append(src.name)

    return ImageResponse(image_urls=[f"/output/{f}" for f in filenames])


# ---------------------------------------------------------------------------
# Video generation (existing I2V pipeline)
# ---------------------------------------------------------------------------
def _generate_video_sync(
    pil_image: Image.Image,
    prompt: str,
    seed: int | None,
) -> VideoResponse:
    video_filename = f"{uuid.uuid4().hex[:8]}_video.mp4"
    image_to_video.generate(
        image=pil_image,
        prompt=prompt,
        seed=seed,
        output_path=str(OUTPUT_DIR / video_filename),
    )
    return VideoResponse(video_url=f"/output/{video_filename}")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.post("/generate/image", response_model=ImageResponse)
async def generate_image(req: GenerateImageRequest):
    """Generate an image from a text prompt via ComfyUI."""
    return await run_in_threadpool(_generate_image_comfy, req)


@app.post("/generate/video", response_model=VideoResponse)
async def generate_video(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    seed: int | None = Form(None),
):
    """Generate video from an uploaded image + motion prompt."""
    image_data = await image.read()
    pil_image = Image.open(io.BytesIO(image_data)).convert("RGB")
    return await run_in_threadpool(_generate_video_sync, pil_image, prompt, seed)


@app.get("/output/{filename}")
async def serve_output(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@app.get("/health")
async def health():
    return {"status": "ok"}
