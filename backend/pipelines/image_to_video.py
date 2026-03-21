"""
Image-to-video pipeline - Wan 2.2 I2V (14B, FP8)

Reimplements the ComfyUI workflow:
  LoadImage -> ImageToVideo(Wan2.2) -> SaveVideo

Uses dual-denoiser architecture (high_noise + low_noise transformers)
with LightX2V 4-step LoRAs for accelerated inference.

Settings from workflow:
  - Resolution: 640x640, Frames: 81
  - Sampler: euler, Turbo mode: enabled
  - Models: FP8 quantized, CLIP: UMT5-XXL
"""

import os

import torch
from diffusers import AutoencoderKLWan, WanImageToVideoPipeline, WanTransformer3DModel
from diffusers.schedulers.scheduling_unipc_multistep import UniPCMultistepScheduler
from diffusers.utils import export_to_video
from PIL import Image

from backend.utils.model_loader import (
    WAN_HIGH_NOISE,
    WAN_LOW_NOISE,
    WAN_LORA_HIGH,
    WAN_LORA_LOW,
    WAN_VAE,
    get_device,
    resolve_model_path,
)

# Pipeline defaults matching the ComfyUI workflow
DEFAULT_WIDTH = 640
DEFAULT_HEIGHT = 640
DEFAULT_NUM_FRAMES = 81
DEFAULT_FPS = 16

# Base diffusers model ID for pipeline config (tokenizer, scheduler, etc.)
WAN_BASE_MODEL_ID = "Wan-AI/Wan2.1-I2V-14B-720P-Diffusers"

_pipeline: WanImageToVideoPipeline | None = None


def load_pipeline() -> WanImageToVideoPipeline:
    """
    Load the Wan 2.2 I2V pipeline with dual denoisers and LightX2V LoRAs.

    Wan 2.2 architecture:
      - transformer   = high noise denoiser
      - transformer_2 = low noise denoiser
    Both loaded from single .safetensors files (FP8).
    """
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    # 1. Load VAE (float32 for decoding quality)
    vae_path = resolve_model_path(WAN_VAE)
    print(f"[I2V] Loading VAE: {vae_path}")
    vae = AutoencoderKLWan.from_single_file(
        str(vae_path),
        torch_dtype=torch.float32,
    )

    # 2. Load high noise transformer (denoiser 1)
    high_noise_path = resolve_model_path(WAN_HIGH_NOISE)
    print(f"[I2V] Loading high noise transformer: {high_noise_path}")
    transformer = WanTransformer3DModel.from_single_file(
        str(high_noise_path),
        torch_dtype=torch.bfloat16,
    )

    # 3. Load low noise transformer (denoiser 2)
    low_noise_path = resolve_model_path(WAN_LOW_NOISE)
    print(f"[I2V] Loading low noise transformer: {low_noise_path}")
    transformer_2 = WanTransformer3DModel.from_single_file(
        str(low_noise_path),
        torch_dtype=torch.bfloat16,
    )

    # 4. Assemble pipeline from base config + custom components
    print("[I2V] Assembling pipeline...")
    pipe = WanImageToVideoPipeline.from_pretrained(
        WAN_BASE_MODEL_ID,
        vae=vae,
        transformer=transformer,
        transformer_2=transformer_2,
        torch_dtype=torch.bfloat16,
    )

    # 5. Configure scheduler - euler with flow shift for turbo mode
    pipe.scheduler = UniPCMultistepScheduler.from_config(
        pipe.scheduler.config,
        flow_shift=3.0,
    )

    # 6. Load LightX2V LoRAs for 4-step acceleration
    lora_high_path = resolve_model_path(WAN_LORA_HIGH)
    lora_low_path = resolve_model_path(WAN_LORA_LOW)

    print(f"[I2V] Loading high noise LoRA: {lora_high_path}")
    pipe.load_lora_weights(
        str(lora_high_path),
        adapter_name="lightx2v_high_noise",
    )

    print(f"[I2V] Loading low noise LoRA: {lora_low_path}")
    pipe.load_lora_weights(
        str(lora_low_path),
        adapter_name="lightx2v_low_noise",
        load_into_transformer_2=True,
    )

    pipe.set_adapters(["lightx2v_high_noise", "lightx2v_low_noise"])

    # 7. Move to device with memory optimization
    pipe.enable_model_cpu_offload()

    _pipeline = pipe
    print("[I2V] Pipeline loaded successfully")
    return _pipeline


def generate(
    image: Image.Image,
    prompt: str,
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
    num_frames: int = DEFAULT_NUM_FRAMES,
    seed: int | None = None,
    output_path: str = "output/video.mp4",
) -> str:
    """
    Generate a video from an image + motion prompt.

    Args:
        image: Starting image (PIL Image from T2I pipeline).
        prompt: Motion/scene description for the video.
        width: Output video width.
        height: Output video height.
        num_frames: Number of frames (must follow 4*k+1 formula).
        seed: Optional random seed for reproducibility.
        output_path: Destination path for the generated video.

    Returns:
        Path to the generated video file.
    """
    pipe = load_pipeline()

    image_resized = image.resize((width, height), Image.LANCZOS)

    generator = None
    if seed is not None:
        generator = torch.Generator(device=get_device()).manual_seed(seed)

    print(f"[I2V] Generating {num_frames} frames at {width}x{height}")
    print(f"[I2V] Prompt: '{prompt[:80]}...'")

    with torch.inference_mode():
        result = pipe(
            image=image_resized,
            prompt=prompt,
            height=height,
            width=width,
            num_frames=num_frames,
            guidance_scale=5.0,
            generator=generator,
        )

    frames = result.frames[0]

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    export_to_video(frames, output_path, fps=DEFAULT_FPS)

    print(f"[I2V] Video saved to {output_path}")
    return output_path


def unload_pipeline():
    """Free GPU memory by unloading the pipeline."""
    global _pipeline
    if _pipeline is not None:
        del _pipeline
        _pipeline = None
        torch.cuda.empty_cache()
        print("[I2V] Pipeline unloaded")
