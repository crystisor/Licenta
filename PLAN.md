# CCG Feature Set — Implementation Plan (PvE Only)

## Context
The app generates AI fantasy character cards with stats, lore, and optional video. Currently the gallery uses **AsyncStorage + local file cache** — this is ephemeral (cleared on reinstall/cache clear). Meanwhile, `backend/output/` has all generated images + `.meta.json` files as the real source of truth. We need to make the backend the authority for the card collection and build a battle game on top.

---

## Problem: Storage Architecture

### Current Flow (Broken)
```
Backend generates image + .meta.json → Frontend downloads to local cache →
Saves metadata to AsyncStorage → Gallery reads from AsyncStorage
```
**Issues:**
- AsyncStorage is temporary — app reinstall = collection lost
- Backend `output/` has 12 cards right now that the gallery doesn't know about
- No way to rebuild gallery from backend data
- The prompt used to generate is not saved in `.meta.json` (only title/lore/stats)

### Proposed Fix: Backend-Driven Gallery

**New endpoint: `GET /gallery`** — returns all cards from `output/` by scanning `.meta.json` files.

```python
# Response
[
  {
    "id": "b91c20f7",                    # batch ID (from filename)
    "image_url": "/output/b91c20f7_00001_.png",
    "video_url": "/output/b91c20f7_video_00001_.mp4",  # null if no video
    "card_meta": { "title": "...", "lore": "...", "stats": {...} },
    "created_at": 1711843200             # file mtime
  },
  ...
]
```

**How it works:**
1. Backend scans `output/` for `*.meta.json` files
2. For each, reads the JSON + checks if a matching video exists
3. Returns sorted by creation time (newest first)
4. Supports pagination: `?limit=20&offset=0`

**Frontend changes:**
- `GalleryScreen` fetches from `/gallery` instead of AsyncStorage
- Images loaded directly from backend URLs (no local caching needed for gallery thumbnails — use `<Image source={{ uri }}/>`)
- AsyncStorage still used for: daily limit tracker, deck data, battle history
- `historyDb.ts` becomes **optional** (used only for offline cache if desired, not source of truth)

**Also update `.meta.json`** to include the prompt:
```json
{
  "title": "Aryanna, Dragon's Flight",
  "lore": "...",
  "stats": { "Strength": 8, "Magic": 2, "Defense": 9, "Agility": 7 },
  "prompt": "a dragon rider warrior in golden armor..."
}
```

---

## Stage 1: Backend Gallery Endpoint + Storage Fix

### Backend Changes
**File: `backend/main.py`**

New endpoint: `GET /gallery`
- Scan `output/` for `*_00001_.meta.json` files
- For each: read meta, check for video file, get file mtime
- Return paginated list sorted by creation time desc
- Query params: `limit` (default 20), `offset` (default 0)

New endpoint: `DELETE /gallery/{id}`
- Delete image + meta.json + video (if exists) from `output/`

Update `POST /generate/ex-image`:
- Save `prompt` field into `.meta.json` alongside title/lore/stats

### Frontend Changes
**File: `frontend/src/services/api.ts`**
- Add `fetchGallery(limit, offset)` and `deleteCard(id)` API functions

**File: `frontend/src/screens/GalleryScreen.tsx`**
- Fetch from `/gallery` endpoint instead of AsyncStorage
- Images rendered from backend URLs
- Delete calls `DELETE /gallery/{id}`

**File: `frontend/src/screens/HistoryDetailScreen.tsx`**
- Load card data from `/gallery` endpoint (or pass via route params)

**Files to potentially simplify:**
- `historyDb.ts` — no longer the source of truth for gallery
- `mediaCache.ts` — still used for video caching during generation, but gallery doesn't need local copies

---

## Stage 2: Rarity System
**No storage/backend changes — pure frontend utility.**

### New File: `frontend/src/utils/rarity.ts`
```typescript
type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
// Derived from stat total: Common (4-15), Uncommon (16-20),
// Rare (21-25), Epic (26-30), Legendary (31-40)
// + color mapping: gray → cyan → blue → purple → gold
```

### Modify
- `theme.ts` — add rarity color constants
- `GalleryCard.tsx` — colored left border + small rarity label
- `ResultScreen.tsx` — rarity banner near title, tinted card border

Works retroactively on all existing cards.

---

## Stage 3: Generation Currency System (Daily Limit + Battle Tokens)
**Client-side only, no backend changes.**

### New File: `frontend/src/storage/generationCurrency.ts`
- AsyncStorage key: `generation_currency` → `{ date: "YYYY-MM-DD", freeRemaining: number, tokens: number }`
- `getGenerationStatus()` → `{ freeRemaining: number, tokens: number }`
- `consumeGeneration()` → boolean (false if no free slots AND no tokens)
  - Consumes a free daily slot first, then a token if no free slots remain
- `addTokens(count)` → void (called after battle wins)
- Free daily limit: 3/day, resets at midnight local time
- Tokens persist across days

### Modify
- `AppContext.tsx` — `handleCast` checks `consumeGeneration()` before API call
- `SummonScreen.tsx` — display "2/3 free today + 5 tokens" counter near Generate button

---

## Stage 4: Battle System (PvE Only)

### Battle Mechanics — "Clash of Attributes"

**4 generic combat rounds. All stats contribute every round as attack + passives:**

| Stat | Role | How it works |
|------|------|-------------|
| **Strength** | Attack power | Base damage each round: `Strength + d6` |
| **Magic** | Crit chance | Each round: if `Magic + d6 > 12` → damage is doubled |
| **Defense** | Damage reduction | Each round: `damage_taken = max(1, raw_damage - floor(Defense / 2))` |
| **Agility** | Dodge | Each round: `(Agility * 5)%` chance to take 0 damage |

**Per round (both cards attack simultaneously):**
```
For each card:
  1. Roll attack:     raw_damage = Strength + random(1, 6)
  2. Check crit:      if (Magic + random(1, 6)) > 12 → raw_damage *= 2
  3. Apply defense:   final_damage = max(1, raw_damage - floor(opponent.Defense / 2))
  4. Check dodge:     if random(1, 100) <= opponent.Agility * 5 → final_damage = 0
  5. Opponent loses final_damage HP
```

**HP:** Flat **30 for all cards** (normalizes battle length regardless of rarity)

**Win condition:** After 4 rounds, card with HP > 0 wins. Both alive → sudden death (extra rounds until one drops). Both dead → draw.

**Battle pacing:** Tap-to-continue between rounds. Each round shows:
1. Both cards attack simultaneously (dice roll animation)
2. Crit/dodge/defense popups flash on the cards
3. Damage numbers appear, HP bars update
4. Player taps to proceed to next round

**On defeat:** Free retry — player can immediately re-battle the same boss with the same or a different card. No penalty.

**Why this works:**
- All 4 stats matter every round — high-Agility cards feel evasive, high-Magic cards spike with crits, high-Defense cards tank
- Tap-to-continue lets the player absorb each round and builds tension
- Flat HP keeps battles fair (rarity advantage = better passives, not just bigger numbers)
- d6 randomness means upsets are possible (~20-30%)
- Battles take 30-60 seconds with tapping

### Campaign Mode (PvE Progression)
**New file: `frontend/src/data/campaign.ts`**

10-15 sequential boss opponents with increasing difficulty. Each boss has a unique name, theme, and progressively higher stats.

| Boss # | Example Name | Stat Total | Reward |
|--------|-------------|-----------|--------|
| 1 | Skrix, Tunnel Rat | 14 | 1 generation token |
| 2 | Hollow Sentinel | 17 | 1 generation token |
| 3 | Bramble Witch | 20 | 1 generation token |
| ... | ... | ... | ... |
| 10 | Vorath, the Undying | 30 | 2 generation tokens |
| Final | Azariel, World Ender | 36 | 3 tokens + "Campaign Complete" badge |

**Boss card visibility:** Before picking their card, the player sees the boss's full card (image, name, stats, rarity). This lets the player strategize — e.g., see a high-Magic boss → pick a high-Defense card to survive crits.

**Boss images:** Pre-generated using the existing text-to-image pipeline. Run the backend once to generate all 10-15 boss portraits, save the PNGs, and bundle them into `frontend/assets/bosses/`. One-time effort before building the APK.

**Progression rules:**
- Player progresses sequentially — must beat boss N to unlock boss N+1
- Progress stored in AsyncStorage: `campaign_progress` → `{ currentBoss: number, completedAt?: number }`
- Beating all bosses unlocks a visible badge/achievement on the home screen
- Can replay any beaten boss for tokens after completing them
- **Free retry on defeat** — no penalty, can immediately re-battle with the same or a different card

### Quick Battle Mode
Alongside campaign, a "Quick Battle" option for replayability:
- Random opponent picked from the campaign pool (any unlocked boss)
- Always rewards 1 generation token on win

### Reward Loop: Generation Tokens
Battles tie directly into generation:
- **3 free generations per day** (daily limit)
- **Win a battle → earn 1 generation token** (2 for hard bosses, 3 for final boss)
- Tokens persist across days (stored in AsyncStorage)
- When generating: consume a free daily slot first, then a token if no free slots remain
- This creates the core loop: **Generate → Collect → Battle → Win tokens → Generate more**

Storage: `generation_currency` → `{ date: "YYYY-MM-DD", freeRemaining: number, tokens: number }`

### Battle Engine
**New file: `frontend/src/engine/battleEngine.ts`**
- Pure functions, no UI dependencies, easily testable
- `createBattleCard(entry)` — converts HistoryEntry/GalleryCard to BattleCard with HP
- `resolveRound(playerCard, opponentCard, stat)` → RoundResult
- `runBattle(playerCard, opponentCard)` → BattleResult

### New Types
**New file: `frontend/src/types/battle.ts`**
```typescript
interface BattleCard {
  id: string;
  title: string;
  imageUri: string;
  stats: Record<string, number>;
  rarity: Rarity;
  hp: number;
  currentHp: number;
}

interface RoundResult {
  stat: string;
  playerRoll: number;
  opponentRoll: number;
  playerDamage: number;
  opponentDamage: number;
  winner: 'player' | 'opponent' | 'tie';
}

interface BattleResult {
  id: string;
  playerCardId: string;
  opponentCardId: string;
  rounds: RoundResult[];
  winner: 'player' | 'opponent' | 'draw';
  tokensEarned: number;
  timestamp: number;
}

interface CampaignProgress {
  currentBoss: number;        // index of next unlocked boss (0-based)
  completedAt: number | null; // timestamp when all bosses beaten, null if incomplete
}

interface CampaignBoss {
  id: string;
  name: string;
  lore: string;
  stats: Record<string, number>;
  imageAsset: any;            // require('...') bundled image
  tokenReward: number;        // 1, 2, or 3
}
```

### New Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/battle` | BattleHubScreen | Campaign progress map + Quick Battle button |
| `/battle-select` | BattleSelectScreen | Pick a card from collection (scrollable grid) |
| `/battle-arena` | BattleArenaScreen | Round-by-round gameplay with animations |
| `/battle-result` | BattleResultScreen | Win/loss, tokens earned, next boss preview |

### Battle Arena Screen Flow
1. **Intro:** Both cards slide in side-by-side (player left, opponent right). HP bars shown at 30/30.
2. **Each round (tap-to-continue between rounds):**
   - "Round N" banner appears
   - Both cards attack simultaneously — dice roll animation on both sides
   - Popups flash on cards: "CRIT!" (gold), "DODGED!" (cyan), "BLOCKED -3" (gray)
   - Damage numbers fly off both cards, HP bars animate down
   - Screen pauses — player taps to proceed
3. **Result:** After 4 rounds (or sudden death), winning card glows + "VICTORY" / "DEFEAT" banner
4. Navigate to result screen (tokens earned, retry/next boss buttons)

### Battle State
Use `useReducer` locally in battle screens — NOT in AppContext. Battle state is ephemeral.

### Navigation
Add "Battle" button to `SummonScreen` (alongside Gallery button).

---

## Stage 5: Card Sharing

**New dependency:** `expo-sharing` (already in Expo SDK)

### New Component: `frontend/src/components/ShareableCard.tsx`
- Renders card in shareable layout (image + title + stats + rarity border)
- Captured via `react-native-view-shot` → shared via native share sheet

### Modify
- `ResultScreen.tsx` — add "Share" button
- `HistoryDetailScreen.tsx` — add "Share" button

---

## Stage 6: Deck Building

### New Storage: `frontend/src/storage/deckDb.ts`
- AsyncStorage: `deck_index` + `deck:{id}`
- Deck = `{ id, name, cardIds: string[5], createdAt, updatedAt }`

### New Screens
| Route | Screen | Purpose |
|-------|--------|---------|
| `/decks` | DecksScreen | List of saved decks |
| `/deck-builder` | DeckBuilderScreen | Select 5 cards from collection |

### Deck Battle Mode
Best-of-5: each round draws next card from deck, loser's card eliminated, first to lose all 5 loses the match.

Add "Decks" button to SummonScreen.

---

## Implementation Order

| Stage | Feature | Effort | Backend | Priority |
|-------|---------|--------|---------|----------|
| 1 | Gallery endpoint + storage fix | Medium | Yes | **Must do first** |
| 2 | Rarity system | Small | No | High |
| 3 | Generation currency (daily limit + tokens) | Small | No | High (needed for battle rewards) |
| 4 | Battle system (Campaign + Quick Battle) | Large | No | **Core feature** |
| 5 | Card sharing | Small | No | Nice to have |
| 6 | Deck building | Medium | No | Nice to have |

**Stage 1 must come first** — it fixes the storage problem and makes the gallery reliable.
**Stages 2-3** set up rarity and the token economy that battles reward into.
**Stage 4** is the core game loop: Campaign + Quick Battle → earn tokens → generate more cards.

---

## Key Files to Modify
- `backend/main.py` — new `/gallery` and `/gallery/{id}` endpoints, update meta.json saving
- `frontend/src/services/api.ts` — new API functions
- `frontend/src/screens/GalleryScreen.tsx` — fetch from backend instead of AsyncStorage
- `frontend/src/screens/SummonScreen.tsx` — add Battle/Decks buttons, gen limit counter
- `frontend/src/screens/ResultScreen.tsx` — rarity visuals, share button
- `frontend/src/components/GalleryCard.tsx` — rarity border
- `frontend/src/context/AppContext.tsx` — daily limit check
- `frontend/src/theme.ts` — rarity colors

## New Files
- `frontend/src/utils/rarity.ts`
- `frontend/src/storage/generationCurrency.ts`
- `frontend/src/storage/deckDb.ts`
- `frontend/src/engine/battleEngine.ts`
- `frontend/src/types/battle.ts`
- `frontend/src/data/campaign.ts` — boss definitions (10-15 sequential opponents)
- `frontend/src/components/ShareableCard.tsx`
- `app/battle.tsx`, `app/battle-select.tsx`, `app/battle-arena.tsx`, `app/battle-result.tsx`
- `app/decks.tsx`, `app/deck-builder.tsx`

## Verification
1. **Gallery fix:** Generate a card → restart app → gallery still shows all cards from backend
2. **Rarity:** Check that cards show correct rarity badge based on stat totals
3. **Generation currency:** Use 3 free daily generations → blocked → win a battle → earn token → can generate again
4. **Campaign:** Beat boss 1 → boss 2 unlocks → progress persists across app restarts
5. **Battle mechanics:** Crits fire when Magic + d6 > 12, dodge triggers at Agility*5% chance, Defense reduces damage each round. All 4 stats active every round.
6. **Quick Battle:** Random opponent from unlocked bosses → win → earn 1 token
7. **Share:** Tap share on a card → native share sheet opens with card image
8. **Decks:** Build a deck of 5 → use it in battle → best-of-5 plays correctly
