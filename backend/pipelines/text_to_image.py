"""
Text-to-image pipeline - SDXL (JuggernautXL Ragnarok)

Reimplements the ComfyUI workflow:
  LoadCheckpoint -> CLIPTextEncode (pos/neg) -> EmptyLatentImage -> KSampler -> VAEDecode

Settings from workflow:
  - Checkpoint: juggernautXL_ragnarokBy.safetensors
  - Sampler: lcm, scheduler: normal
  - Steps: 35, CFG: 3.5, Denoise: 1.0
  - Resolution: 832x1216, Batch: 10
  - Negative prompt: "cartoon, deformed"
"""

import torch
from diffusers import LCMScheduler, StableDiffusionXLPipeline
from PIL import Image

from backend.utils.model_loader import (
    SDXL_CHECKPOINT,
    SDXL_LORA,
    get_device,
    get_dtype,
    resolve_model_path,
)

# Pipeline defaults matching the ComfyUI workflow
DEFAULT_NEGATIVE_PROMPT = "cartoon, deformed"
DEFAULT_STEPS = 8
DEFAULT_CFG = 1.4
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024
DEFAULT_BATCH_SIZE = 1

_pipeline: StableDiffusionXLPipeline | None = None


def load_pipeline() -> StableDiffusionXLPipeline:
    """Load the SDXL pipeline from a single safetensors checkpoint."""
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    device = get_device()
    dtype = get_dtype()
    checkpoint_path = resolve_model_path(SDXL_CHECKPOINT)
    lora_path = resolve_model_path(SDXL_LORA)

    print(f"[T2I] Loading SDXL checkpoint: {checkpoint_path}")
    pipe = StableDiffusionXLPipeline.from_single_file(
        str(checkpoint_path),
        torch_dtype=dtype,
        use_safetensors=True,
    )

    # Configure the scheduler to match ComfyUI: lcm + normal
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)

    # Mirror the ComfyUI workflow, which applies the same LoRA twice in sequence.
    print(f"[T2I] Loading SDXL LoRA pass 1: {lora_path}")
    pipe.load_lora_weights(
        str(lora_path),
        adapter_name="dmd2_sdxl_pass_1",
    )
    print(f"[T2I] Loading SDXL LoRA pass 2: {lora_path}")
    pipe.load_lora_weights(
        str(lora_path),
        adapter_name="dmd2_sdxl_pass_2",
    )
    pipe.set_adapters(["dmd2_sdxl_pass_1", "dmd2_sdxl_pass_2"])

    pipe = pipe.to(device)

    # Prefer xformers when available; attention slicing can slow inference down.
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("[T2I] xformers memory-efficient attention enabled")
    except Exception:
        pipe.enable_attention_slicing()
        print("[T2I] Attention slicing enabled")

    _pipeline = pipe
    print("[T2I] Pipeline loaded successfully")
    return _pipeline


def generate(
    prompt: str,
    negative_prompt: str = DEFAULT_NEGATIVE_PROMPT,
    num_images: int = DEFAULT_BATCH_SIZE,
    steps: int = DEFAULT_STEPS,
    cfg_scale: float = DEFAULT_CFG,
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
    seed: int | None = None,
) -> list[Image.Image]:
    """
    Generate images from a text prompt using the SDXL pipeline.

    Returns a list of PIL Images (length = num_images).
    """
    pipe = load_pipeline()

    generator = None
    if seed is not None:
        generator = torch.Generator(device=get_device()).manual_seed(seed)

    print(f"[T2I] Generating {num_images} images: '{prompt[:60]}...'")
    with torch.inference_mode():
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_images_per_prompt=num_images,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            width=width,
            height=height,
            generator=generator,
        )

    images = result.images
    print(f"[T2I] Generated {len(images)} images")
    return images


def unload_pipeline():
    """Free GPU memory by unloading the pipeline."""
    global _pipeline
    if _pipeline is not None:
        del _pipeline
        _pipeline = None
        torch.cuda.empty_cache()
        print("[T2I] Pipeline unloaded")
