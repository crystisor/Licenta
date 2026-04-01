# Loading Screen Animation & UX Ideas

## Current State

- Dark themed screen with "RITUAL IN PROGRESS" badge
- Avatar circle with initials "AL" and breathing orb animation (Animated API, scale 0.94-1.08)
- Linear progress bar with percentage
- Four status steps with green dot indicators
- `LoadingScreen.tsx` uses simulated progress (fake 6% every 340ms)
- `VideoLoadingScreen.tsx` uses real backend polling every 10s via `/generate/animate/status/{job_id}`
- `SummonScreen.tsx` already uses `Loading screen background.mp4` as a video background
- Only React Native's built-in `Animated` API is used for animations currently

## Tech Stack Context

This is an **Expo React Native** app. All animation ideas must use:

| Need | Library | Status |
|------|---------|--------|
| Basic animations | `Animated` (built-in RN) | Already used |
| High-perf animations | `react-native-reanimated` | **Needs install** |
| SVG morphing / paths | `react-native-svg` | **Needs install** |
| Haptic feedback | `expo-haptics` | **Needs install** |
| Audio/video playback | `expo-av` | Already installed |
| Gradients | `expo-linear-gradient` | Already installed |
| Advanced canvas/Skia | `@shopify/react-native-skia` | **Needs install (optional)** |

**Install command:**
```bash
cd frontend
npx expo install react-native-reanimated react-native-svg expo-haptics
```

> **No CSS/web APIs available.** No `box-shadow`, `@keyframes`, `will-change`, `<div>`, `OffscreenCanvas`, or DOM elements. Use `Animated`, `reanimated`, or Skia equivalents.

---

## 0. Video Background Integration

The `Loading screen background.mp4` (5MB) is already used in `SummonScreen.tsx`. It should also serve as the loading screen background using `expo-av`'s `<Video>` component with `resizeMode="cover"`, `shouldPlay`, `isLooping`.

**Implications for other effects:**
- Background gradient drift (Section 4) becomes unnecessary — the video already provides atmospheric motion
- Particle fields should be **semi-transparent overlays** on top of the video, not replacements
- Floating light orbs may conflict with the video — test before committing to both
- Keep overlay effects subtle (`opacity: 0.3-0.5`) so the video remains visible

---

## 1. Progress Bar Enhancements

### Glowing Pulse Effect
Use `react-native-reanimated`'s `useSharedValue` + `withRepeat(withTiming(...))` to animate the `opacity` of an overlay `<View>` on the filled bar. Cycle opacity between 0.6-1.0 over ~1.5s. Gives a "breathing" sense of activity.

### Shimmer Sweep
Use `expo-linear-gradient` with an animated `translateX` to sweep a highlight across the filled portion. Drive the translation with `Animated.loop(Animated.timing(...))`. This is the RN equivalent of a CSS shimmer.

### Liquid Fill / Wave Top
Use `react-native-svg` to render a small sine-wave `<Path>` at the leading edge of the bar. Animate the path's `d` attribute with `reanimated` to shift the wave phase. More effort than shimmer but visually distinct.

### Percentage Counter Animation
Animate the number from 0 to current value using `reanimated`'s `useDerivedValue` + `withTiming`. Display via `<ReText>` from `react-native-redash` or a custom animated text component. The count-up runs on mount and on each progress update from the backend.

---

## 2. Avatar Circle

### Breathing Ring
Already partially implemented (scale 0.94-1.08). Enhance by adding an opacity oscillation and layering a second ring with a slightly offset timing for a more organic feel. Use `Animated.parallel` or `reanimated` `withSequence`.

### Orbiting Particles
Use 3-5 small `<View>` dots with absolute positioning. Animate each with `reanimated`'s `withRepeat(withTiming(...))` on `transform: [{ rotate }]` at different speeds (3s, 4s, 5s). Parent each dot in a container centered on the avatar.

### Gradient Ring Rotation
Use `expo-linear-gradient` inside a circular masked view. Animate the gradient angle by rotating the entire gradient container with `transform: [{ rotate: withRepeat(withTiming('360deg', { duration: 3000 })) }]`.

### Ripple / Sonar Effect
Emit 2-3 concentric `<View>` rings with `borderRadius` set to circle. Each scales from 1 to 2 and fades from 0.4 to 0 over 2s, staggered by 600ms using `withDelay`. Fits the "ritual" theme.

---

## 3. Status Steps (Checklist)

### Staggered Fade-In
Each step animates in with `opacity: 0 -> 1` and `translateY: 10 -> 0` using `reanimated`'s `FadeInUp.delay(index * 250)` (entering animation). This is trivial with `reanimated` layout animations.

### Dot -> Checkmark Morph
Use `react-native-svg` with a `<Path>` element. Animate `strokeDashoffset` from full length to 0 to "draw" the checkmark. Trigger when a step's status changes to complete. The `stroke-dashoffset` trick works the same in RN SVG as on web.

### Active Step Pulse
The in-progress step's dot should pulse (scale 1.0-1.3, opacity 0.7-1.0) using `withRepeat(withSequence(withTiming(...), withTiming(...)))`. Completed steps stay static. Tells the user exactly where the process is.

### ~~Typewriter Text~~ (Removed)
~~Reveal text character-by-character with a blinking cursor.~~

**Why removed:** Status step text is known the moment the backend reports it. Artificially delaying its display frustrates users who are already waiting 30-120s for generation. The animation would fight the UX, not help it.

**Replacement — Fade-in text:** When a new step becomes active, fade its text in over 300ms. Fast, clean, informative.

---

## 4. Background & Atmosphere

### ~~Gradient Drift~~ (Removed)
**Why removed:** The `Loading screen background.mp4` already provides atmospheric background motion. A gradient drift underneath or on top would conflict visually.

### Subtle Particle Overlay
If the video background feels too static in some areas, add a light particle layer using `reanimated` — 15-20 small `<View>` dots with absolute positioning, slow random drift via `withRepeat(withTiming(...))`. Keep `opacity: 0.15-0.3` so they don't overpower the video. Test on device to ensure it complements rather than clashes.

### Noise / Grain Overlay
A semi-transparent noise texture as an `<Image>` overlay with `opacity: 0.03-0.05`. Use a small tiling PNG and `resizeMode="repeat"`. Optionally animate its position slightly with `reanimated` for a film-grain feel. Lightweight on the GPU.

### Floating Light Orbs
The existing teal/purple blurred circles could slowly drift and pulse on top of the video. Use `reanimated` with long durations (15-20s) and different easing per orb. **Test with the video background first** — if the video already has similar elements, skip this to avoid visual noise.

---

## 5. Micro-Interactions & Polish

### "RITUAL IN PROGRESS" Badge
Add a shimmer sweep across the badge text using `expo-linear-gradient` + animated `translateX`, similar to the progress bar shimmer. Alternatively, pulse the badge border opacity in sync with the progress bar glow.

### Choreographed Exit Transition
When loading hits 100%: fade progress elements out (300ms), scale the avatar up slightly (200ms), then crossfade to the result screen (300ms). Use `reanimated`'s `withSequence` and `withDelay` to choreograph. Total: ~800ms. Navigation transition should be `fade` not `slide`.

### Haptic Feedback
Use `expo-haptics` to trigger feedback on step completion:
```typescript
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```
Trigger once per step completion. Light impact is subtle and appropriate.

### Sound Design (Optional)
Use `expo-av` (already installed) to play a short chime on step completion:
```typescript
import { Audio } from 'expo-av';
const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/chime.mp3'));
await sound.playAsync();
```
- Keep sounds under 1s, volume low
- Handle audio focus: set `Audio.setAudioModeAsync({ playsInSilentModeIOS: false })` so it respects the device's silent switch
- Off by default, toggled in settings
- Remember to call `sound.unloadAsync()` on cleanup to avoid memory leaks

---

## 6. Progress Tracking Strategy

The animation plan depends on how progress data flows from backend to frontend.

### Current Implementation
- **Method:** HTTP polling every 10 seconds
- **Endpoint:** `GET /generate/animate/status/{job_id}`
- **Response:** `{ status, progress (0-100), video_url, detail }`
- **Backend calculates progress** based on elapsed time (not actual pipeline step)

### Recommendations

**Short-term (use now):**
- Keep polling but reduce interval to **3-5 seconds** for more responsive progress updates
- Smooth the progress bar between polls using `reanimated`'s `withTiming` (e.g., animate from 40% to 55% over 3s instead of jumping)
- Map backend progress ranges to status steps:
  - 0-10%: "Preparing the ritual circle..."
  - 10-40%: "Channeling the image..."
  - 40-60%: "Weaving motion into frames..."
  - 60-90%: "Rendering the final vision..."
  - 90-100%: "Sealing the summoning..."

**Future improvement (SSE):**
- Replace polling with Server-Sent Events for real-time progress
- FastAPI supports SSE via `StreamingResponse`
- Eliminates the 3-10s latency gap between actual progress and displayed progress
- Enables step-level granularity (e.g., "denoising step 12/35")

---

## 7. Performance Considerations

- **Use `react-native-reanimated` for all animations** — runs on the UI thread via worklets, won't block JS thread
- **Avoid `Animated` API for complex compositions** — it bridges to native but can drop frames under JS load; `reanimated` avoids this entirely
- **Video background (`expo-av`)** runs natively and has negligible CPU cost; safe to layer animations on top
- **Limit particle count to 15-20** with simple transforms only (`translateX/Y`, `opacity`). No shadows or blur on particles
- **SVG animations** (`react-native-svg`) are more expensive than view transforms. Use sparingly (checkmark morph only, not continuous animations)
- **Test on target phone hardware.** The DGX Spark backend has plenty of power, but the phone rendering the UI may be mid-range. Profile with Expo dev tools
- **Respect `AccessibilityInfo.isReduceMotionEnabled`** (RN equivalent of `prefers-reduced-motion`) — see Accessibility section

---

## 8. Accessibility

- Respect `AccessibilityInfo.isReduceMotionEnabled`: disable particle overlays, orbiting elements, shimmer effects, and ripples. Keep only the progress bar fill and percentage counter
- Progress bar component needs: `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: 100, now: progress }}`
- Status steps container should use `accessibilityLiveRegion="polite"` so TalkBack/VoiceOver announces new steps as they complete
- Maintain sufficient color contrast on all text — verify cyan-on-dark palette passes WCAG AA (4.5:1 ratio minimum)
- Haptic feedback is inherently accessible — keep it enabled regardless of reduced motion setting

---

## Priority Ranking

| Priority | Enhancement | Effort | Impact | Library Needed |
|----------|------------|--------|--------|----------------|
| 1 | Staggered step fade-in + active pulse | Low | High | reanimated |
| 2 | Progress bar shimmer sweep | Low | High | expo-linear-gradient (have it) |
| 3 | Video background on loading screen | Low | High | expo-av (have it) |
| 4 | Smooth progress interpolation between polls | Low | High | reanimated |
| 5 | Avatar breathing ring enhancement | Low | Medium | reanimated |
| 6 | Percentage count-up animation | Low | Medium | reanimated |
| 7 | Haptic feedback on step complete | Low | Medium | expo-haptics |
| 8 | Dot -> checkmark morph | Medium | High | react-native-svg |
| 9 | Ripple / sonar effect on avatar | Medium | Medium | reanimated |
| 10 | Choreographed exit transition | Medium | High | reanimated |
| 11 | Particle overlay | Medium | Low-Med | reanimated |
| 12 | Reduce polling interval to 3-5s | Low | Medium | none |
