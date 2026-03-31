# Digital Alchemist — AI Fantasy Card Game

Mobile app that generates AI fantasy character cards with stats, lore, and optional video animation, then lets you battle them against campaign bosses to earn more generation tokens.

## Core Loop

**Generate cards → Collect → Battle bosses → Win tokens → Generate more**

## Features

### Card Generation
- Enter a text prompt describing a fantasy character
- SDXL pipeline generates a portrait image via the backend
- Ollama (Qwen2.5-VL) analyzes the image and generates card metadata: title, lore, and stats (Strength, Magic, Defense, Agility)
- Optional video animation via Wan 2.2 I2V pipeline

### Backend-Driven Gallery
- All cards stored on the backend in `output/` as images + `.meta.json` sidecars
- Gallery fetches from `GET /gallery` endpoint (paginated, newest first)
- Cards can be deleted via `DELETE /gallery/{id}`
- Survives app reinstalls — backend is the source of truth

### Rarity System
- Rarity derived from stat total: Common (4-15), Uncommon (16-20), Rare (21-25), Epic (26-30), Legendary (31-40)
- Color-coded borders and badges on gallery cards and result screen
- Works retroactively on all existing cards

### Generation Currency
- 3 free generations per day (resets at midnight)
- Battle tokens persist across days
- Free daily slots consumed first, then tokens

### Battle System (PvE)
- **Campaign Mode**: 12 sequential bosses with increasing difficulty and token rewards
- **Quick Battle**: Random unlocked boss, 1 token reward
- **Mechanics**: 4 rounds of simultaneous combat, then sudden death
  - Strength → base damage (+ d6 roll)
  - Magic → crit chance (Magic + d6 > 12 = double damage)
  - Defense → damage reduction (floor(Defense / 2))
  - Agility → dodge chance (Agility × 5%)
- All cards have flat 30 HP
- Tap-to-continue pacing with CRIT/DODGE/BLOCKED popups
- Free retry on defeat — no penalty

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo (React Native), TypeScript, expo-router |
| Backend | FastAPI, Python |
| Image Gen | SDXL (JuggernautXL) via ComfyUI |
| Video Gen | Wan 2.2 I2V (14B, LightX2V 4-step LoRAs) |
| Card Meta | Ollama (Qwen2.5-VL 7B) |
| Storage | Backend filesystem (images), AsyncStorage (currency, campaign progress) |

## Project Structure

```
frontend/
├── app/                          # expo-router file-based routes
│   ├── home.tsx                  # Main generation screen
│   ├── gallery.tsx               # Card collection
│   ├── display.tsx               # Generated card result
│   ├── loading.tsx               # Generation loading
│   ├── video-loading.tsx         # Video generation progress
│   ├── history/[id].tsx          # Card detail from gallery
│   ├── battle.tsx                # Campaign hub + Quick Battle
│   ├── battle-select.tsx         # Pick a card for battle
│   ├── battle-arena.tsx          # Round-by-round combat
│   └── battle-result.tsx         # Win/loss + rewards
├── assets/bosses/                # Pre-generated boss portraits (12 PNGs)
└── src/
    ├── screens/                  # Screen components
    ├── components/               # Reusable UI components
    ├── context/AppContext.tsx     # Global state (generation flow)
    ├── engine/battleEngine.ts    # Pure battle logic (no UI)
    ├── data/campaign.ts          # 12 boss definitions
    ├── services/api.ts           # Backend API client
    ├── storage/
    │   ├── generationCurrency.ts # Daily limit + token economy
    │   ├── campaignProgress.ts   # Boss progression
    │   ├── historyDb.ts          # Local history (AsyncStorage)
    │   └── mediaCache.ts         # Image/video caching
    ├── types.ts                  # Core TypeScript interfaces
    ├── types/battle.ts           # Battle type definitions
    ├── utils/rarity.ts           # Rarity calculation from stats
    └── theme.ts                  # Design tokens & colors
```

## Backend API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate/ex-image` | POST | Generate card image + metadata |
| `/generate/animate` | POST | Start video animation job |
| `/generate/animate/status/{job_id}` | GET | Poll video progress |
| `/gallery` | GET | List all cards (paginated) |
| `/gallery/{id}` | GET | Get single card |
| `/gallery/{id}` | DELETE | Delete card + files |
| `/output/{filename}` | GET | Serve generated files |
| `/health` | GET | Health check |

## Local Setup

1. Install dependencies: `npm install`
2. Create `frontend/.env` from `.env.example`
3. Set `EXPO_PUBLIC_API_BASE_URL` to the FastAPI backend URL
4. Set `EXPO_PUBLIC_DEBUG_FLOW=true` for dev trace panel (optional)

## Run

```bash
npx expo start            # Dev server
npx expo start --offline  # Skip remote version check
npm run android           # Android
npm run ios               # iOS
npm run web               # Web
```
