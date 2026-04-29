# Design system extract — https://spark-arena.com/

- Viewport: `1440x900`
- Visible elements scanned: **334** (of 11422)
- Document size: 1440×2361px
- Cross-origin iframes skipped: 3
- Color clustering: `oklab` (threshold 0.02)

![Full-page screenshot](screenshot.png)

## Colors

| Token | Hex | Swatch | Weight | Roles |
| --- | --- | --- | --- | --- |
| `brand` | `#76b900` | `#76b900` ▢ | 266.58 | border:13, backgroundColor:4, color:135, stroke:110, gradient:3 |
| `gray-50` | `#fbfbfb` | `#fbfbfb` ▢ | 114.69 | color:81, backgroundColor:1, border:4, gradient:1 |
| `gray-200` | `#d4d4d4` | `#d4d4d4` ▢ | 68.19 | color:44, stroke:24 |
| `gray-300` | `#a3a3a3` | `#a3a3a3` ▢ | 26.88 | color:26, gradient:1 |
| `gray-500` | `#737373` | `#737373` ▢ | 31.26 | color:31 |
| `gray-700` | `#262626` | `#262626` ▢ | 59.14 | border:52 |
| `gray-800` | `#090a0a` | `#090a0a` ▢ | 11.46 | backgroundColor:1, gradient:8 |
| `gray-950` | `#000000` | `#000000` ▢ | 27.22 | color:9, backgroundColor:5, stroke:6, gradient:5 |

## Fonts

- `font-1`: Inter, Inter Fallback
- `sans`: ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji

## Type scale

| Token | Tag | Size | Weight | Line-height | Letter-spacing | Italic | Count |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `h3` | `h3` | 20px | 700 | 28px | normal | — | 3 |
| `a` | `a` | 18px | 600 | 28px | normal | — | 6 |
| `h3-2` | `h3` | 18px | 700 | 28px | normal | — | 3 |
| `a-2` | `a` | 16px | 400 | 24px | normal | — | 18 |
| `a-3` | `a` | 14px | 400 | 20px | normal | — | 19 |
| `span` | `span` | 12px | 400 | 16px | 0.3px | — | 9 |

## Spacing scale

`4px`, `6px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`

## Border radii

- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 9999px

## Shadows

- `sm`: `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(118, 185, 0, 0.2) 0px 10px 15px -3px, rgba(118, 185, 0, 0.2) 0px 4px 6px -4px`

## Animations

- Stylesheets walked: 1  ·  cross-origin skipped: **0**
- CDP runtime events captured: 3 (unique: 3, window: 4000ms)

### Transitions

| Property | Duration | Easing | Delay | Count |
| --- | --- | --- | --- | --- |
| `color` | 0.15s | `cubic-bezier(0.4, 0, 0.2, 1)` | 0s | 20 |
| `background-color` | 0.15s | `cubic-bezier(0.4, 0, 0.2, 1)` | 0s | 20 |
| `border-color` | 0.15s | `cubic-bezier(0.4, 0, 0.2, 1)` | 0s | 20 |
| `text-decoration-color` | 0.15s | `cubic-bezier(0.4, 0, 0.2, 1)` | 0s | 20 |
| `fill` | 0.15s | `cubic-bezier(0.4, 0, 0.2, 1)` | 0s | 20 |
| `stroke` | 0.15s | `cubic-bezier(0.4, 0, 0.2, 1)` | 0s | 20 |

### CSS animations

| Name | Duration | Easing | Iterations | Count |
| --- | --- | --- | --- | --- |
| `stats-carousel-scroll` | 600s | `linear` | infinite | 1 |

### @keyframes definitions (5)

- `@keyframes pulse`
- `@keyframes spin`
- `@keyframes stats-carousel-scroll`
- `@keyframes spark-haze-drift`
- `@keyframes spark-stars-drift`

### State pseudo-class rules

Captured CSSOM rules whose selectors include `:hover` / `:focus` / `:active`. These describe how interactive surfaces change on user interaction, *without* the script having to actually click or hover.

- Rules captured: **51** (deduped) across states: `hover` (41), `focus` (9), `active` (1)

  - **`.hover\:-translate-y-1:hover`** [hover] — `--tw-translate-y: -.25rem`; `transform: translate(var(--tw-translate-x),var(--tw-translate-y))rotate(var(--tw-rotate))skewX(var(--tw-skew-x))skewY(var(--tw-skew-y))scaleX(var(--tw-scale-x))scaleY(var(--tw-scale-y))`
  - **`.hover\:scale-105:hover`** [hover] — `--tw-scale-x: 1.05`; `--tw-scale-y: 1.05`; `transform: translate(var(--tw-translate-x),var(--tw-translate-y))rotate(var(--tw-rotate))skewX(var(--tw-skew-x))skewY(var(--tw-skew-y))scaleX(var(--tw-scale-x))scaleY(var(--tw-scale-y))`
  - **`.hover\:border-neutral-600:hover`** [hover] — `--tw-border-opacity: 1`
  - **`.hover\:border-neutral-700:hover`** [hover] — `--tw-border-opacity: 1`
  - **`.hover\:border-nvidia-green:hover`** [hover] — `--tw-border-opacity: 1`
  - **`.hover\:border-nvidia-green\/50:hover`** [hover] — `border-top-color: rgba(118, 185, 0, 0.5)`; `border-right-color: rgba(118, 185, 0, 0.5)`; `border-bottom-color: rgba(118, 185, 0, 0.5)`; `border-left-color: rgba(118, 185, 0, 0.5)`
  - **`.hover\:border-red-500:hover`** [hover] — `--tw-border-opacity: 1`
  - **`.hover\:bg-black\/30:hover`** [hover] — `background-color: rgba(0, 0, 0, 0.3)`

### Runtime animations (CDP capture)

Animations that *actually fired* during page load + scroll. Includes CSS animations, transitions, and Web Animations API calls (Framer Motion / Motion One / modern GSAP).

| Name | Type | Duration | Easing | WAAPI? |
| --- | --- | --- | --- | --- |
| `spark-haze-drift` | CSSAnimation | 30000ms | `linear` | — |
| `spark-stars-drift` | CSSAnimation | 80000ms | `linear` | — |
| `stats-carousel-scroll` | CSSAnimation | 600000ms | `linear` | — |

### Motion hints

- **Transforms (rest state):** `matrix(1, 0, 0, 1, -1360.34, 0)` (1)

## Limitations

- **State styles read from CSSOM, not by interacting** — `:hover` / `:focus` / `:active` rules are captured by walking the stylesheet rules, but the script does not actually click or hover. JS-gated state changes (e.g. dropdowns toggled by `aria-expanded`) are not triggered.
- **Canvas / WebGL behavior is opaque** — `<canvas>` regions are detected, but pixel motion, particle systems, and shader output are not exposed as CSS. Only the canvas's box and any CSS animation applied *to* it are recovered.
- **JS-driven motion only when via WAAPI** — animations that mutate `element.style` directly bypass the CDP `Animation` domain and aren't seen. Modern libs (Framer Motion, Motion One, recent GSAP) use the Web Animations API and *are* captured.
- **Single viewport** — only `1440x900` was scanned. Re-run with `--viewport` for other sizes.
- **Same-origin only** — cross-origin iframes are unreadable from JS and were skipped.
- **No color-scheme variants** — `prefers-color-scheme: dark` styles aren't captured unless the site renders dark by default.
- **Dynamic content** — anything that appears only after click/hover/keyboard interaction is missed. The scroll pass handles lazy-loaded content but not click-triggered content.
- **Token names are heuristic** — the script can't know which color is "primary" or which font is "display". Rename in `tokens.json` if needed.
