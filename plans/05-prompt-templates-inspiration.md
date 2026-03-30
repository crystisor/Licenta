# Feature: Prompt Templates / Inspiration

## Goal
Lower the barrier for first-time users by providing curated prompt templates, category chips, and a shuffle button that fills in a random prompt they can edit. Also provide motion prompt suggestions on ResultScreen for the I2V step.

## Current State
- `SummonScreen.tsx` has an empty `STATUS_PILLS` array and a `pillRow` container already styled — this is the perfect slot for category chips
- `pillRow` uses `flexWrap: 'wrap'` which will stack poorly with 6+ chips on narrow screens — needs to become a horizontal `ScrollView`
- Prompt is managed via `onPromptChange` prop, so filling in a template just calls that callback
- ResultScreen has a motion prompt input but no suggestions for it

## Plan

### 1. Create prompt templates data file
**File:** `frontend/src/data/promptTemplates.ts`

Define an array of template categories, each with a label and a list of curated prompts.
Categories should match the app's fantasy card theme:

```ts
export interface PromptTemplate {
  label: string;       // chip text, e.g. "Fantasy Warrior"
  prompts: string[];   // pool of well-crafted prompts for this category
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    label: 'Fantasy Warrior',
    prompts: [
      'A battle-scarred orc warlord in obsidian plate armor, standing atop a cliff at sunset, dramatic rim lighting, oil painting style, wide-angle shot',
      'An elven paladin in gleaming silver armor raising a glowing sword in a dark forest, volumetric god rays, cinematic framing',
      // ... 3-5 prompts per category
    ],
  },
  { label: 'Dark Sorcerer', prompts: [ ... ] },
  { label: 'Nature Spirit', prompts: [ ... ] },
  { label: 'Dragon Rider', prompts: [ ... ] },
  { label: 'Mythical Beast', prompts: [ ... ] },
  { label: 'Undead Lord', prompts: [ ... ] },
  { label: 'Celestial Knight', prompts: [ ... ] },
  { label: 'Forest Witch', prompts: [ ... ] },
];

// Motion prompt suggestions for the I2V step on ResultScreen
export const MOTION_SUGGESTIONS: string[] = [
  'Slow cinematic camera orbit around the character',
  'Wind blowing through hair and cape, subtle breathing',
  'Dramatic zoom in with particle effects',
  'Flickering firelight casting moving shadows',
  'Character turns head slowly toward the camera',
];
```

Each image prompt should follow the helper text advice: subject, lighting, mood, medium, camera framing.

### 2. Add shuffle button + category chips to SummonScreen
**File:** `frontend/src/screens/SummonScreen.tsx`

Changes:
- Import `PROMPT_TEMPLATES` from the data file
- Remove the empty `STATUS_PILLS` array
- Replace the `pillRow` `View` with a horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`)
- Render category chips from `PROMPT_TEMPLATES` as `Pressable` elements
- Add a small shuffle/dice icon button inline at the **start** of the chip row (not a full-width button — avoids competing with the "Generate image" CTA)
- Track `activeCategory` index in local `useState` to highlight the last-tapped chip

**UI layout** (inside the existing `card` View, above the text input):

```
[ 🎲 ] [ Fantasy Warrior ] [ Dark Sorcerer ] [ Nature Spirit ] ...  ← horizontal scroll
```

- Shuffle button: small square, `theme.colors.accent` border, same height as chips
- Category chips: reuse the existing `pill`/`pillText` styles
- Active chip (last tapped): highlighted border using `theme.colors.primaryStrong`
- Horizontal `ScrollView` keeps the card compact regardless of how many categories exist

### 3. Add motion prompt suggestions to ResultScreen
**File:** `frontend/src/screens/ResultScreen.tsx`

Changes:
- Import `MOTION_SUGGESTIONS` from the data file
- Add a horizontal chip row below the motion prompt input
- Tapping a motion suggestion chip fills the motion prompt input

### 4. Behavior

**SummonScreen:**
- **Shuffle button**: picks a random category, then a random prompt within it → calls `onPromptChange(randomPrompt)`, sets `activeCategory` to that category
- **Chip tap**: picks a random prompt from that category → calls `onPromptChange(randomPrompt)`, sets `activeCategory` to that category index
- Template always **replaces** existing text (simple and predictable)
- No new state needed in AppContext — `activeCategory` is local `useState` only

**ResultScreen:**
- **Motion chip tap**: fills the motion prompt input with that suggestion
- Same replace behavior

## Files Changed
| File | Action |
|------|--------|
| `frontend/src/data/promptTemplates.ts` | **Create** — image template categories + motion suggestions |
| `frontend/src/screens/SummonScreen.tsx` | **Edit** — add shuffle button + category chips in horizontal ScrollView |
| `frontend/src/screens/ResultScreen.tsx` | **Edit** — add motion prompt suggestion chips |

## No Backend Changes Required
This is a frontend-only feature.
