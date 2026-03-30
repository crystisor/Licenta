# Feature 4 — Generation History / Gallery

## Goal

Persist every generation (prompt, image, card meta, video) so users can browse past creations and re-view the full card without re-generating.

---

## Data Model

```typescript
interface HistoryEntry {
  id: string;                  // UUID, primary key
  prompt: string;
  imageUri: string;            // local file path (downloaded from server)
  thumbnailUri: string;        // resized local file path for gallery grid
  cardMeta: CardMeta | null;   // title, lore, stats
  videoUri: string | null;     // local file path, nullable
  motionPrompt: string | null; // motion prompt used for video generation
  createdAt: number;           // epoch ms
}
```

Images and videos are downloaded to the app's local filesystem (`FileSystem.documentDirectory`) so entries survive even if the backend purges media.

---

## Storage

Use **expo-sqlite** (ships with Expo 52, no native rebuild needed).

| Why SQLite over AsyncStorage |
|---|
| Structured queries (sort by date, search by prompt) |
| Better performance with hundreds of entries |
| Easy pagination with LIMIT/OFFSET |

### Schema & Migrations

Use SQLite `user_version` pragma for schema versioning:

```sql
-- Version 1
CREATE TABLE IF NOT EXISTS history (
  id              TEXT PRIMARY KEY,
  prompt          TEXT NOT NULL,
  image_uri       TEXT NOT NULL,
  thumbnail_uri   TEXT NOT NULL,
  card_meta       TEXT,            -- JSON string
  video_uri       TEXT,
  motion_prompt   TEXT,
  created_at      INTEGER NOT NULL
);

PRAGMA user_version = 1;
```

On `initDb`, check `PRAGMA user_version` and run any pending migrations sequentially. This keeps schema changes safe for existing users.

### API Pattern — Expo 52 `SQLiteProvider`

Expo 52 uses the new synchronous API. Use `SQLiteProvider` + `useSQLiteContext()` hook, **not** the legacy `openDatabase`:

```tsx
// In _layout.tsx or AppProvider
<SQLiteProvider databaseName="history.db" onInit={migrateDb}>
  <AppProvider>{children}</AppProvider>
</SQLiteProvider>
```

### Module — `src/storage/historyDb.ts`

Exports:

| Function | Signature |
|---|---|
| `migrateDb` | `(db: SQLiteDatabase) => Promise<void>` — run pending migrations |
| `insertEntry` | `(db, entry: HistoryEntry) => void` |
| `getEntries` | `(db, limit: number, offset: number) => HistoryEntry[]` |
| `getEntry` | `(db, id: string) => HistoryEntry \| null` |
| `removeEntry` | `(db, id: string) => Promise<void>` — deletes DB row AND media files atomically |
| `updateVideo` | `(db, id: string, videoUri: string, motionPrompt: string) => void` |

Note: `removeEntry` is async because it calls filesystem deletion before removing the DB row. Delete media first — if that fails, the row stays and can be retried. If the row were deleted first and media deletion failed, you'd have orphaned files with no way to find them.

---

## File Storage — `src/storage/mediaCache.ts`

Downloads remote images/videos to local document directory so they persist offline.

| Function | Signature |
|---|---|
| `cacheImage` | `(remoteUrl: string, id: string) => Promise<string>` — returns local URI |
| `cacheVideo` | `(remoteUrl: string, id: string) => Promise<string>` — returns local URI |
| `createThumbnail` | `(sourceUri: string, id: string) => Promise<string>` — resizes to ~200px wide, returns local URI |
| `deleteMedia` | `(id: string) => Promise<void>` — removes image, thumbnail, and video files |

Uses `expo-file-system` (`FileSystem.downloadAsync`) and `expo-image-manipulator` for thumbnail resizing.

Thumbnails are generated at save time (not lazily) so the gallery grid never loads full-res 832x1216 images. Target: ~200px wide, JPEG quality 0.7.

---

## Screens & Navigation

### New route: `/gallery`

**File:** `app/gallery.tsx` → renders `src/screens/GalleryScreen.tsx`

- FlatList grid (2 columns) of history entries, sorted newest-first
- Each cell shows: **thumbnail** image, title (from cardMeta), truncated prompt, date
- Tap → hydrate context and navigate to `/display`
- Long-press → delete confirmation dialog (calls `removeEntry`)
- Empty state: illustration + "No generations yet" message
- Pull-to-refresh to reload from DB

### Navigation entry point

Add a "Gallery" button/icon to the HomeScreen (SummonScreen) header or footer area.

### New route: `/history/[id]`

**File:** `app/history/[id].tsx` — dedicated route for viewing history entries.

Why a separate route instead of reusing `/display`:
- `display.tsx` depends entirely on `AppContext.result` — if null, it redirects to `/home`
- Hydrating AppContext with history data would pollute the "current generation" state and break `handleReset`, `handleAnimate`, etc.
- A separate route keeps concerns clean: `/display` = live generation, `/history/[id]` = saved entry

This route:
1. Reads `id` from params
2. Loads `HistoryEntry` from SQLite via `useSQLiteContext()`
3. Maps entry fields to `ResultScreen` props (using local `imageUri` instead of remote URL)
4. Passes `fromHistory={true}` prop to `ResultScreen`

### ResultScreen changes

Two new behaviors driven by an optional `fromHistory` prop:

| Behavior | `fromHistory=false` (default) | `fromHistory=true` |
|---|---|---|
| Entrance animation | Full 3-rotation card flip | Simple fade-in only |
| "Generate Another" button | Calls `handleReset()` → `/home` | Label: "Back to Gallery" → `router.back()` |
| Animate section | Normal — start new animation | Shows existing video if present, **plus** animate option for re-animating with a different motion prompt |
| Motion prompt input | Empty | Pre-filled with saved `motionPrompt` (editable) |

Add to `ResultScreenProps`:

```typescript
fromHistory?: boolean;
onBack?: () => void;  // alternative to onReset for history navigation
```

---

## Integration with Generation Flow

### After image generation succeeds (`handleCast`)

1. Download image to local storage via `cacheImage`
2. Generate thumbnail via `createThumbnail`
3. Insert new `HistoryEntry` (videoUri = null, motionPrompt = null)
4. Store the entry `id` in context so the video step can reference it

If download/save fails, log the error but don't block the user — the generation still shows normally, it just won't appear in history.

### After video generation completes

1. Download video to local storage via `cacheVideo`
2. Call `updateVideo(entryId, localVideoUri, motionPrompt)`

### After re-animating from history

1. Download new video, overwrite old video file
2. Update DB entry with new `videoUri` and `motionPrompt`

Both steps happen in `AppContext.tsx` — no changes to API layer.

---

## Implementation Steps

### Step 1 — Storage layer + thumbnails

- [ ] Install `expo-sqlite`, `expo-file-system`, `expo-image-manipulator`
- [ ] Create `src/storage/historyDb.ts` with schema, migrations, and CRUD
- [ ] Create `src/storage/mediaCache.ts` with download helpers + thumbnail generation
- [ ] Wrap app with `SQLiteProvider` in `_layout.tsx`

### Step 2 — Save on generation

- [ ] In `handleCast` success path: cache image, create thumbnail, insert DB entry, store `id` in state
- [ ] In video completion callback: cache video, update DB entry with videoUri + motionPrompt
- [ ] Add `currentEntryId` to AppContext state
- [ ] Wrap save logic in try/catch so failures don't block the generation flow

### Step 3 — Gallery screen

- [ ] Create `app/gallery.tsx` route file
- [ ] Build `GalleryScreen.tsx` with FlatList grid using **thumbnail URIs**, empty state, pull-to-refresh
- [ ] Build `GalleryCard` component (thumbnail + title + date)
- [ ] Add delete with long-press + confirmation (calls `removeEntry` — DB + files atomically)

### Step 4 — History replay

- [ ] Create `app/history/[id].tsx` route file
- [ ] Load entry from DB, map to `ResultScreen` props
- [ ] Add `fromHistory` + `onBack` props to `ResultScreen`
- [ ] Skip card flip animation when `fromHistory=true` (fade-in only)
- [ ] Change bottom button to "Back to Gallery" when `fromHistory=true`
- [ ] Show existing video + re-animate option together

### Step 5 — Navigation wiring

- [ ] Add Gallery button to SummonScreen
- [ ] Wire GalleryCard tap → `/history/<id>`

### Step 6 — Polish

- [ ] Entry count badge on Gallery button
- [ ] Skeleton loading states for gallery grid
- [ ] Storage size indicator or "Clear all" option
- [ ] Search/filter by prompt text in gallery

---

## Dependencies to Add

| Package | Purpose |
|---|---|
| `expo-sqlite` | Structured local DB (new sync API in Expo 52) |
| `expo-file-system` | Download + manage media files locally |
| `expo-image-manipulator` | Resize images to thumbnails for gallery grid |

All are part of the Expo SDK — install via `npx expo install`.

---

## Open Questions

1. **Max entries** — Should there be a cap (e.g. 100 entries) with auto-pruning of oldest, or unlimited?
2. **Cloud sync** — Out of scope for now, but the DB schema supports a future `synced` column if needed.
3. **Share** — Gallery entries could support sharing the card image; worth considering as a follow-up.
