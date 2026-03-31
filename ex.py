from comfy_script.runtime import *
# ComfyUI server/path
# or: load(r'path/to/ComfyUI')
load('http://127.0.0.1:8188/')
from comfy_script.runtime.nodes import *

with Workflow(wait=True):
    model, clip, vae = CheckpointLoaderSimple('juggernautXL_ragnarokBy.safetensors')
    model = LoraLoaderModelOnly(model, 'dmd2_sdxl_4step_lora.safetensors', 0.5)
    model = LoraLoaderModelOnly(model, 'dmd2_sdxl_4step_lora_fp16.safetensors', 0.5)
    conditioning = CLIPTextEncode('''masterpiece, best quality, highly detailed fantasy character, mystical elven warrior, long flowing silver hair, glowing emerald eyes, elegant engraved armor with gold filigree, intricate leather details, magical runes glowing softly, holding an ancient enchanted sword, dramatic cinematic lighting, fantasy forest background with floating particles and mist, dynamic pose, ultra detailed textures, fantasy concept art, volumetric lighting, sharp focus, epic atmosphere
    artstation trending, epic fantasy illustration, dramatic lighting, cinematic composition, ultra detailed, 8k concept art''', clip)
    conditioning2 = CLIPTextEncode('low quality, worst quality, blurry, jpeg artifacts, bad anatomy, extra fingers, missing fingers, extra limbs, malformed hands, deformed face, cross-eyed, poorly drawn hands, poorly drawn face, duplicate body, cropped, watermark, text, logo, oversaturated, flat lighting, mutated anatomy', clip)
    latent = EmptyLatentImage(832, 1216, 1)
    latent = KSampler(model, 704698080344064, 8, 1.4, 'lcm', 'normal', conditioning, conditioning2, latent, 1)
    image = VAEDecode(latent, vae)
    PreviewImage(image)
    upscale_model = UpscaleModelLoader('4xUltrasharp_4xUltrasharpV10.pt')
    image2 = ImageUpscaleWithModel(upscale_model, image)
    image2 = ImageScale(image2, 'nearest-exact', 2048, 2048, 'disabled')
    SaveImage(image2, 'ComfyUI')