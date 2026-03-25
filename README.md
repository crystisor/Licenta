# AI Video Generator

A mobile application that generates videos from text prompts. Enter a description, and the app produces an image via Stable Diffusion, then animates it into a video using Wan 2.2 image-to-video.

University thesis project (Licenta).

## Architecture

```
User prompt → [Expo App] → REST API → [Text-to-Image] → [Image-to-Video] → Video
```

- **Frontend** — Expo (React Native + TypeScript). Single-screen app with prompt input and video display.
- **Backend** — FastAPI (Python). Orchestrates the AI pipelines and serves generated media.
- **Text-to-Image** — SDXL (JuggernautXL Ragnarok), DPM++ 2M SDE sampler, Karras schedule, 832x1216 portrait output.
- **Image-to-Video** — Wan 2.2 I2V (14B, FP8), dual high/low noise models with LightX2V 4-step LoRAs for accelerated inference. Outputs 81 frames at 640x640.

All pipelines run locally on GPU — no external API calls or ComfyUI runtime.

## Project Structure

```
Licenta/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Configuration
│   ├── requirements.txt
│   ├── pipelines/
│   │   ├── text_to_image.py # SDXL text-to-image
│   │   └── image_to_video.py# Wan 2.2 I2V
│   ├── utils/
│   └── tests/
└── frontend/
    ├── App.tsx
    ├── app.json
    ├── src/
    │   ├── screens/
    │   ├── components/
    │   └── services/
    └── package.json
```

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- NVIDIA GPU with CUDA
- Model weights downloaded locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npx expo install
npx expo start
```

## Models

| Pipeline | Model | Format |
|---|---|---|
| Text-to-Image | JuggernautXL Ragnarok | SDXL safetensors |
| I2V (high noise) | Wan 2.2 I2V 14B FP8 | safetensors |
| I2V (low noise) | Wan 2.2 I2V 14B FP8 | safetensors |
| I2V text encoder | UMT5-XXL FP8 | safetensors |
| I2V VAE | Wan 2.1 VAE | safetensors |
| I2V LoRAs | LightX2V 4-step (high/low noise) | safetensors |

## Key Parameters

**Text-to-Image**: 35 steps, CFG 3.5, DPM++ 2M SDE + Karras, 832x1216, batch size 10

**Image-to-Video**: Euler sampler, 81 frames, 640x640, turbo mode enabled

## License

University thesis project — not licensed for redistribution.
