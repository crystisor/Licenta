# Logo Red Theming — Home Page

## Context

The home page at `frontend/app/home.tsx` renders `SummonScreen`, which composes several Spark-themed components. These components use a dark aesthetic with red (`#dc2626`) as the brand color, defined in `sparkTheme` inside `frontend/src/theme.ts`.

Two logo assets are displayed on the home page, but they have not yet been adapted to the red theme:

| Asset | File | Used In |
|---|---|---|
| Stable Diffusion logo | `frontend/assets/logos/sd.png` | `SparkFeatureRow.tsx` → SDXL Image feature card |
| Wan logo | `frontend/assets/logos/wan.png` | `SparkFeatureRow.tsx` → Wan 2.2 Video feature card |

These are the **original multi-color SD and Wan branding images**. They currently appear as-is (likely blue/purple/green) against the dark-red Spark theme, creating a visual mismatch.

The third feature card (`"Card Battle"`) uses the emoji `⚔️` — no logo theming needed for it.

## Goal

Make both logos **monochrome red** to match the `sparkTheme.colors.brand` (`#dc2626`) so the feature cards feel cohesive with the rest of the home screen redesign.

## Relevant Files

```
frontend/
├── src/
│   ├── components/
│   │   └── spark/
│   │       ├── SparkFeatureRow.tsx   ← imports & renders both logos
│   │       └── SparkFeatureCard.tsx  ← renders the icon slot (no logo logic)
│   └── theme.ts                      ← sparkTheme.colors.brand = '#dc2626'
└── assets/
    └── logos/
        ├── sd.png                    ← original SD logo (multi-color)
        └── wan.png                   ← original Wan logo (multi-color)
```

## Approach Options

### Option A: React Native `tintColor` Style (Recommended)

React Native's `Image` component accepts a `tintColor` style property that replaces all non-transparent pixels with a single color. This is the simplest approach — a one-line change.

**How it works**: All opaque/visible pixels in the PNG are rendered in the tint color. Since logos are typically dark shapes on transparent backgrounds, the result is a solid red monochrome logo.

**Pros**:
- No new assets needed
- Works on both iOS and Android (React Native 0.62+)
- Single-line change in `SparkFeatureRow.tsx`
- Automatically stays in sync with the theme if we reference the theme token

**Cons**:
- If the logos have internal transparency or gradients, those get flattened to solid red
- Slight rendering differences between iOS and Android (but negligible for logos at 56×56)

### Option B: Create Pre-Tinted PNG Assets

Export red-colored versions of the logos and save as `sd-red.png` and `wan-red.png`.

**Pros**: Full control over the exact look, no runtime overhead.

**Cons**: New static assets to maintain; if the brand color changes, assets need re-exporting.

### Option C: Replace with SVG + Programmatic Fill

Convert logos to SVG and use `react-native-svg` (already a dependency). Set `fill={sparkTheme.colors.brand}`.

**Pros**: Fully dynamic, cleanest output, scales perfectly.

**Cons**: Requires tracing/converting the original PNGs to SVG paths — non-trivial effort. More complex implementation.

---

## Decision: Option A — `tintColor`

Simplicity wins. The logos are small (56×56) and will look perfectly fine as solid red monochrome icons. One-line change, no new assets, no new dependencies.

## Implementation Steps

### Step 1 — Apply `tintColor` to both logo images

**File**: `frontend/src/components/spark/SparkFeatureRow.tsx`

Change the two `<Image>` components to include `tintColor` in their style:

```tsx
// Current:
<Image source={SD_LOGO} style={styles.logo} resizeMode="contain" />

// Proposed:
<Image
  source={SD_LOGO}
  style={[styles.logo, { tintColor: sparkTheme.colors.brand }]}
  resizeMode="contain"
/>
```

Same for the WAN_LOGO.

### Step 2 — Verify

Run `cd frontend && npx expo start`, open on device/emulator, and confirm:
- Both logos render as solid red (`#dc2626`) on the home page
- The logos look legible (not washed out or distorted)
- The feature card layout is unaffected
- No visual regression on other screens (no other screens use these logos)

## Edge Cases / Notes

1. **Android tintColor**: React Native's `Image` component supports `tintColor` as a style prop on both platforms since RN 0.62. The project uses Expo SDK 52+, which bundles RN 0.76+ — fully compatible.

2. **Third-party alternatives**: If the PNGs were ever replaced with `expo-image` components, `tintColor` is also supported there as a prop.

3. **Fallback**: If `tintColor` doesn't produce the desired look on Android, Option A can be replaced by wrapping each logo in a `<View>` with a red overlay:
   ```tsx
   <View style={styles.logoWrap}>
     <Image source={SD_LOGO} style={styles.logo} resizeMode="contain" />
     <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(220, 38, 38, 0.85)' }]} />
   </View>
   ```
   But this should not be necessary — `tintColor` is reliable.

4. **No other screens affected**: The logos are only used in `SparkFeatureRow`, which is only rendered on the home screen via `SummonScreen`. No regression risk for Gallery, Battle, Loading, or Result screens.

## Effort Estimate

- **Change**: 2 lines in 1 file
- **Risk**: Extremely low — style-only change
- **Test**: Visual check on one device (iOS or Android)
- **Total**: ~5 minutes
