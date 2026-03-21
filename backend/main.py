"""
FastAPI backend server for the AI Video Generator.

Endpoints:
  POST /generate          - Text-to-image only
  POST /generate/full     - Full pipeline: prompt -> image -> video
  POST /generate/image    - Text-to-image only (compat route)
  POST /generate/video    - Image-to-video only (accepts image upload)
  GET  /output/{filename} - Serve generated files
"""

import io
import traceback
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel

from backend.pipelines import image_to_video, text_to_image

app = FastAPI(title="AI Video Generator")

# Allow requests from Expo dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled errors and return them as JSON (with CORS)."""
    tb = traceback.format_exc()
    print(f"[ERROR] {request.url}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
    )


OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = "cartoon, deformed"
    motion_prompt: str | None = None
    num_images: int = 1
    image_index: int = 0  # Which of the batch images to use for video
    seed: int | None = None


class GenerateImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = "cartoon, deformed"
    num_images: int = 1
    seed: int | None = None


class ImageResponse(BaseModel):
    image_urls: list[str]


class VideoResponse(BaseModel):
    video_url: str


class FullResponse(BaseModel):
    image_urls: list[str]
    video_url: str


def _generate_full_sync(req: GenerateRequest) -> FullResponse:
    """Run the full prompt -> image -> video pipeline off the event loop."""
    images = text_to_image.generate(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        num_images=req.num_images,
        seed=req.seed,
    )

    image_filenames = []
    batch_id = uuid.uuid4().hex[:8]
    for i, img in enumerate(images):
        filename = f"{batch_id}_img_{i}.png"
        img.save(OUTPUT_DIR / filename)
        image_filenames.append(filename)

    # Free VRAM before switching to the heavier I2V pipeline.
    text_to_image.unload_pipeline()

    idx = max(0, min(req.image_index, len(images) - 1))
    selected_image = images[idx]

    video_filename = f"{batch_id}_video.mp4"
    image_to_video.generate(
        image=selected_image,
        prompt=req.motion_prompt or req.prompt,
        seed=req.seed,
        output_path=str(OUTPUT_DIR / video_filename),
    )

    image_to_video.unload_pipeline()

    return FullResponse(
        image_urls=[f"/output/{f}" for f in image_filenames],
        video_url=f"/output/{video_filename}",
    )


def _generate_image_sync(req: GenerateImageRequest) -> ImageResponse:
    """Run text-to-image generation off the event loop."""
    images = text_to_image.generate(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        num_images=req.num_images,
        seed=req.seed,
    )

    filenames = []
    batch_id = uuid.uuid4().hex[:8]
    for i, img in enumerate(images):
        filename = f"{batch_id}_img_{i}.png"
        img.save(OUTPUT_DIR / filename)
        filenames.append(filename)

    return ImageResponse(image_urls=[f"/output/{f}" for f in filenames])


def _generate_video_sync(
    pil_image: Image.Image,
    prompt: str,
    seed: int | None,
) -> VideoResponse:
    """Run image-to-video generation off the event loop."""
    video_filename = f"{uuid.uuid4().hex[:8]}_video.mp4"
    image_to_video.generate(
        image=pil_image,
        prompt=prompt,
        seed=seed,
        output_path=str(OUTPUT_DIR / video_filename),
    )

    return VideoResponse(video_url=f"/output/{video_filename}")


@app.post("/generate", response_model=ImageResponse)
async def generate(req: GenerateImageRequest):
    """Generate images from a text prompt."""
    return await run_in_threadpool(_generate_image_sync, req)


@app.post("/generate/full", response_model=FullResponse)
async def generate_full(req: GenerateRequest):
    """Full pipeline: text -> images -> select one -> video."""
    return await run_in_threadpool(_generate_full_sync, req)


@app.post("/generate/image", response_model=ImageResponse)
async def generate_image(req: GenerateImageRequest):
    """Generate images from a text prompt."""
    return await run_in_threadpool(_generate_image_sync, req)


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
    """Serve generated images and videos."""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@app.get("/health")
async def health():
    return {"status": "ok"}
