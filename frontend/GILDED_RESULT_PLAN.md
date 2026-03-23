# Plan: Archive-Style Result Screen

## Goal
Replace the current `ResultScreen` with a new layout inspired by `the-gilded-archive/` design structure, using the **existing app theme** (purple/dark palette). The generated image is displayed as a portrait card with mock story/stats sections.

## Current State
- **ResultScreen** (`src/screens/ResultScreen.tsx`): Simple card with image, prompt text, and "Generate another" button. Uses `ScreenShell` wrapper.
- **Theme** (`src/theme.ts`): Purple-accented dark palette (`#B8A0FF` primary, `#090B13`→`#151B2F` gradient background).
- **App.tsx**: Manages 3 screens (`summon` → `loading` → `result`), passes `GeneratedImage` to `ResultScreen`.
- **ScreenShell** (`src/components/ScreenShell.tsx`): Layout wrapper with gradient bg, header (eyebrow/title/subtitle), ScrollView, footer.

## Design Reference (the-gilded-archive layout)
- **Card**: Portrait image (top 60%), name banner overlapping image bottom, description below, decorative inner border frame
- **Stats grid**: 3-column grid with attributes (label, value, modifier)
- **Lore section**: Left-bordered quote block with action button
- **Animations**: Fade-in + slide-up on card entrance

## Adaptation: Keep Existing Theme
All colors, fonts, and radius values come from `src/theme.ts`:
- Primary: `#B8A0FF` (purple) — not gold
- Background: gradient `#090B13` → `#151B2F`
- Text: `#F6F4FF`, muted: `#A0A6C0`
- Borders: `rgba(111, 119, 203, 0.3)`
- Card bg: `#12182A`

---

## Implementation Steps

### Step 1 — Add Types and Mock Data
**File**: `src/types.ts` (edit) — add the interface only

```ts
export interface ImageMeta {
  title: string;
  description: string;
  lore: string;
  stats: Record<string, string | number>;
}
```

**File**: `src/screens/ResultScreen.tsx` — define mock constant locally in the screen file (temporary, will be replaced by real backend data later)

```ts
const MOCK_META: ImageMeta = {
  title: 'The Wandering Light',
  description: 'A vision conjured from the ancient prompt archives, shimmering between worlds of thought and form.',
  lore: 'The light bends through forgotten corridors, each beam a memory made tangible by the weave of creation.',
  stats: {
    Resolution: '832×1216',
    Steps: 35,
    CFG: 3.5,
    Sampler: 'DPM++ 2M SDE',
    Scheduler: 'Karras',
    Denoise: 1.0,
  },
};
```

**Why stats are generation params, not D&D attributes**: The stats section should reflect data that maps to real pipeline output. Resolution, Steps, CFG, Sampler, Scheduler, and Denoise are the actual KSampler settings from the text-to-image pipeline. When real data is wired up later, these values come directly from the backend with zero schema change.

### Step 2 — Rewrite ResultScreen
**File**: `src/screens/ResultScreen.tsx` (rewrite)

**Do NOT use `ScreenShell`** — its forced header (eyebrow/title/subtitle) competes with the card-first layout. Instead, manage the gradient background and scroll directly:

```tsx
<LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={{ flex: 1 }}>
  <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ maxWidth: 448, alignSelf: 'center', width: '100%', padding: 16, paddingBottom: 32 }}>
      {/* card, stats, lore, button */}
    </ScrollView>
  </SafeAreaView>
</LinearGradient>
```

Content max-width capped at **448px** so it doesn't stretch on tablets/web.

#### 2a — Portrait Card Section
- Full-width card: `theme.colors.card` background, `theme.colors.panelBorder` border, `borderRadius: theme.radius.lg`
- **Decorative inner border**: A `position: 'absolute'` View inset ~8px from edges with a `1px` border in `rgba(184, 160, 255, 0.1)` — adds the archive's double-border depth
- **Generated image** as portrait (top ~60% of card)
  - Aspect ratio **2:3** to match the backend output (832×1216)
  - `resizeMode="cover"`, loaded from `result.imageUrl`
  - Semi-transparent overlay: `rgba(5, 7, 14, 0.12)`
  - **Loading placeholder**: While image loads, show a muted background (`theme.colors.panel`) with an `ActivityIndicator` centered in the portrait area. Hide indicator on `onLoad`, show error text on `onError`.
- **Title banner** overlapping the image bottom edge (`marginTop: -24, zIndex: 2`)
  - Displays `MOCK_META.title`
  - Background: `theme.colors.primaryStrong` solid (no LinearGradient needed for a simple banner)
  - `transform: [{ rotate: '-1deg' }]`
  - Centered via `alignSelf: 'center'`, `paddingHorizontal: 28, paddingVertical: 6`
  - Text: bold, `theme.colors.text`, tracking wide
- **Description** below the banner
  - `MOCK_META.description` in italic, `theme.colors.textMuted`, centered
  - Container: `theme.colors.panel` background with subtle top border

- **Card shadow values**:
  ```ts
  // iOS
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.7,
  shadowRadius: 24,
  // Android
  elevation: 12,
  ```

#### 2b — Stats Grid Section
- Separate card below the portrait card
- Section header: **"GENERATION"** (uppercase, `theme.colors.primary`, letterSpacing 2)
- Subtitle: **"Pipeline parameters"** (small muted text, `theme.colors.textMuted`)
- 3-column flexbox layout: `flexDirection: 'row', flexWrap: 'wrap'`, each item `width: '33.33%'`
- Each cell (padded `View`):
  - **Label**: stat key (tiny uppercase, `theme.colors.textMuted`, fontSize 10)
  - **Value**: stat value (large bold, `theme.colors.text`, fontSize 20)
  - No modifier calculation needed (these are raw pipeline params, not D&D scores)
- Alternating cell backgrounds: even cells `theme.colors.card`, odd cells `theme.colors.panel`
- Bottom border on each cell: `borderBottomWidth: 2, borderBottomColor: 'rgba(184, 160, 255, 0.15)'`

#### 2c — Lore Section
- `borderLeftWidth: 4, borderLeftColor: 'rgba(184, 160, 255, 0.5)'`
- Background: `theme.colors.card`
- Italic lore text from `MOCK_META.lore`, wrapped in typographic quotes (`"\u201C...\u201D"`)
- **No "View Full Dossier" button** — removed to avoid dead-end UX. Will be added when there's a real destination.

#### 2d — Prompt Display
- Small section showing the original prompt
- Label: "ORIGINAL PROMPT" (uppercase, tiny, muted)
- Text: `result.prompt` (regular weight, `theme.colors.text`)

#### 2e — Action Button
- "Generate Another" button → calls `onReset()`
- Existing purple accent styling:
  ```ts
  borderColor: 'rgba(184, 160, 255, 0.35)',
  backgroundColor: 'rgba(184, 160, 255, 0.12)',
  ```

#### 2f — Entrance Animation
Use React Native's built-in `Animated` API (consistent with `LoadingScreen`'s existing orb animation):
```ts
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(20)).current;

useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
  ]).start();
}, []);
```
Wrap the card in `<Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>`.

### Step 3 — No Changes Needed
These files require **no changes**:
- `App.tsx` — already passes correct props to `ResultScreen`
- `services/api.ts` — image URL resolution unchanged
- `theme.ts` — existing palette used as-is
- `ScreenShell.tsx` — still used by `SummonScreen` and `LoadingScreen`
- `SummonScreen.tsx` / `LoadingScreen.tsx` — unaffected
- Backend — no API changes

---

## React Native Translation Notes

| Archive Design (Web) | React Native Equivalent |
|---|---|
| `blur-[80px]` glow | `View` with `borderRadius: 140, backgroundColor: 'rgba(141,118,255,0.12)'` positioned absolute — same approach as `ScreenShell.backgroundGlowOne` |
| `grayscale + sepia` on image | Semi-transparent overlay `View` with `rgba(5, 7, 14, 0.12)` |
| `rotate(-1deg)` | `transform: [{ rotate: '-1deg' }]` |
| `grid-cols-3` | `flexDirection: 'row', flexWrap: 'wrap'`, each item `width: '33.33%'` |
| `border-l-4` | `borderLeftWidth: 4, borderLeftColor: 'rgba(184,160,255,0.5)'` |
| `card-shadow` (box-shadow) | iOS: `shadowColor: '#000', shadowOffset: {w:0,h:16}, shadowOpacity: 0.7, shadowRadius: 24`; Android: `elevation: 12` |
| `inset-2` inner border | `position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1, borderColor: 'rgba(184,160,255,0.1)'` |
| Framer Motion fade-in | `Animated.timing` with `opacity` + `translateY`, `useNativeDriver: true` |
| `hover:` states | `Pressable` with `({ pressed }) => [style, pressed && pressedStyle]` |

---

## What's Mock / Placeholder (will be replaced later)
- `MOCK_META.title` — hardcoded, future: AI-generated title from backend
- `MOCK_META.description` — hardcoded, future: AI-generated description
- `MOCK_META.lore` — hardcoded, future: AI-generated narrative
- `MOCK_META.stats` — hardcoded pipeline params, future: real values from backend response

## What's Real / Connected
- Generated image from `result.imageUrl` (backend text-to-image pipeline)
- Original prompt from `result.prompt`
- Image load/error callbacks (debug tracing)
- "Generate Another" button → `onReset()` → back to SummonScreen
- Debug panel rendering (if debug mode enabled)

---

## File Changes Summary
| File | Action | Details |
|---|---|---|
| `src/types.ts` | **Edit** | Add `ImageMeta` interface |
| `src/screens/ResultScreen.tsx` | **Rewrite** | Archive-style card layout, mock data inline, entrance animation, image loading state |
