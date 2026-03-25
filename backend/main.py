"""
FastAPI backend server for the AI Video Generator.

Endpoints:
  POST /generate/image    - Generate image via ComfyUI (comfy_script)
  GET  /output/{filename} - Serve generated files
"""

import random
import shutil
import time
import traceback
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from config import get_comfy_input_dir, get_comfy_output_dir

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


class AnimateRequest(BaseModel):
    image_filename: str
    prompt: str
    seed: int | None = None


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
# Default I2V negative prompt (Chinese, from ComfyUI workflow)
# ---------------------------------------------------------------------------
DEFAULT_I2V_NEGATIVE_PROMPT = (
    "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，"
    "整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，"
    "画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，"
    "静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
)


# ---------------------------------------------------------------------------
# Video generation via ComfyUI (comfy_script) - Wan 2.2 I2V workflow
# ---------------------------------------------------------------------------
def _generate_video_comfy(
    image_path: Path,
    prompt: str,
    seed: int | None,
) -> VideoResponse:
    _ensure_comfy()
    from comfy_script.runtime import Workflow
    from comfy_script.runtime.nodes import (
        CLIPLoader,
        CLIPTextEncode,
        CreateVideo,
        KSamplerAdvanced,
        LoadImage,
        LoraLoaderModelOnly,
        ModelSamplingSD3,
        PrimitiveFloat,
        PrimitiveInt,
        SaveVideo,
        UNETLoader,
        VAEDecode,
        VAELoader,
        WanImageToVideo,
    )

    if seed is None:
        seed = random.randint(0, 2**63)

    video_prefix = f"{uuid.uuid4().hex[:8]}_video"

    # Submit workflow WITHOUT wait=True — the _watch retry loop in comfy_script
    # hangs indefinitely when SaveVideo output can't be opened as a PIL Image.
    # Instead, we poll for the output file below.
    with Workflow():
        steps = PrimitiveInt(4)
        cfg = PrimitiveFloat(1)
        boundary_step = PrimitiveInt(2)

        # Low noise model + LoRA
        model_low = UNETLoader(
            "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors", "default"
        )
        model_low = LoraLoaderModelOnly(
            model_low,
            "wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors",
            1.0,
        )
        model_low = ModelSamplingSD3(model_low, 5.0)

        # CLIP + conditioning
        clip = CLIPLoader(
            "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "wan", "default"
        )
        conditioning = CLIPTextEncode(prompt, clip)
        conditioning2 = CLIPTextEncode(DEFAULT_I2V_NEGATIVE_PROMPT, clip)

        # VAE + image encoding
        vae = VAELoader("wan_2.1_vae.safetensors")
        image, _ = LoadImage(image_path.name)
        positive, negative, latent = WanImageToVideo(
            conditioning, conditioning2, vae, 640, 640, 81, 1, None, image
        )

        # High noise model + LoRA
        model_high = UNETLoader(
            "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors", "default"
        )
        model_high = LoraLoaderModelOnly(
            model_high,
            "wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors",
            1.0,
        )
        model_high = ModelSamplingSD3(model_high, 5.0)

        # Dual-pass denoising: high noise (steps 0→2), then low noise (steps 2→4)
        latent = KSamplerAdvanced(
            model_high, "enable", seed, steps, cfg,
            "euler", "simple",
            positive, negative, latent,
            0, boundary_step, "enable",
        )
        latent = KSamplerAdvanced(
            model_low, "disable", 0, steps, cfg,
            "euler", "simple",
            positive, negative, latent,
            boundary_step, steps, "disable",
        )

        decoded = VAEDecode(latent, vae)
        video = CreateVideo(decoded, 16, None)
        SaveVideo(video, video_prefix, "auto", "auto")

    # Poll for the video file in ComfyUI's output dir, then copy to our output dir.
    # Since we don't use wait=True, the file may still be written when first found.
    # Wait for file size to stabilize before copying (moov atom is written last).
    comfy_output = get_comfy_output_dir()
    timeout = 600
    poll_interval = 5
    elapsed = 0
    video_file = None
    while elapsed < timeout:
        matches = sorted(
            comfy_output.glob(f"{video_prefix}*.mp4"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            video_file = matches[0]
            break
        print(f"[I2V] Waiting for video file '{video_prefix}*.mp4'... ({elapsed}s)")
        time.sleep(poll_interval)
        elapsed += poll_interval

    if video_file is None:
        raise RuntimeError(
            f"No video found with prefix '{video_prefix}' after {timeout}s. "
            "Check that ComfyUI completed the workflow."
        )

    # Wait for the file to finish writing (size stable for 3 consecutive checks)
    stable_count = 0
    last_size = -1
    while stable_count < 3 and elapsed < timeout:
        current_size = video_file.stat().st_size
        if current_size == last_size:
            stable_count += 1
        else:
            stable_count = 0
        last_size = current_size
        if stable_count < 3:
            time.sleep(2)
            elapsed += 2

    dest = OUTPUT_DIR / video_file.name
    shutil.copy2(video_file, dest)
    print(f"[I2V] Copied video ({last_size} bytes) to {dest}")

    return VideoResponse(video_url=f"/output/{dest.name}")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.post("/generate/ex-image", response_model=ImageResponse)
async def generate_image(req: GenerateImageRequest):
    """Generate an image from a text prompt via ComfyUI."""
    return await run_in_threadpool(_generate_image_comfy, req)


@app.post("/generate/animate", response_model=VideoResponse)
async def animate_image(req: AnimateRequest):
    """Animate a previously generated image using Wan 2.2 I2V via ComfyUI."""
    image_path = OUTPUT_DIR / req.image_filename
    if not image_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Image '{req.image_filename}' not found in output directory.",
        )

    # Copy image to ComfyUI input dir so LoadImage can find it
    comfy_input = get_comfy_input_dir()
    comfy_image_path = comfy_input / req.image_filename
    shutil.copy2(image_path, comfy_image_path)

    return await run_in_threadpool(
        _generate_video_comfy, comfy_image_path, req.prompt, req.seed
    )


@app.get("/output/{filename}")
async def serve_output(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@app.get("/health")
async def health():
    return {"status": "ok"}
