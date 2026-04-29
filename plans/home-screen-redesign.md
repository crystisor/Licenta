# Home Screen Redesign — Spark Arena Inspired

Source design system: [spark-arena.com/](../spark-arena.com/) (extracted via design-token scrape — see [report.md](../spark-arena.com/report.md) and [screenshot.png](../spark-arena.com/screenshot.png))

Target screen: [SummonScreen.tsx](../frontend/src/screens/SummonScreen.tsx) (rendered from [app/home.tsx](../frontend/app/home.tsx))

---

## 1. Goals

- Replace the current purple/teal "ritual" aesthetic with a **dark + saturated-red** look modeled on spark-arena.com (recolored — green → red).
- Drop the video background on this screen in favor of a **static near-black gradient + ambient overlays**, matching the spark-arena page where atmosphere comes from drifting haze + slow star parallax instead of a video.
- Restructure the home page from a single centered "card" into a **multi-section landing** flow: hero → feature row → prompt console → recent gallery preview → footer/maintainers.
- Apply only to the home screen — the rest of the app keeps its current purple/teal `theme`.
- Preserve all existing behavior: prompt input, shuffle, category chips, free/token currency display, error handling, navigation to Gallery and Battle.

## 2. Non-goals

- Not redesigning Battle, Gallery, Result, or Loading screens in this pass.
- Not switching off Expo / React Native — all CSS/web tokens must be re-expressed as React Native style values.
- Not introducing Tailwind or NativeWind. Stay with the existing `theme.ts` + `StyleSheet` pattern.
- No new external dependencies beyond what is already used or what is already pre-listed in the loading-screen plan (`react-native-reanimated`, `react-native-svg`, `expo-haptics`).

---

## 3. Design tokens — port to `theme.ts`

Spark Arena's structure is preserved but recolored: black/near-black backgrounds, a neutral gray ramp, and a single saturated **brand red** (`#dc2626`, Tailwind red-600 — the same shade that already shows up in spark-arena's danger-state hover rules at [animations.css:67](../spark-arena.com/animations.css#L67) and [animations.css:121-125](../spark-arena.com/animations.css#L121-L125)). Where the source uses `#76b900` we substitute `#dc2626` everywhere — for borders, hover bg, focus rings, glow shadow, etc.

This is a **home-only theme variant**. The rest of the app keeps the current `theme`. We add a separate `sparkTheme` namespace; only `SummonScreen` and its children read from it.

### Tokens to add

```ts
// frontend/src/theme.ts
export const sparkTheme = {
  colors: {
    bg: '#000000',
    bgElevated: '#090a0a',
    bgGradientTop: '#0a0000',     // very dark red-tinted black for the static gradient top
    bgGradientBottom: '#000000',  // pure black at the bottom
    border: '#262626',
    borderHover: '#404040',
    textPrimary: '#fbfbfb',
    textSecondary: '#d4d4d4',
    textMuted: '#a3a3a3',
    textDim: '#737373',
    brand: '#dc2626',                       // red-600 — replaces #76b900
    brandHover: 'rgba(220, 38, 38, 0.9)',   // .hover:bg-brand/90
    brandSoft: 'rgba(220, 38, 38, 0.05)',   // .hover:bg-brand/5
    brandSoftHover: 'rgba(220, 38, 38, 0.3)', // .hover:bg-brand/30
    brandBorder: 'rgba(220, 38, 38, 0.5)',  // .hover:border-brand/50
  },
  radius: { sm: 8, md: 12, lg: 16, pill: 9999 },
  spacing: { 1: 4, 2: 6, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 32 },
  shadow: {
    brand: {
      shadowColor: '#dc2626',
      shadowOpacity: 0.2,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },
  type: {
    h1: { fontSize: 40, lineHeight: 48, fontWeight: '700' as const },
    h3:   { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
    small:{ fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    micro:{ fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.3 },
  },
  motion: {
    fast: 150,        // matches spark-arena's 0.15s transitions
    haze: 30000,
    stars: 80000,
  },
};
```

Source values come from [tokens.css](../spark-arena.com/tokens.css), [theme.css](../spark-arena.com/theme.css), and [tailwind.config.js](../spark-arena.com/tailwind.config.js) — with every brand-green hex replaced by `#dc2626` (and rgb `220, 38, 38`).

### Typography

Inter is already implicit on Android/iOS via system sans. To match exactly, add `expo-font` + the Inter family later — but font-fallback is acceptable for v1.

---

## 4. Layout — sections (top to bottom)

The current screen is a single 620-px-wide card with input + buttons. The redesign breaks it into four sections, all stacked in the existing `<ScrollView>`:

```
┌───────────────────────────────────────┐
│  HERO                                 │  ← eyebrow pill, big title, subtitle, 3 CTAs
├───────────────────────────────────────┤
│  FEATURE TRIPLE                       │  ← 3 columns: Image gen / Video gen / Card battle
├───────────────────────────────────────┤
│  PROMPT CONSOLE                       │  ← chips + textarea + Generate button (current card)
├───────────────────────────────────────┤
│  RECENT GENERATIONS (carousel)        │  ← horizontal infinite-scroll of past generations
├───────────────────────────────────────┤
│  FOOTER — Built With / Models / Links │  ← three columns
└───────────────────────────────────────┘
```

### 4.1 Hero

Replicates [screenshot.png](../spark-arena.com/screenshot.png) top section.

- **Eyebrow pill**: `"AI CARDS"` in brand-red text on `brandSoft` bg, `pill` radius, `micro` type, uppercase, `0.3px` letter-spacing.
- **Title**: `"Forge fantasy character cards"` — `h1`, white. Reuse the current copy.
- **Subtitle**: `"Describe a character — race, class, gear, lore — and watch SDXL + Wan 2.2 turn it into a card and a short cinematic."` Two lines max, `textSecondary`.
- **CTA row** — all three remain top-level home actions, horizontal on tablet/landscape, stacked on phone-portrait:
  1. **Primary**: `"Generate Image"` — solid brand-red bg, white text, `brand` red-glow shadow. Scrolls to the prompt console.
  2. **Secondary**: `"Open Gallery"` — outline, brand-red border, brand-red text.
  3. **Tertiary**: `"Battle"` — outline, neutral `border` color, white text. (User confirmed it stays as a top-level CTA.)

### 4.2 Feature triple

3-up grid (column on narrow widths) showing the pipeline:

| Column | Title | Body |
|---|---|---|
| 🎨 | **SDXL Image** | Juggernaut XL Ragnarok, 35-step DPM++ 2M SDE Karras, 832×1216 portrait. |
| 🎬 | **Wan 2.2 Video** | Dual high/low-noise 14B I2V models, LightX2V 4-step LoRAs, 81 frames @ 640. |
| ⚔️ | **Card Battle** | Earn tokens by winning duels. Spend tokens for extra generations. |

Card spec: `bgElevated` background, 1px `border`, `lg` radius, `space-7` padding, `space-3` gap between icon/title/body. Hover (web) / press (mobile): border transitions to `brandBorder` over 150ms, lifts `-4px` (translateY).

### 4.3 Prompt console (the existing card)

Keep the structure of [SummonScreen.tsx:54-140](../frontend/src/screens/SummonScreen.tsx#L54-L140) but restyle:

- Outer panel: solid `bgElevated`, `border` color, `lg` radius, no purple glow. (Full opacity now that there's no video underneath.)
- Chip row: keep `Shuffle` button + 8 category pills. Restyle to spark-arena pill: `borderRadius: pill`, `border`-colored stroke, `bg` on rest, `brandSoft` on press, brand-red text on active.
- Text input: black bg (`#000`), `border` stroke, `border` on focus → `brandBorder` (matches `.focus\:border-nvidia-green\/50`, recolored).
- "Generate Image" button: solid brand red, drops `brand` red-glow shadow on rest, opacity `0.9` on press, `scale 0.95` on press (mirrors `.active\:scale-95`).
- Currency row stays as-is, but use `textMuted` and `brand` for the `+ N tokens` accent.

### 4.4 Recent generations (new) — auto-scrolling

Inspired by the spark-arena `stats-carousel-scroll` band. Auto-scroll is **on** (user confirmed):

- Horizontal `ScrollView` with `pagingEnabled={false}` and an auto-scroll `Animated.loop` driving `translateX` from 0 to `-width / 2` over a long duration (~120s — much faster than the website's 600s, slow enough to feel ambient, not distracting).
- Render the source list **doubled** (`[...items, ...items]`) so the loop wraps seamlessly when `translateX` resets to 0.
- Pause the loop while the user is touch-dragging the scroll view (`onScrollBeginDrag` → stop animation, `onScrollEndDrag` → resume from current offset). Resume after 3s of inactivity.
- Disable the auto-scroll entirely when `AccessibilityInfo.isReduceMotionEnabled()` resolves true.
- Source: pull last ~8 entries from the existing `historyStore` (already used by [GalleryScreen](../frontend/src/screens/GalleryScreen.tsx)).
- Each card: 160×220, image thumbnail + truncated prompt + tiny "Tokens: X" badge.
- Tap → navigates to `/history/[id]` (existing route).
- "View full gallery →" link on the right edge, brand red, opens `/gallery`.
- Skip the section entirely if there are 0 history entries.

### 4.5 Footer

Three columns (matches spark-arena bottom): 

- **Built With** — `SDXL`, `Wan 2.2 I2V`, `Expo / React Native`, `FastAPI`. Each is a small text link.
- **Models** — file names from [CLAUDE.md](../CLAUDE.md): `juggernautXL_ragnarokBy.safetensors`, `wan2.2_i2v_*_14B_fp8_scaled.safetensors`, `umt5_xxl`, `wan_2.1_vae`. Read-only labels.
- **About** — "University thesis project (Licenta) by [user]." Plus a GitHub link if applicable.

Below the columns: a single horizontal hairline + small `micro` line: `"© 2026 — Local single-GPU inference"`.

---

## 5. Background — static gradient + ambient overlays

The video background is **removed** on this screen (user choice). The new stack, bottom to top:

1. **Base gradient** — full-bleed `LinearGradient` from `bgGradientTop` (`#0a0000`, near-black with a faint red tint) at 0% → `bgGradientBottom` (`#000000`) at 100%. Angle: vertical (top → bottom). This replaces `ScreenShell`'s default purple gradient on this screen only.
2. **Radial red glow** (optional accent) — a large `View` with `bgElevated` color, very low opacity (~0.15), positioned behind the hero, blurred via `react-native-svg` `<RadialGradient>` (or simulated with concentric translucent circles). Mimics the soft red haze visible in the spark-arena hero.
3. **Haze drift overlay** — see 5.1 below.
4. **Stars drift overlay** — see 5.2 below.
5. Content (`SafeAreaView` + `ScrollView`) on top.

Two CSS keyframes from [animations.css](../spark-arena.com/animations.css) (`spark-haze-drift` and `spark-stars-drift`) are the visual signature of spark-arena.com. Re-implement in RN:

### 5.1 Haze drift (30s loop)

A large, soft radial blob that translates and scales subtly. RN can't apply CSS `filter: blur`, so use:

- A `LinearGradient` (already installed) inside a `View` of `~120%` width/height, color stops in low-alpha brand red (`rgba(220, 38, 38, 0.12)` → `transparent`).
- Drive `transform: [{ translateX }, { translateY }, { scale }]` with `react-native-reanimated`'s `withRepeat(withTiming(...), -1, true)` over 30000ms, easing `Easing.inOut(Easing.ease)`.
- Match the keyframe stops from `@keyframes spark-haze-drift`:
  - 0%: `translate(-6%, -4%) scale(1.02)`
  - 50%: `translate(5%, 3%) scale(1.05)`
  - 100%: back to start

### 5.2 Star drift (80s loop)

Spark-arena uses a triple-layer CSS background-image of dots; RN cannot animate `background-position`. Substitute with a `react-native-svg` layer of ~40 small white circles at randomized positions, animated as a single group:

- One `<G>` translated from `(0, 0)` to `(W*0.2, H*-0.1)` over 80000ms, repeating.
- A second `<G>` going the opposite direction at a different speed, for parallax.
- Opacity 0.25–0.4. Without a video underneath, contrast is now higher — keep it on the lower end so the stars don't dominate.

All overlays sit between the gradient and the `SafeAreaView` content, with `pointerEvents="none"`.

---

## 6. Hover / press / focus states

Spark-arena's stateRules table (see [animations.json](../spark-arena.com/animations.json)) defines a clear interaction language. RN map:

| spark-arena class | RN equivalent (recolored to red) |
|---|---|
| `.hover\:-translate-y-1` | `Pressable` `pressed` style: `translateY: -4` (or use `onHoverIn` on web) |
| `.hover\:scale-105` | `transform: [{ scale: 1.05 }]` driven on press in/out |
| `.active\:scale-95` | `pressed && { transform: [{ scale: 0.95 }] }` |
| `.hover\:border-nvidia-green\/50` | switch `borderColor` to `brandBorder` (red) on press |
| `.hover\:bg-nvidia-green\/90` | switch primary CTA bg to `brandHover` (red) on press |
| `.focus\:ring-nvidia-green` | `TextInput` style: `borderWidth: 2, borderColor: brand` (red) when focused |

Use a small helper `usePressedScale(targetScale: number)` returning a Reanimated style — define once in `frontend/src/components/sparkPress.ts` and reuse across all CTAs.

---

## 7. Component breakdown — files to add / change

### New components (`frontend/src/components/spark/`)

- `SparkHero.tsx` — eyebrow + title + subtitle + 3-button CTA row. Props: `onPrimaryPress`, `onGalleryPress`, `onBattlePress`.
- `SparkFeatureCard.tsx` — single card for the feature triple. Props: `icon: ReactNode`, `title`, `body`.
- `SparkFeatureRow.tsx` — wraps three `SparkFeatureCard`s with responsive 1-col/3-col layout via `useWindowDimensions`.
- `SparkPromptConsole.tsx` — receives the same props the current `SummonScreen` body uses (prompt, chips, error, currency, onCast), restyled to spark tokens.
- `SparkRecentCarousel.tsx` — auto-scrolling history strip. Reads `useHistory()` from context.
- `SparkFooter.tsx` — three-column credits.
- `SparkAmbient.tsx` — wraps the haze + stars overlays. Renders nothing if `prefersReducedMotion` is true (read via `AccessibilityInfo`).
- `sparkPress.ts` — shared press-scale hook.

### Changed files

- `frontend/src/theme.ts` — append `sparkTheme` block. Don't remove existing `theme`.
- `frontend/src/screens/SummonScreen.tsx` — rewrite as a thin composition of the new components. The screen body is its own root (no `ScreenShell`): a full-bleed `<LinearGradient>` (the static spark-arena gradient), then `<SparkAmbient />` overlays, then a `<SafeAreaView>` + `<ScrollView>` containing `<SparkHero />`, `<SparkFeatureRow />`, `<SparkPromptConsole />`, `<SparkRecentCarousel />`, `<SparkFooter />`. The `backgroundVideo` prop and the `Loading screen background.mp4` reference are removed from this screen.
- `frontend/src/components/ScreenShell.tsx` — **untouched**. Other screens still rely on it; the home screen simply opts out and renders its own shell.

### Untouched

- All other screens (`BattleArena`, `BattleHub`, `Gallery`, `Result`, `Loading`, etc.) keep current `theme`.
- `app/home.tsx` — no changes; `SummonScreen` keeps the same prop surface.
- Backend, pipelines, data store, services.

---

## 8. Implementation order

1. **Tokens** — add `sparkTheme` to `theme.ts`. Verify it compiles.
2. **Background swap** — rewrite `SummonScreen`'s root: drop the video, render a full-bleed `<LinearGradient>` with the new dark gradient. Existing card stays inside, just with no video showing through. This alone is a big visual change you can verify before adding new components.
3. **Hero** — build `SparkHero` + wire it into `SummonScreen` above the existing card.
4. **Feature row** — build `SparkFeatureCard` + `SparkFeatureRow`. Drop in below hero.
5. **Prompt console restyle** — extract the existing card body into `SparkPromptConsole` and apply the new tokens. Keep behavior identical.
6. **Press helper** — add `sparkPress.ts`, retrofit into all three CTAs + chips.
7. **Recent carousel** — reuse `historyStore`. Hide if empty. Wire up auto-scroll loop.
8. **Footer** — static content, low risk.
9. **Ambient motion** — last, behind a `__DEV__` flag first to test perf on the GPU-loaded device. Gate on `AccessibilityInfo.isReduceMotionEnabled()`.

Each step ends with: `cd frontend && npx expo start` → manual visual check on the connected device.

---

## 9. Decisions locked in

- **Scope**: home-only theme variant. No changes to other screens.
- **Battle CTA**: stays as a top-level button in the hero CTA row.
- **Recent-generations carousel**: auto-scrolls (paused while the user drags, disabled if reduce-motion is on).
- **Background**: static spark-arena-style dark gradient + ambient overlays. No video on this screen.
- **Brand color**: red (`#dc2626`) instead of green (`#76b900`). All references to "brand green" / "NVIDIA green" in the source design tokens map 1:1 to red here.

---

## 10. Reference assets in this folder

- [spark-arena.com/screenshot.png](../spark-arena.com/screenshot.png) — full-page reference render
- [spark-arena.com/tokens.json](../spark-arena.com/tokens.json) — raw token export
- [spark-arena.com/tokens.css](../spark-arena.com/tokens.css), [theme.css](../spark-arena.com/theme.css) — CSS custom properties
- [spark-arena.com/animations.css](../spark-arena.com/animations.css), [animations.json](../spark-arena.com/animations.json) — keyframes + transition catalog
- [spark-arena.com/tailwind.config.js](../spark-arena.com/tailwind.config.js) — Tailwind-flavored token map
- [spark-arena.com/report.md](../spark-arena.com/report.md) — extraction summary, color weights, type scale
