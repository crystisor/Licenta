from pathlib import Path
import platform

LINUX_MODELS_DIR = Path("/home/rheinsystems1/Desktop/AI/Comfyui/ComfyUI/models")
WINDOWS_MODELS_DIR = Path(r"F:\Comfy\models")

MODEL_ROOTS = {
    "linux": LINUX_MODELS_DIR,
    "windows": WINDOWS_MODELS_DIR,
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
