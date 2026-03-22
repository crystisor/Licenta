"""
FastAPI backend server for AI media generation.

Endpoints:
  POST /generate          - Text-to-image only
  POST /generate/full     - Full pipeline: prompt -> image -> video
  POST /generate/image    - Text-to-image only (compat route)
  POST /generate/ex-image - ex.py image generation route
  POST /generate/video    - Image-to-video only (accepts image upload)
  GET  /output/{filename} - Serve generated files
"""

import io
import importlib.util
import logging
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel

from backend.debug_flow import (
    DEBUG_TRACE_HEADER,
    REQUEST_ID_HEADER,
    build_trace_header,
    make_trace_context,
    record_context_trace,
    record_trace,
)
from backend.pipelines import image_to_video, text_to_image

app = FastAPI(title="AI Media Backend")
logger = logging.getLogger("backend.main")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[REQUEST_ID_HEADER, DEBUG_TRACE_HEADER],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled errors and return them as JSON (with CORS)."""
    request_id = getattr(request.state, "request_id", None) or request.headers.get(REQUEST_ID_HEADER)
    logger.exception("Unhandled error for %s", request.url)

    response = JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )
    if request_id:
        response.headers[REQUEST_ID_HEADER] = request_id
        trace_header = build_trace_header(request_id)
        if trace_header:
            response.headers[DEBUG_TRACE_HEADER] = trace_header
    return response


OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)
_EX_MODULE = None


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = "cartoon, deformed"
    motion_prompt: str | None = None
    num_images: int = 1
    image_index: int = 0
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


def _get_or_create_request_id(request: Request) -> str:
    return request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex


def _attach_trace_headers(response: Response, request_id: str) -> None:
    response.headers[REQUEST_ID_HEADER] = request_id
    trace_header = build_trace_header(request_id)
    if trace_header:
        response.headers[DEBUG_TRACE_HEADER] = trace_header


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


def _generate_image_sync(
    req: GenerateImageRequest,
    trace_context: dict[str, str] | None = None,
) -> ImageResponse:
    """Run text-to-image generation off the event loop."""
    record_context_trace(
        trace_context,
        "pipeline_start",
        "started",
        {
            "numImages": req.num_images,
            "seed": req.seed,
        },
    )

    images = text_to_image.generate(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        num_images=req.num_images,
        seed=req.seed,
        trace_context=trace_context,
    )

    filenames = []
    batch_id = uuid.uuid4().hex[:8]
    for i, img in enumerate(images):
        filename = f"{batch_id}_img_{i}.png"
        img.save(OUTPUT_DIR / filename)
        filenames.append(filename)
        record_context_trace(
            trace_context,
            "image_saved",
            "completed",
            {
                "filename": filename,
                "index": i,
            },
        )

    return ImageResponse(image_urls=[f"/output/{f}" for f in filenames])


def _get_ex_module():
    global _EX_MODULE

    if _EX_MODULE is not None:
        return _EX_MODULE

    ex_path = Path(__file__).resolve().parents[1] / "ex.py"
    spec = importlib.util.spec_from_file_location("licenta_ex_module", ex_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load ex.py from {ex_path}.")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "generate_images") or not callable(module.generate_images):
        raise RuntimeError(
            f"ex.py must define a callable generate_images(...) function. Loaded module: {ex_path}"
        )
    _EX_MODULE = module
    return module


def _generate_ex_image_sync(
    req: GenerateImageRequest,
    trace_context: dict[str, str] | None = None,
) -> ImageResponse:
    """Run the ex.py ComfyScript image flow off the event loop."""
    record_context_trace(
        trace_context,
        "pipeline_start",
        "started",
        {
            "engine": "ex.py",
            "numImages": req.num_images,
            "seed": req.seed,
        },
    )

    ex_module = _get_ex_module()
    images = ex_module.generate_images(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        num_images=req.num_images,
        seed=req.seed,
        output_prefix=f"fastapi_{uuid.uuid4().hex[:8]}",
    )

    filenames = []
    batch_id = uuid.uuid4().hex[:8]
    for i, img in enumerate(images):
        filename = f"{batch_id}_ex_img_{i}.png"
        img.save(OUTPUT_DIR / filename)
        filenames.append(filename)
        record_context_trace(
            trace_context,
            "image_saved",
            "completed",
            {
                "filename": filename,
                "index": i,
                "engine": "ex.py",
            },
        )

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


async def _handle_image_generation(
    req: GenerateImageRequest,
    request: Request,
    response: Response,
    image_generator=_generate_image_sync,
) -> ImageResponse:
    request_id = _get_or_create_request_id(request)
    request.state.request_id = request_id
    trace_context = make_trace_context(request_id, request.url.path)

    record_trace(
        request_id,
        "backend",
        "request_received",
        "started",
        {
            "route": request.url.path,
            "numImages": req.num_images,
        },
        always_log=True,
    )
    record_context_trace(
        trace_context,
        "validation_handoff",
        "completed",
        {
            "hasNegativePrompt": bool(req.negative_prompt),
            "seed": req.seed,
        },
    )

    try:
        result = await run_in_threadpool(image_generator, req, trace_context)
    except Exception as exc:
        record_trace(
            request_id,
            "backend",
            "request_failed",
            "error",
            {"error": str(exc)},
            always_log=True,
        )
        raise

    record_trace(
        request_id,
        "backend",
        "response_created",
        "completed",
        {"imageCount": len(result.image_urls)},
        always_log=True,
    )
    _attach_trace_headers(response, request_id)
    return result


@app.post("/generate", response_model=ImageResponse)
async def generate(req: GenerateImageRequest, request: Request, response: Response):
    """Generate images from a text prompt."""
    return await _handle_image_generation(req, request, response)


@app.post("/generate/full", response_model=FullResponse)
async def generate_full(req: GenerateRequest):
    """Full pipeline: text -> images -> select one -> video."""
    return await run_in_threadpool(_generate_full_sync, req)


@app.post("/generate/image", response_model=ImageResponse)
async def generate_image(req: GenerateImageRequest, request: Request, response: Response):
    """Generate images from a text prompt."""
    return await _handle_image_generation(req, request, response)


@app.post("/generate/ex-image", response_model=ImageResponse)
async def generate_ex_image(req: GenerateImageRequest, request: Request, response: Response):
    """Generate images from ex.py."""
    return await _handle_image_generation(req, request, response, _generate_ex_image_sync)


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
