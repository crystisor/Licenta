from pathlib import Path
import platform

LINUX_MODELS_DIR = Path("/home/rheinsystems1/Desktop/AI/Comfyui/ComfyUI/models")
WINDOWS_MODELS_DIR = Path(r"F:\Comfy\models")

LINUX_COMFY_OUTPUT = Path("/home/rheinsystems1/Desktop/AI/Comfyui/ComfyUI/output")
WINDOWS_COMFY_OUTPUT = Path(r"F:\Comfy\output")

MODEL_ROOTS = {
    "linux": LINUX_MODELS_DIR,
    "windows": WINDOWS_MODELS_DIR,
}

COMFY_OUTPUT_ROOTS = {
    "linux": LINUX_COMFY_OUTPUT,
    "windows": WINDOWS_COMFY_OUTPUT,
}


def get_model_profile() -> str:
    """Return the active model profile based on the current operating system."""
    system_name = platform.system().lower()
    if system_name == "linux":
        return "linux"
    if system_name == "windows":
        return "windows"

    raise RuntimeError(
        f"Unsupported operating system '{platform.system()}' for model path selection."
    )


def get_models_dir() -> Path:
    """Return the base models directory for the active machine profile."""
    return MODEL_ROOTS[get_model_profile()]


def get_comfy_output_dir() -> Path:
    """Return the ComfyUI output directory for the active machine profile."""
    return COMFY_OUTPUT_ROOTS[get_model_profile()]
