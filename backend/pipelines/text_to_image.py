"""
Text-to-Image pipeline — SDXL (JuggernautXL Ragnarok)

Reimplements the ComfyUI workflow:
  LoadCheckpoint → CLIPTextEncode (pos/neg) → EmptyLatentImage → KSampler → VAEDecode

Settings from workflow:
  - Checkpoint: juggernautXL_ragnarokBy.safetensors
  - Sampler: dpmpp_2m_sde, scheduler: karras
  - Steps: 35, CFG: 3.5, Denoise: 1.0
  - Resolution: 832x1216, Batch: 10
  - Negative prompt: "cartoon, deformed"
"""

import torch
from diffusers import (
    StableDiffusionXLPipeline,
    DPMSolverSDEScheduler,
)
from PIL import Image

from backend.utils.model_loader import (
    resolve_model_path,
    get_device,
    get_dtype,
    SDXL_CHECKPOINT,
)

# Pipeline defaults matching the ComfyUI workflow
DEFAULT_NEGATIVE_PROMPT = "cartoon, deformed"
DEFAULT_STEPS = 35
DEFAULT_CFG = 3.5
DEFAULT_WIDTH = 832
DEFAULT_HEIGHT = 1216
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

    print(f"[T2I] Loading SDXL checkpoint: {checkpoint_path}")
    pipe = StableDiffusionXLPipeline.from_single_file(
        str(checkpoint_path),
        torch_dtype=dtype,
        use_safetensors=True,
    )

    # Configure the scheduler to match ComfyUI: dpmpp_2m_sde + karras
    pipe.scheduler = DPMSolverSDEScheduler.from_config(
        pipe.scheduler.config,
        use_karras_sigmas=True,
        noise_sampler_seed=None,
    )

    pipe = pipe.to(device)
    pipe.enable_attention_slicing()

    # Use xformers if available for memory efficiency
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("[T2I] xformers memory-efficient attention enabled")
    except Exception:
        pass

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
