# Image Lore Generation Pipeline

## Overview

After the text-to-image pipeline generates a fantasy character image, we use **Qwen2.5-VL 7B** (running locally via Ollama) to analyze the image and generate all card metadata in a single pass: **title**, **lore**, and **RPG stats**. This replaces all hardcoded `MOCK_META` values on the display page.

## Architecture

```
[SDXL generates image]
        ↓
[Backend calls Ollama with image + prompt]
        ↓
[Qwen2.5-VL 7B returns structured JSON: title + lore + stats]
        ↓
[Backend saves .meta.json sidecar + returns everything to frontend]
        ↓
[Frontend displays complete card on /display]
```

### Key Design Decisions

1. **Single Ollama call** — title, lore, and stats are all derived from the same image analysis. One inference pass, one structured JSON response.
2. **Inline with image generation** — Ollama runs on the backend *before* returning the image response. The frontend is still on `/loading` watching the progress bar, so the 3-8s lore inference is hidden behind the existing loading UX.
3. **No separate endpoint** — the existing `POST /generate/ex-image` is extended to return card metadata alongside the image URL.
4. **Sidecar caching** — metadata is saved as a `.meta.json` file next to each image. Re-requests for the same image skip Ollama entirely.

## Backend Changes

### Extended Response: `POST /generate/ex-image`

**Current response:**
```json
{
  "image_urls": ["/output/a1b2c3d4_00001_.png"]
}
```

**New response:**
```json
{
  "image_urls": ["/output/a1b2c3d4_00001_.png"],
  "card_meta": {
    "title": "Kaelith, the Ashborne",
    "lore": "Forged in the siege of Ashenmoor, her mithril plate still bears the scorch marks of dragonfire. She watches the northern pass alone — the last sentinel of a kingdom that no longer remembers her name.",
    "stats": {
      "Strength": 7,
      "Magic": 4,
      "Defense": 8,
      "Agility": 6,
      "Wisdom": 5,
      "Charisma": 9
    }
  }
}
```

### Implementation Details

```python
import base64
import json
import httpx

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen2.5vl:7b"

CARD_META_SYSTEM_PROMPT = """You are a fantasy lore writer for a collectible card game.
Analyze the provided character image and return a JSON object with three fields.

## Output Format (strict JSON, no markdown)
{
  "title": "<character name>, <short epithet>",
  "lore": "<2-3 sentence fantasy flavor text>",
  "stats": {
    "Strength": <1-10>,
    "Magic": <1-10>,
    "Defense": <1-10>,
    "Agility": <1-10>,
    "Wisdom": <1-10>,
    "Charisma": <1-10>
  }
}

## Rules for "title"
- Invent a fantasy-appropriate name (not from existing fiction)
- Add a short epithet after a comma: "Kaelith, the Ashborne"
- Keep under 35 characters total

## Rules for "lore"
- Write in third person, past or present tense
- Mystical, epic tone — like flavor text on a Magic: The Gathering card
- You MUST reference at least one specific visual detail from the image (armor, weapon, environment, expression, colors)
- Do NOT describe the image technically — narrate the character's story
- Keep under 50 words
- No quotes around the text

## Rules for "stats"
- Each stat is an integer from 1 to 10
- Base the stats on what you see: heavy armor = high Defense, staff/runes = high Magic, etc.
- Not every character is strong in everything — create contrast

## Examples

Input: An image of a dark elf in leather armor with twin daggers, crouching in a moonlit forest.
Output:
{
  "title": "Syvra, Fang of the Eclipse",
  "lore": "She moves between the silver birches like a rumor, her twin blades drinking moonlight. The forest remembers every throat they have opened.",
  "stats": {"Strength": 5, "Magic": 3, "Defense": 4, "Agility": 9, "Wisdom": 6, "Charisma": 5}
}

Input: An image of a hulking orc shaman surrounded by glowing green spirits, holding a gnarled staff.
Output:
{
  "title": "Grul'thar, the Spiritbound",
  "lore": "The ancestors speak through him in tongues of emerald flame. Each spirit he summons carries the weight of a century's rage, and he bears them all without flinching.",
  "stats": {"Strength": 7, "Magic": 9, "Defense": 6, "Agility": 3, "Wisdom": 8, "Charisma": 4}
}

The user's original prompt is provided for context, but focus on what you SEE in the image."""
```

**Ollama API call:**
```python
async def _generate_card_meta(image_path: Path, original_prompt: str) -> dict:
    """Call Ollama to generate card metadata from the image. Returns parsed JSON dict."""

    # Check for cached sidecar
    meta_path = image_path.with_suffix(".meta.json")
    if meta_path.exists():
        return json.loads(meta_path.read_text())

    image_b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": CARD_META_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Original prompt: {original_prompt}\n\nGenerate the card metadata for this character.",
                "images": [image_b64],
            },
        ],
        "format": "json",
        "stream": False,
        "keep_alive": 0,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            meta = response.json()["message"]["content"]
            parsed = json.loads(meta)

            # Validate expected keys exist
            for key in ("title", "lore", "stats"):
                if key not in parsed:
                    raise ValueError(f"Missing key: {key}")

            # Cache to sidecar file
            meta_path.write_text(json.dumps(parsed, indent=2))
            return parsed

    except Exception as e:
        print(f"[LORE] Ollama card meta generation failed: {e}")
        return _fallback_meta(original_prompt)


def _fallback_meta(original_prompt: str) -> dict:
    """Return placeholder metadata when Ollama is unavailable."""
    return {
        "title": "The Unnamed",
        "lore": f"A vision born from the words: \"{original_prompt[:80]}\". The full story remains unwritten.",
        "stats": {
            "Strength": 5,
            "Magic": 5,
            "Defense": 5,
            "Agility": 5,
            "Wisdom": 5,
            "Charisma": 5,
        },
    }
```

**Integration into `_generate_image_comfy`:**
```python
def _generate_image_comfy(req: GenerateImageRequest) -> dict:
    # ... existing SDXL workflow code ...
    # After copying images to OUTPUT_DIR:

    image_urls = [f"/output/{f}" for f in filenames]

    # Generate card metadata from the first image
    first_image = OUTPUT_DIR / filenames[0]
    card_meta = await _generate_card_meta(first_image, req.prompt)

    return {"image_urls": image_urls, "card_meta": card_meta}
```

Note: Since `_generate_image_comfy` runs in a threadpool and `_generate_card_meta` is async, the actual integration will use `asyncio.run()` inside the threadpool or restructure to call Ollama after the threadpool returns. Implementation will handle this.

### Dependencies

Add to `backend/requirements.txt`:
```
httpx
```

### Updated Response Model

```python
class CardMeta(BaseModel):
    title: str
    lore: str
    stats: dict[str, int]

class ImageResponse(BaseModel):
    image_urls: list[str]
    card_meta: CardMeta | None = None
```

## Frontend Changes

### Updated Types

**File:** `frontend/src/types.ts`

Replace `ImageMeta` with:
```typescript
export interface CardMeta {
  title: string;
  lore: string;
  stats: Record<string, number>;
}
```

### Updated API Response Handling

**File:** `frontend/src/services/api.ts`

The `generateImage` function already parses the response. Extend `GeneratedImage` to include `cardMeta`:
```typescript
export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  requestId: string;
  cardMeta: CardMeta | null;
}
```

Parse `card_meta` from the response payload alongside `image_urls`.

### Display Page Updates

**File:** `frontend/src/screens/ResultScreen.tsx`

- Remove `MOCK_META` constant entirely
- Read `result.cardMeta` for title, lore, and stats
- If `cardMeta` is null (fallback), show placeholder text
- Stats grid now shows RPG stats (1-10 integers) instead of pipeline parameters
- Consider rendering stats as visual bars (filled segments out of 10)

### No Loading Shimmer Needed

Since card metadata arrives with the image response (not as a separate call), there's no loading state to manage for lore. The card flip animation reveals everything at once.

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
# Quick test — should return valid JSON
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5vl:7b",
  "messages": [
    {"role": "system", "content": "Return a JSON object with keys: title, lore, stats"},
    {"role": "user", "content": "Describe a fantasy warrior", "images": ["<base64>"]}
  ],
  "format": "json",
  "stream": false
}'
```

## System Prompt Design

### Why Few-Shot Examples Matter

Qwen2.5-VL 7B is a capable model but at 7B parameters, bare instruction prompts produce inconsistent output — sometimes too long, sometimes too generic, sometimes wrong JSON structure. The two few-shot examples in the system prompt serve as:

1. **Format anchors** — the model sees exactly what the JSON should look like
2. **Tone targets** — both examples use the specific "card flavor text" voice we want
3. **Stat reasoning** — the examples show stats grounded in visual details (daggers → high Agility, shaman staff → high Magic)

### Structured Output Enforcement

The `"format": "json"` parameter in the Ollama API constrains the model's output to valid JSON tokens. Combined with the explicit schema in the system prompt, this eliminates:
- Markdown code fences around JSON
- Explanatory text before/after the JSON
- Malformed JSON (unclosed brackets, trailing commas)

### Tuning Levers

| Lever | Current Value | What It Controls |
|---|---|---|
| Lore word limit | 50 words | Brevity vs. richness |
| Stat range | 1-10 integers | Granularity of character differentiation |
| Title max length | 35 characters | Fits the card banner UI |
| Few-shot count | 2 examples | Consistency (more = better but uses context) |
| Tone descriptor | "like flavor text on a Magic: The Gathering card" | Voice and style |
| Visual grounding rule | "MUST reference at least one specific visual detail" | Prevents generic output |

### Iteration Process

To tune the system prompt:
1. Generate 10+ images with varied prompts (elf, orc, mage, knight, etc.)
2. Run the current prompt against each image
3. Score outputs on: tone consistency, visual grounding, stat plausibility, title quality
4. Adjust the system prompt and few-shot examples based on failure patterns
5. Re-run and compare

## Sidecar Caching

Each generated image gets a companion `.meta.json` file:

```
output/
├── a1b2c3d4_00001_.png
├── a1b2c3d4_00001_.meta.json    ← cached card metadata
├── b5e6f7g8_00001_.png
└── b5e6f7g8_00001_.meta.json
```

**Cache behavior:**
- Before calling Ollama, check if `.meta.json` exists → return instantly if so
- After successful Ollama response, write `.meta.json`
- Cache is permanent — delete the `.meta.json` to force regeneration
- No TTL needed since the image never changes

## VRAM Management

| Stage | GPU Usage |
|---|---|
| SDXL image generation (ComfyUI) | ~8-12 GB |
| Ollama card meta (Qwen2.5-VL 7B) | ~5-6 GB |
| Wan 2.2 I2V (ComfyUI) | ~20+ GB |

### Critical: `keep_alive: 0`

The Ollama API call uses `"keep_alive": 0` which tells Ollama to **immediately unload the model from VRAM** after responding. Without this:
- Ollama keeps Qwen2.5-VL loaded for 5 minutes (default)
- User clicks "Animate" → Wan 2.2 I2V tries to load two 14B models → OOM

With `keep_alive: 0`:
- Ollama responds → unloads → VRAM is free
- ComfyUI can safely load I2V models

### Timeline
```
[SDXL running ~8-12GB] → [SDXL done, ComfyUI frees VRAM]
    → [Ollama loads Qwen2.5-VL ~5-6GB, runs inference, unloads]
    → [Response sent to frontend]
    → ... user views card ...
    → [User clicks Animate → ComfyUI loads Wan 2.2 I2V ~20+GB]
```

No two heavy models share VRAM at the same time.

## Error Handling

| Failure | Behavior |
|---|---|
| Ollama not running | Return fallback meta, log warning |
| Ollama timeout (>120s) | Return fallback meta, log warning |
| Invalid JSON from model | Retry once, then return fallback meta |
| Missing keys in JSON | Return fallback meta |
| Image file not found | Skip card meta, return `card_meta: null` |

**Fallback meta** uses the original prompt to generate a contextual placeholder:
```json
{
  "title": "The Unnamed",
  "lore": "A vision born from the words: \"a dark elf ranger with silver hair...\". The full story remains unwritten.",
  "stats": {"Strength": 5, "Magic": 5, "Defense": 5, "Agility": 5, "Wisdom": 5, "Charisma": 5}
}
```

This is better than a fully generic fallback because the user still sees their prompt reflected in the card.

## Loading Screen Integration

The loading screen ([LoadingScreen.tsx](frontend/src/screens/LoadingScreen.tsx)) currently shows 3 progress steps:

```
1. Gathering starlight and memory
2. Translating the prompt
3. Rendering the image
```

Add a 4th step:
```
4. Writing the character's lore
```

This step activates after the image is generated (progress ~85%) and completes when Ollama responds. The user sees meaningful progress instead of stalling at 92%.
