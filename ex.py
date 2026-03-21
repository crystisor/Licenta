from comfy_script.runtime import *
# ComfyUI server/path
# or: load(r'path/to/ComfyUI')
load('http://127.0.0.1:8000/')
from comfy_script.runtime.nodes import *

with Workflow(wait=True):
    model, clip, vae = CheckpointLoaderSimple('juggernautXL_ragnarokBy.safetensors')
    model, clip = LoraLoader(model, clip, 'dmd2_sdxl_4step_lora.safetensors', 1, 1)
    model, clip = LoraLoader(model, clip, 'dmd2_sdxl_4step_lora.safetensors', 1, 1)
    conditioning = CLIPTextEncode('', clip)
    conditioning2 = CLIPTextEncode('', clip)
    latent = EmptyLatentImage(512, 512, 1)
    latent = KSampler(model, 0, 20, 8, 'euler', 'simple', conditioning, conditioning2, latent, 1)
    image = VAEDecode(latent, vae)
    SaveImage(image, 'ComfyUI')