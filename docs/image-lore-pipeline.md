# Image Lore Generation Pipeline

## Overview

After the text-to-image pipeline generates a fantasy character image, we use **Qwen2.5-VL 7B** (running locally via Ollama) to analyze the image and generate a fantasy-themed lore description. This description replaces the hardcoded mock text currently shown in the "lore" section of the display page.

## Architecture

```
[Generated Image] → [Backend: /generate/lore] → [Ollama: qwen2.5vl:7b] → [Lore Text] → [Frontend: Display Page]
```

### Flow

1. Frontend receives the generated image on the `/display` page
2. Frontend calls `POST /generate/lore` with the image filename and original prompt
3. Backend reads the image from `output/`, converts to base64
4. Backend sends the image + a system prompt to Ollama's chat API
5. Ollama (Qwen2.5-VL 7B) analyzes the image and returns fantasy lore text
6. Backend returns the lore text to the frontend
7. Frontend displays it in the lore section (replacing the hardcoded quote)

## Backend Changes

### New Endpoint: `POST /generate/lore`

**File:** `backend/main.py`

**Request:**
```json
{
  "image_filename": "a1b2c3d4_00001_.png",
  "original_prompt": "a dark elf ranger with silver hair..."
}
```

**Response:**
```json
{
  "lore": "Born beneath the twin moons of Vel'Khar, this ranger walks the shadow paths..."
}
```

### Implementation Details

```python
OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen2.5vl:7b"

LORE_SYSTEM_PROMPT = """You are a fantasy lore writer for a card game.
Analyze the provided character image and write a short, evocative lore entry (2-3 sentences).

Rules:
- Write in third person, past or present tense
- Use a mystical, epic tone — like flavor text on a fantasy trading card
- Reference visual details from the image (armor, weapons, environment, race, expression)
- Do not describe the image technically — narrate the character's story
- Keep it under 60 words
- Do not use quotes around the text
- The user's original prompt is provided for context, but focus on what you SEE in the image"""
```

**Ollama API call structure:**
```python
import base64
import httpx

async def _generate_lore(image_path: Path, original_prompt: str) -> str:
    image_bytes = image_path.read_bytes()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": LORE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Original prompt: {original_prompt}\n\nDescribe this fantasy character's lore.",
                "images": [image_b64],
            },
        ],
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        return response.json()["message"]["content"]
```

### Dependencies

Add to `backend/requirements.txt`:
```
httpx
```

No other dependencies — Ollama runs as a separate service.

## Frontend Changes

### API Service

**File:** `frontend/src/services/api.ts`

New function:
```typescript
export const LORE_ENDPOINT = '/generate/lore';

export async function generateLore(
  imageFilename: string,
  originalPrompt: string,
): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}${LORE_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_filename: imageFilename,
      original_prompt: originalPrompt,
    }),
  });

  if (!response.ok) {
    throw new Error('Lore generation failed.');
  }

  const payload = await response.json();
  return payload.lore;
}
```

### Display Page Integration

**File:** `frontend/src/screens/ResultScreen.tsx`

- On mount (when `result` is available), call `generateLore()` in the background
- Show a subtle loading shimmer in the lore section while waiting
- Replace the hardcoded `meta.lore` with the API response
- Cache the result so navigating back doesn't re-trigger

### State Changes

**File:** `frontend/src/context/AppContext.tsx`

Add to context:
```typescript
loreText: string | null;
isLoreLoading: boolean;
```

Trigger lore generation automatically after image generation completes (right after `setResult(nextImage)`), or let the display page trigger it on mount.

## Ollama Setup

### Prerequisites
```bash
# Ollama must be running
ollama serve

# Pull the model (one-time)
ollama pull qwen2.5vl:7b
```

### Verification
```bash
# Test that the model responds to image input
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5vl:7b",
  "messages": [{"role": "user", "content": "describe this image", "images": ["<base64>"]}],
  "stream": false
}'
```

## System Prompt Tuning

The `LORE_SYSTEM_PROMPT` is the primary lever for output quality. Key areas to iterate on:

### Tone & Voice
- Current: "mystical, epic tone — like flavor text on a fantasy trading card"
- Could try: dark fantasy, high fantasy, Tolkien-esque, Warhammer grimdark, D&D module flavor
- The tone should match the visual style of JuggernautXL Ragnarok outputs (tends toward realistic/cinematic fantasy)

### Length Control
- Current target: 2-3 sentences, under 60 words
- Card games typically use 1-3 sentences
- Too short = generic; too long = loses card flavor feel
- Consider: `"Write exactly 2 sentences."` for more consistency

### Visual Grounding
- The model should reference what it actually sees (armor type, weapon, lighting, setting)
- Avoid generic fantasy clichés that could apply to any character
- Prompt engineering: `"You MUST mention at least one specific visual detail from the image"`

### Character Naming
- Current: no name generation
- Option: add `"Invent a short, fantasy-appropriate name for the character"` to the system prompt
- This could also populate the `meta.title` field (currently hardcoded as "The Wandering Light")

### Example Outputs to Aim For
Good:
> Forged in the siege of Ashenmoor, her mithril plate still bears the scorch marks of dragonfire. She watches the northern pass alone — the last sentinel of a kingdom that no longer remembers her name.

Bad (too generic):
> A powerful warrior stands ready for battle. Their strength is unmatched and they fight for justice in a dark world.

Bad (too technical):
> The image shows a character wearing plate armor with a sword. The lighting is dramatic and the background is dark.

## Performance Considerations

| Metric | Expected |
|---|---|
| Ollama cold start (model load) | ~5-10s first request |
| Inference time (warm) | ~3-8s |
| VRAM usage | ~5-6 GB |
| Concurrent with SDXL | No — SDXL should be done before lore runs |

- Lore generation runs **after** image generation is complete, so GPU contention with SDXL is not an issue
- If Wan 2.2 I2V is running simultaneously, there may be VRAM pressure — consider making lore generation run before or after animation, not during
- Ollama manages model loading/unloading automatically

## Error Handling

- If Ollama is not running → return a fallback: `"A vision conjured from the ancient prompt archives."`
- If the model times out → same fallback, log warning
- Frontend shows lore section with loading state, gracefully falls back to placeholder
- Never block the display page — lore is enhancement, not critical path

## Future Improvements

1. **Title generation** — Use the same model to generate a character name for the card title
2. **Stats generation** — Analyze the image to generate RPG-style stats (Strength, Magic, etc.) instead of showing pipeline parameters
3. **Prompt caching** — If the same image is viewed again, return cached lore
4. **Batch lore** — If batch_size > 1, generate lore for the selected image only
