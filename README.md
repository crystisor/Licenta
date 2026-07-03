# AI Cards — Build, Installation & Launch Guide

End-to-end instructions for building and running the full stack:

- **Server side** — FastAPI backend + ComfyUI + Ollama, all hosted on a **DGX Spark** machine, exposed to the internet at **`https://llm.rheinsystems.ro`**.
- **Client side** — Expo React Native app ("AI Cards"), built into an Android APK that talks to the public backend URL.

```
┌─────────────┐   HTTPS    ┌──────────────────── DGX Spark ────────────────────┐
│  Android    │ ─────────► │ reverse proxy (llm.rheinsystems.ro)               │
│  app        │            │   └─► FastAPI backend :8000  (backend/main.py)    │
│ (Expo RN)   │            │         ├─► ComfyUI      127.0.0.1:8188  (SDXL,   │
└─────────────┘            │         │                 Wan 2.2 I2V)            │
                           │         └─► Ollama       127.0.0.1:11434          │
                           │                           (qwen2.5vl:7b lore)     │
                           └────────────────────────────────────────────────────┘
```

The backend does **not** run any diffusion model itself — it submits workflows to the local ComfyUI server via `comfy_script` and asks the local Ollama daemon for card metadata. ComfyUI and Ollama stay bound to localhost; only the FastAPI app is reachable through the proxy.

---

## 1. Server setup

### 1.1 ComfyUI and model weights

Install ComfyUI on the machine.

Place these files in the ComfyUI models tree:

| File | ComfyUI subfolder | Used for |
|---|---|---|
| `juggernautXL_ragnarokBy.safetensors` | `checkpoints/` | SDXL text-to-image |
| `dmd2_sdxl_4step_lora.safetensors` | `loras/` | 4-step distillation LoRA |
| `dmd2_sdxl_4step_lora_fp16.safetensors` | `loras/` | 4-step distillation LoRA (fp16) |
| `4xUltrasharp_4xUltrasharpV10.pt` | `upscale_models/` | 4× upscale to 2048² |
| `wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors` | `diffusion_models/` | Wan 2.2 I2V high-noise UNet |
| `wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors` | `diffusion_models/` | Wan 2.2 I2V low-noise UNet |
| `wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors` | `loras/` | LightX2V 4-step LoRA (high) |
| `wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors` | `loras/` | LightX2V 4-step LoRA (low) |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | `text_encoders/` | Wan text encoder |
| `wan_2.1_vae.safetensors` | `vae/` (or `vae_approx/`) | Wan VAE |

Use a recent ComfyUI build — the video workflow relies on the core `WanImageToVideo`, `CreateVideo`, and `SaveVideo` nodes.

### 1.2 Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5vl:7b
```

Ollama must listen on the default `http://localhost:11434`. The backend calls it with `keep_alive: 0`, so the vision model is unloaded from VRAM after each card — this is intentional (frees memory for the ~20 GB Wan 2.2 video job).

### 1.3 Backend Python environment

Python 3.10+.

```bash
cd Licenta/backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" httpx
pip install "comfy-script[default]"
```

### 1.4 Internet exposure (nginx)

nginx on the on the machine that runs Ollama, ComfyUI and backend server terminates TLS for `llm.rheinsystems.ro` and proxies to the backend on `127.0.0.1:8000`.


Rules that must hold regardless of the exact config:

- Expose **only** the FastAPI app through nginx. ComfyUI (8188) and Ollama (11434) must keep listening on `127.0.0.1` only and must have **no** nginx `location`/`server` forwarding to them — both are unauthenticated, and public ComfyUI access means arbitrary workflow execution on your GPU. Verify from outside: `curl -m 5 http://llm.rheinsystems.ro:8188/` and `:11434` should both fail.

---

## 2. Server launch (every start, in this order)

```bash
# 1. ComfyUI
cd "your ComfyUI directory path"
python main.py --listen 127.0.0.1 --port 8188

# 2. Ollama (usually already running as a systemd service) on Windows might need to be manually be started
ollama serve   # only if not already active

# 3. Backend — MUST be started from the backend/ directory
cd Licenta/backend
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

Important: run uvicorn **from inside `backend/`**. `main.py` uses `from config import ...` (a bare import), so starting it from the repo root fails with `ModuleNotFoundError: No module named 'config'`.

The backend connects to ComfyUI lazily on the first generation request, so start order only strictly matters before the first request. Generated media and `.meta.json` card sidecars accumulate in `backend/output/` — that directory *is* the gallery database; back it up if the collection matters.

### Verify

```bash
curl https://llm.rheinsystems.ro/health
# {"status":"ok"}

curl -X POST https://llm.rheinsystems.ro/generate/ex-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "an elven warrior with silver armor, fantasy portrait"}'
# → {"image_urls": ["/output/<id>_00001_.png"], "card_meta": {...}}   (takes ~15–60 s)
```

---

## 3. Frontend build (Android app)

### 3.1 Prerequisites

- Node.js 18+
- For a local APK build: JDK 17 and the Android SDK (`ANDROID_HOME` set), or Android Studio
- For a cloud build instead: an [Expo EAS](https://expo.dev) account

### 3.2 Configure the backend URL

Create `frontend/.env`

```bash
# frontend/.env
EXPO_PUBLIC_API_BASE_URL=https://llm.rheinsystems.ro
```

No trailing slash needed (it is stripped). This is the **only** place the app learns the backend address; the app throws on startup if it is missing. Because the value is baked into the JS bundle at build time, **rebuild the app after changing it**.

`app.json` sets `android.usesCleartextTraffic: true` — that was needed for plain-`http://` LAN backends. With the HTTPS domain it is unnecessary (but harmless); keep it if you ever want to point a dev build at `http://<lan-ip>:8000` again.

### 3.3 Install dependencies

```bash
cd frontend
npm install
```

### 3.4 Option A — development run (no APK)

```bash
npx expo start            # or: npx expo start --offline
```

Install **Expo Go** on the phone, scan the QR code. Phone needs internet access to reach `llm.rheinsystems.ro`. Optional: add `EXPO_PUBLIC_DEBUG_FLOW=true` to `.env` for the dev trace panel.

### 3.5 Option B — local APK build

The native Android project is already generated (`frontend/android/`).

```bash
cd frontend
npx expo prebuild --platform android   # only if android/ ever drifts; otherwise skip
cd android
./gradlew assembleRelease              # Windows: .\gradlew.bat assembleRelease
```

APK output:

```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

The release build is signed with the bundled debug keystore — fine for sideloading on your own devices, not for Play Store distribution.

## 4. Installing the app on a phone

Via USB + adb:

```bash
adb install frontend/android/app/build/outputs/apk/release/app-release.apk
```

Or copy the APK to the phone (or download it from the EAS build link) and open it. Android will ask to allow installs from unknown sources — accept. The app installs as **"AI Cards"**.

GitHub repository: https://github.com/crystisor/Licenta.git
