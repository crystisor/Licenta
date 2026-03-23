# Digital Alchemist Expo App

This frontend is a managed Expo app that runs on Android, iOS, and web.

## Local setup

1. Install frontend dependencies:
   `npm install`
2. Create `frontend/.env` or `frontend/.env.local` from `.env.example`.
3. Set `EXPO_PUBLIC_API_BASE_URL` to the FastAPI backend base URL.
4. Set `EXPO_PUBLIC_DEBUG_FLOW=true` to enable the in-app flow trace during development.

## Run

- Native dev server: `npm start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Backend contract

The app submits prompts to `POST /generate/ex-image` and uses the first returned image URL:

```json
{
  "image_urls": [
    "/output/abcd1234_img_0.png"
  ]
}
```

## Debug flow

- Frontend: `EXPO_PUBLIC_DEBUG_FLOW=true`
- Backend: `DEBUG_FLOW=true`

When both are enabled in development, the app shows a request timeline and the backend emits structured trace logs tied to the same `X-Request-ID`.
