"""
FastAPI backend server for the AI Video Generator.

Endpoints:
  POST /generate/ex-image - Generate image via ComfyUI + card metadata via Ollama
  POST /generate/animate  - Animate image via Wan 2.2 I2V
  GET  /output/{filename} - Serve generated files
"""

import base64
import json
import random
import shutil
import time
import traceback
import uuid
from pathlib import Path

import httpx
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


class CardMeta(BaseModel):
    title: str
    lore: str
    stats: dict[str, int]


class ImageResponse(BaseModel):
    image_urls: list[str]
    card_meta: CardMeta | None = None


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
# Card metadata generation via Ollama (Qwen2.5-VL 7B)
# ---------------------------------------------------------------------------
OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen2.5vl:7b"

CARD_META_SYSTEM_PROMPT = """You are a fantasy lore writer for a collectible card game.
Analyze the provided character image and return a JSON object with three fields.

## Output Format (strict JSON, no markdown)
{
  "title": "<character name>, <short epithet>",
  "lore": "<2-3 sentence fantasy flavor text>",
  "stats": {
    "Strength": <1-10>,
    "Magic": <1-10>,
    "Defense": <1-10>,
    "Agility": <1-10>
  }
}

## Rules for "title"
- Invent a fantasy-appropriate name (not from existing fiction)
- Add a short epithet after a comma: "Kaelith, the Ashborne"
- Keep under 35 characters total

## Rules for "lore"
- Write in third person, past or present tense
- Mystical, epic tone — like flavor text on a Magic: The Gathering card
- You MUST reference at least one specific visual detail from the image (armor, weapon, environment, expression, colors)
- Do NOT describe the image technically — narrate the character's story
- Keep under 50 words
- No quotes around the text

## Rules for "stats"
- Each stat is an integer from 1 to 10
- Base the stats on what you see: heavy armor = high Defense, staff/runes = high Magic, etc.
- Not every character is strong in everything — create contrast

## Examples

Input: An image of a dark elf in leather armor with twin daggers, crouching in a moonlit forest.
Output:
{
  "title": "Syvra, Fang of the Eclipse",
  "lore": "She moves between the silver birches like a rumor, her twin blades drinking moonlight. The forest remembers every throat they have opened.",
  "stats": {"Strength": 5, "Magic": 3, "Defense": 4, "Agility": 9}
}

Input: An image of a hulking orc shaman surrounded by glowing green spirits, holding a gnarled staff.
Output:
{
  "title": "Grul'thar, the Spiritbound",
  "lore": "The ancestors speak through him in tongues of emerald flame. Each spirit he summons carries the weight of a century's rage, and he bears them all without flinching.",
  "stats": {"Strength": 7, "Magic": 9, "Defense": 6, "Agility": 3}
}

The user's original prompt is provided for context, but focus on what you SEE in the image."""


def _fallback_meta(original_prompt: str) -> dict:
    """Return placeholder metadata when Ollama is unavailable."""
    return {
        "title": "The Unnamed",
        "lore": (
            f'A vision born from the words: "{original_prompt[:80]}". '
            "The full story remains unwritten."
        ),
        "stats": {
            "Strength": 5,
            "Magic": 5,
            "Defense": 5,
            "Agility": 5,
        },
    }


async def _generate_card_meta(image_path: Path, original_prompt: str) -> dict:
    """Call Ollama to generate card metadata from the image."""

    # Check for cached sidecar
    meta_path = image_path.with_suffix(".meta.json")
    if meta_path.exists():
        try:
            return json.loads(meta_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    image_b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": CARD_META_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Original prompt: {original_prompt}\n\n"
                    "Generate the card metadata for this character."
                ),
                "images": [image_b64],
            },
        ],
        "format": "json",
        "stream": False,
        "keep_alive": 0,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()

        content = response.json()["message"]["content"]
        parsed = json.loads(content)

        # Validate expected keys
        for key in ("title", "lore", "stats"):
            if key not in parsed:
                raise ValueError(f"Missing key in Ollama response: {key}")

        # Cache to sidecar file
        meta_path.write_text(json.dumps(parsed, indent=2))
        print(f"[LORE] Generated card meta for {image_path.name}: {parsed['title']}")
        return parsed

    except Exception as e:
        print(f"[LORE] Ollama card meta generation failed: {e}")
        return _fallback_meta(original_prompt)


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
    """Generate an image from a text prompt via ComfyUI, then generate card metadata via Ollama."""
    image_result = await run_in_threadpool(_generate_image_comfy, req)

    # Generate card metadata from the first image
    first_filename = image_result.image_urls[0].split("/")[-1]
    first_image_path = OUTPUT_DIR / first_filename
    meta = await _generate_card_meta(first_image_path, req.prompt)
    image_result.card_meta = CardMeta(**meta)

    return image_result


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
