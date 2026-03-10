import os
from pathlib import Path

import torch
from safetensors.torch import load_file

# Base directory for all model weights
MODELS_DIR = Path(os.environ.get(
    "MODELS_DIR",
    "/home/rheinsystems1/Desktop/AI/Comfyui/ComfyUI/models"
))

# --- Text-to-Image model paths (relative to MODELS_DIR) ---
SDXL_CHECKPOINT = "checkpoints/juggernautXL_ragnarokBy.safetensors"

# --- Image-to-Video model paths (relative to MODELS_DIR) ---
WAN_HIGH_NOISE = "diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors"
WAN_LOW_NOISE = "diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors"
WAN_CLIP = "text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors"
WAN_VAE = "vae_approx/wan_2.1_vae.safetensors"
WAN_LORA_HIGH = "loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors"
WAN_LORA_LOW = "loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors"


def resolve_model_path(relative_path: str) -> Path:
    """Resolve a model path relative to MODELS_DIR, fallback to recursive search."""
    # Try the exact relative path first
    full_path = MODELS_DIR / relative_path
    if full_path.exists():
        return full_path
    # Fallback: search by filename only
    filename = Path(relative_path).name
    for path in MODELS_DIR.rglob(filename):
        return path
    raise FileNotFoundError(
        f"Model '{relative_path}' not found in {MODELS_DIR}. "
        f"Expected at: {full_path}"
    )


def load_safetensors(filename: str, device: str = "cpu") -> dict[str, torch.Tensor]:
    """Load a .safetensors file and return the state dict."""
    path = resolve_model_path(filename)
    return load_file(str(path), device=device)


def get_device() -> torch.device:
    """Return the best available device."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def get_dtype() -> torch.dtype:
    """Return the optimal dtype for inference."""
    if torch.cuda.is_available():
        return torch.float16
    return torch.float32
