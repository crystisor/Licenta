from __future__ import annotations

import os
import threading

from PIL import Image

DEFAULT_COMFYUI_BASE_URL = os.getenv("COMFYUI_BASE_URL", "http://127.0.0.1:8000/")
DEFAULT_CHECKPOINT = "juggernautXL_ragnarokBy.safetensors"
DEFAULT_LORA1 = "dmd2_sdxl_4step_lora.safetensors"
DEFAULT_LORA2 = "dmd2_sdxl_4step_lora_fp16.safetensors"
DEFAULT_NEGATIVE_PROMPT = "cartoon, deformed"
DEFAULT_OUTPUT_PREFIX = "ComfyUI"
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024
DEFAULT_STEPS = 8
DEFAULT_CFG = 1.4
DEFAULT_SAMPLER = "lcm"
DEFAULT_SCHEDULER = "simple"
DEFAULT_DENOISE = 1

_runtime_loaded = False
_runtime_lock = threading.Lock()


def _ensure_runtime_loaded() -> None:
    global _runtime_loaded

    if _runtime_loaded:
        return

    with _runtime_lock:
        if _runtime_loaded:
            return

        from comfy_script.runtime import load

        load(DEFAULT_COMFYUI_BASE_URL)
        _runtime_loaded = True


def generate_images(
    prompt: str,
    negative_prompt: str = DEFAULT_NEGATIVE_PROMPT,
    num_images: int = 1,
    seed: int | None = None,
    output_prefix: str = DEFAULT_OUTPUT_PREFIX,
) -> list[Image.Image]:
    if not prompt or not prompt.strip():
        raise ValueError("Prompt must not be empty.")

    _ensure_runtime_loaded()

    from comfy_script.runtime import util
    from comfy_script.runtime.nodes import (
        CLIPTextEncode,
        CheckpointLoaderSimple,
        EmptyLatentImage,
        KSampler,
        LoraLoader,
        VAEDecode,
    )

    model, clip, vae = CheckpointLoaderSimple(DEFAULT_CHECKPOINT)
    model, clip = LoraLoader(model, clip, DEFAULT_LORA1, 0.5, 0.5)
    model, clip = LoraLoader(model, clip, DEFAULT_LORA2, 0.5, 0.5)

    positive_conditioning = CLIPTextEncode(prompt, clip)
    negative_conditioning = CLIPTextEncode(negative_prompt, clip)
    latent = EmptyLatentImage(DEFAULT_WIDTH, DEFAULT_HEIGHT, num_images)
    latent = KSampler(
        model,
        0 if seed is None else seed,
        DEFAULT_STEPS,
        DEFAULT_CFG,
        DEFAULT_SAMPLER,
        DEFAULT_SCHEDULER,
        positive_conditioning,
        negative_conditioning,
        latent,
        DEFAULT_DENOISE,
    )
    image = VAEDecode(latent, vae)

    result = util.save_image(image, output_prefix)
    images = [generated for generated in result.wait() if generated is not None]
    if not images:
        raise RuntimeError("ex.py did not return any generated images.")

    return images
