# Video Loading Screen — Implementation Plan

## Goal

Replace the synchronous 5-6 minute blocking "Animate" call with a background job system + dedicated loading screen + polling.

---

## Backend Changes

### 1. In-memory job store

Add a simple dict to `main.py` to track video generation jobs:

```python
video_jobs: dict[str, dict] = {}
# Example entry:
# "abc123": {
#     "status": "processing",
#     "progress": 0,
#     "video_url": None,
#     "error": None,
#     "created_at": 1711000000.0,
# }
```

**Job cleanup**: After a job reaches `"complete"` or `"error"`, auto-remove it after 30 minutes. Check and purge expired entries at the start of each `/generate/animate` or `/generate/animate/status` call.

**Known limitation**: Jobs are lost if the backend restarts mid-generation. Acceptable for a single-user thesis project — the frontend will get a 404 on the next poll and show an error.

### 2. Modify `POST /generate/animate`

- Generate a `job_id` (uuid4 short hex)
- **Reject if GPU is busy**: Check if any job in `video_jobs` has `status == "processing"`. If so, return `409 Conflict` with `{ "detail": "A video is already being generated" }`. Single GPU = one job at a time.
- Store initial job state: `{ status: "processing", progress: 0, created_at: time.time() }`
- Kick off the video generation in a background thread via `asyncio.to_thread()` (NOT `asyncio.create_task` — `_generate_video_comfy` is blocking with `time.sleep` loops and would freeze the event loop)
- Return `{ job_id }` immediately

### 3. Background task updates job state

Refactor `_generate_video_comfy` to accept a `job_id` parameter and update `video_jobs[job_id]` as it progresses:

- **Time-based estimated progress**: The existing code polls for the video file with `time.sleep(5)`. Use elapsed time vs expected total (~300s) to estimate progress percentage. Update `video_jobs[job_id]["progress"]` each poll iteration.
  ```python
  # Inside the polling loop:
  progress = min(int((elapsed / estimated_total) * 90), 90)  # cap at 90% until file found
  video_jobs[job_id]["progress"] = progress
  ```
- When file is found and size-stable: set `progress: 95`
- After copy to output dir: set `status: "complete"`, `progress: 100`, `video_url: "/output/..."`
- On any exception: set `status: "error"`, `error: str(e)`

**Future improvement**: Connect to ComfyUI's WebSocket at `ws://127.0.0.1:8188/ws` for real step-level progress instead of time-based estimation. Not needed for v1.

### 4. New endpoint: `GET /generate/animate/status/{job_id}`

Returns current job state:

```json
// Processing
{ "status": "processing", "progress": 45 }

// Complete
{ "status": "complete", "progress": 100, "video_url": "/output/abc_video.mp4" }

// Error
{ "status": "error", "detail": "GPU out of memory" }

// Unknown job (or expired / server restarted)
404 { "detail": "Job not found" }
```

---

## Frontend Changes

### 1. Update `api.ts`

- `animateImage()` now returns `{ job_id: string }` instead of `{ video_url }`
- New function: `getAnimateStatus(jobId: string)` → calls `GET /generate/animate/status/{job_id}`
  - Returns `{ status, progress?, video_url?, detail? }`
- Handle 409 from `animateImage()` — surface "GPU busy" message to user

### 2. Update `types.ts`

Add types:

```ts
type VideoJobStatus = "processing" | "complete" | "error"

interface AnimateResponse {
  job_id: string
}

interface AnimateStatusResponse {
  status: VideoJobStatus
  progress?: number
  video_url?: string
  detail?: string
}
```

### 3. Update `AppContext.tsx`

- Add `videoJobId` state (`string | null`)
- `handleAnimate()` changes:
  - Call `animateImage()` → get `job_id`
  - Store `job_id` in state
  - Navigate to `/video-loading`
  - No longer awaits completion here
- Add `videoJobActive` derived value: `videoJobId !== null && videoUrl === null`
- **Fix `handleReset()`**: If `videoJobActive` is true when user clicks "Generate Another", clear `videoJobId` (the backend task keeps running but result is discarded — acceptable tradeoff vs blocking the user)
- Expose `videoJobId` and `videoJobActive` in context value

### 4. New screen: `VideoLoadingScreen.tsx`

Located at `frontend/src/screens/VideoLoadingScreen.tsx`.

**Layout:**
- **Top**: Small version of the generated image card (thumbnail + title) so the user sees what's being animated
- **Center**: Animated orb/loading animation (similar style to `LoadingScreen.tsx`)
- **Progress card**:
  - Progress bar driven by poll responses (real `progress` value from backend)
  - Steps:
    1. "Preparing motion" (0-20%)
    2. "Rendering frames" (20-70%)
    3. "Encoding video" (70-95%)
    4. "Finalizing" (95%+)
- **Footer**: The motion prompt the user typed

**Behavior:**
- On mount, start polling `getAnimateStatus(jobId)` every 10 seconds via `setInterval` inside a `useEffect`
- **Cleanup**: Clear the interval on unmount and when job completes/errors — return a cleanup function from `useEffect`
- Update progress bar and step indicators from response
- When `status === "complete"`:
  - Store `video_url` in context
  - Clear `videoJobId`
  - Navigate to `/display`
- When `status === "error"`:
  - Show error message on screen
  - Show a "Retry" button that navigates back to `/display`
- When status returns 404 (server restarted / job expired):
  - Show "Connection lost — video generation may have failed"
  - Show a "Back" button to `/display`

### 5. New route: `app/video-loading.tsx`

Thin wrapper that renders `<VideoLoadingScreen />`, same pattern as other routes.

### 6. Update `ResultScreen.tsx`

- "Animate" button: disable when `videoJobActive` is true (GPU busy) — show tooltip or subtitle: "Video already generating..."
- Remove inline `isAnimating` spinner (handled by loading screen now)
- Video player section renders when `videoUrl` is present (unchanged)

### 7. Global floating banner (`_layout.tsx`)

Instead of only showing on the home screen, add a global banner in the root layout that appears on **any** screen when `videoJobActive` is true:

- Positioned at bottom of screen, above safe area
- Small card: "Video generating... Tap to check progress"
- Tapping navigates to `/video-loading`
- Hidden when already on `/video-loading`
- Disappears when video completes or errors out
- This way the user sees it whether they're on `/home`, `/display`, or any other screen

---

## File Changes Summary

| File | Action |
|------|--------|
| `backend/main.py` | Modify animate endpoint (async + 409 guard), add status endpoint, add job store with cleanup |
| `frontend/src/services/api.ts` | Update `animateImage` return type, add `getAnimateStatus`, handle 409 |
| `frontend/src/types.ts` | Add `VideoJobStatus`, `AnimateResponse`, `AnimateStatusResponse` |
| `frontend/src/context/AppContext.tsx` | Add `videoJobId`/`videoJobActive` state, update `handleAnimate` + `handleReset` |
| `frontend/src/screens/VideoLoadingScreen.tsx` | **New file** — loading screen with polling + cleanup |
| `frontend/app/video-loading.tsx` | **New file** — route wrapper |
| `frontend/src/screens/ResultScreen.tsx` | Disable animate button when job active, remove inline spinner |
| `frontend/app/_layout.tsx` | Add global "video generating" floating banner |

---

## Implementation Order

1. **Backend first**: job store, modify `/generate/animate`, add `/generate/animate/status/{job_id}` — test with curl
2. **Frontend types + api**: `types.ts`, `api.ts` changes
3. **AppContext**: new state, updated `handleAnimate` and `handleReset`
4. **VideoLoadingScreen + route**: new screen with polling
5. **ResultScreen**: disable button when job active
6. **Global banner**: floating banner in `_layout.tsx`
7. **Test end-to-end**

---

## Flow Diagram

```
[/display] User clicks "Animate"
    │
    ├── POST /generate/animate
    │   ├── 409 → "GPU busy" toast, stay on /display
    │   └── 200 → { job_id }
    │
    ▼
[/video-loading] Polling every 10s
    │         │
    │         ├── User navigates away → [/display] or [/home]
    │         │     └── Global banner: "Video generating..."
    │         │          └── Tap → back to [/video-loading]
    │         │
    │         ├── status === "complete"
    │         │        │
    │         │        ▼
    │         │  [/display] with video card playing
    │         │
    │         ├── status === "error"
    │         │        │
    │         │        ▼
    │         │  Error message → "Retry" → [/display]
    │         │
    │         └── 404 (server restarted)
    │                  │
    │                  ▼
    │            "Connection lost" → "Back" → [/display]
    │
    └── User clicks "Generate Another" while job active
             │
             ▼
        videoJobId cleared, backend task orphaned (acceptable)
```
