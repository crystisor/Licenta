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

from __future__ import annotations

import torch
from diffusers import LCMScheduler, StableDiffusionXLPipeline
from PIL import Image

from backend.debug_flow import TraceContext, record_context_trace
from backend.utils.model_loader import (
    SDXL_CHECKPOINT,
    SDXL_LORA,
    SDXL_LORA_FP16,
    get_device,
    get_dtype,
    resolve_model_path,
)

DEFAULT_NEGATIVE_PROMPT = "cartoon, deformed"
DEFAULT_STEPS = 8
DEFAULT_CFG = 1.4
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024
DEFAULT_BATCH_SIZE = 1

_pipeline: StableDiffusionXLPipeline | None = None


def load_pipeline(trace_context: TraceContext | None = None) -> StableDiffusionXLPipeline:
    """Load the SDXL pipeline from a single safetensors checkpoint."""
    global _pipeline
    if _pipeline is not None:
        record_context_trace(
            trace_context,
            "pipeline_load",
            "reused",
        )
        return _pipeline

    device = get_device()
    dtype = get_dtype()
    checkpoint_path = resolve_model_path(SDXL_CHECKPOINT)
    lora_path = resolve_model_path(SDXL_LORA)
    lora_fp16_path = resolve_model_path(SDXL_LORA_FP16)

    record_context_trace(
        trace_context,
        "pipeline_load",
        "started",
        {"checkpoint": str(checkpoint_path)},
    )
    pipe = StableDiffusionXLPipeline.from_single_file(
        str(checkpoint_path),
        torch_dtype=dtype,
        use_safetensors=True,
    )

    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)

    pipe.load_lora_weights(
        str(lora_path),
        adapter_name="dmd2_sdxl_pass_1",
    )
    pipe.load_lora_weights(
        str(lora_fp16_path),
        adapter_name="dmd2_sdxl_fp16_pass",
    )
    pipe.set_adapters(["dmd2_sdxl_pass_1", "dmd2_sdxl_fp16_pass"])

    pipe = pipe.to(device)

    try:
        pipe.enable_xformers_memory_efficient_attention()
        record_context_trace(
            trace_context,
            "pipeline_attention",
            "completed",
            {"mode": "xformers"},
        )
    except Exception:
        pipe.enable_attention_slicing()
        record_context_trace(
            trace_context,
            "pipeline_attention",
            "completed",
            {"mode": "attention_slicing"},
        )

    _pipeline = pipe
    record_context_trace(
        trace_context,
        "pipeline_load",
        "completed",
    )
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
    trace_context: TraceContext | None = None,
) -> list[Image.Image]:
    """
    Generate images from a text prompt using the SDXL pipeline.

    Returns a list of PIL Images (length = num_images).
    """
    pipe = load_pipeline(trace_context)

    generator = None
    if seed is not None:
        generator = torch.Generator(device=get_device()).manual_seed(seed)

    record_context_trace(
        trace_context,
        "generation",
        "started",
        {
            "numImages": num_images,
            "promptPreview": prompt[:80],
        },
    )
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
    record_context_trace(
        trace_context,
        "generation",
        "completed",
        {"imageCount": len(images)},
    )
    return images


def unload_pipeline(trace_context: TraceContext | None = None):
    """Free GPU memory by unloading the pipeline."""
    global _pipeline
    if _pipeline is not None:
        del _pipeline
        _pipeline = None
        torch.cuda.empty_cache()
        record_context_trace(
            trace_context,
            "pipeline_unload",
            "completed",
        )
