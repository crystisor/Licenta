import { extractTraceEventsFromHeader, getDebugTraceHeaderName } from '../debugFlow';
import { AnimateResponse, AnimateStatusResponse, CardMeta, DebugTraceEvent, GalleryEntry, GalleryResponse, GeneratedImage } from '../types';

export const EX_IMAGE_ENDPOINT = '/generate/ex-image';
export const ANIMATE_ENDPOINT = '/generate/animate';
export const ANIMATE_STATUS_ENDPOINT = '/generate/animate/status';

interface ImageResponsePayload {
  image_urls: string[];
  card_meta?: {
    title: string;
    lore: string;
    stats: Record<string, number>;
    creativity?: number;
  } | null;
}

export class ImageGenerationError extends Error {
  requestId: string;
  traceEvents: DebugTraceEvent[];
  statusCode: number;

  constructor(message: string, requestId: string, traceEvents: DebugTraceEvent[], statusCode: number) {
    super(message);
    this.name = 'ImageGenerationError';
    this.requestId = requestId;
    this.traceEvents = traceEvents;
    this.statusCode = statusCode;
  }
}

export interface GenerateImageResult extends GeneratedImage {
  backendTraceEvents: DebugTraceEvent[];
}

function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL in the Expo frontend.');
  }
  return apiBaseUrl.replace(/\/+$/, '');
}

function getErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = payload.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return 'The backend could not complete the image generation request.';
}

function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${getApiBaseUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export async function fetchGallery(limit = 20, offset = 0): Promise<{ entries: GalleryEntry[]; total: number }> {
  const response = await fetch(
    `${getApiBaseUrl()}/gallery?limit=${limit}&offset=${offset}`,
  );

  if (!response.ok) {
    throw new Error('Failed to fetch gallery');
  }

  const data = (await response.json()) as GalleryResponse;

  // Convert relative URLs to absolute
  const entries = data.entries.map((entry) => ({
    ...entry,
    image_url: toAbsoluteUrl(entry.image_url),
    video_url: entry.video_url ? toAbsoluteUrl(entry.video_url) : null,
  }));

  return { entries, total: data.total };
}

export async function fetchCard(cardId: string): Promise<GalleryEntry> {
  const response = await fetch(`${getApiBaseUrl()}/gallery/${cardId}`);

  if (!response.ok) {
    throw new Error('Card not found');
  }

  const entry = (await response.json()) as GalleryEntry;
  return {
    ...entry,
    image_url: toAbsoluteUrl(entry.image_url),
    video_url: entry.video_url ? toAbsoluteUrl(entry.video_url) : null,
  };
}

export async function deleteCard(cardId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/gallery/${cardId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete card');
  }
}

export async function generateImage(prompt: string, requestId: string): Promise<GenerateImageResult> {
  const response = await fetch(`${getApiBaseUrl()}${EX_IMAGE_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
    body: JSON.stringify({ prompt }),
  });
  const resolvedRequestId = response.headers.get('X-Request-ID')?.trim() || requestId;
  const backendTraceEvents = extractTraceEventsFromHeader(
    response.headers.get(getDebugTraceHeaderName()),
  );

  let payload: ImageResponsePayload | { detail?: string } | null = null;
  try {
    payload = (await response.json()) as ImageResponsePayload | { detail?: string };
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ImageGenerationError(
      getErrorMessage(payload),
      resolvedRequestId,
      backendTraceEvents,
      response.status,
    );
  }

  if (!payload || !('image_urls' in payload) || !Array.isArray(payload.image_urls) || payload.image_urls.length === 0) {
    throw new ImageGenerationError(
      'The backend did not return a generated image.',
      resolvedRequestId,
      backendTraceEvents,
      response.status,
    );
  }

  const cardMeta: CardMeta | null = payload.card_meta
    ? { title: payload.card_meta.title, lore: payload.card_meta.lore, stats: payload.card_meta.stats, creativity: payload.card_meta.creativity }
    : null;

  return {
    prompt,
    imageUrl: toAbsoluteUrl(payload.image_urls[0]),
    requestId: resolvedRequestId,
    cardMeta,
    backendTraceEvents,
  };
}

export async function animateImage(
  imageFilename: string,
  motionPrompt: string,
  requestId: string,
): Promise<AnimateResponse> {
  const response = await fetch(`${getApiBaseUrl()}${ANIMATE_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
    body: JSON.stringify({
      image_filename: imageFilename,
      prompt: motionPrompt,
    }),
  });

  let payload: AnimateResponse | { detail?: string } | null = null;
  try {
    payload = (await response.json()) as AnimateResponse | { detail?: string };
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      (payload && 'detail' in payload && typeof payload.detail === 'string')
        ? payload.detail
        : 'Video generation failed.',
    );
  }

  if (!payload || !('job_id' in payload) || !payload.job_id) {
    throw new Error('The backend did not return a job ID.');
  }

  return { job_id: payload.job_id };
}

export async function getAnimateStatus(jobId: string): Promise<AnimateStatusResponse> {
  const response = await fetch(`${getApiBaseUrl()}${ANIMATE_STATUS_ENDPOINT}/${jobId}`);

  let payload: AnimateStatusResponse | { detail?: string } | null = null;
  try {
    payload = (await response.json()) as AnimateStatusResponse | { detail?: string };
  } catch {
    payload = null;
  }

  if (response.status === 404) {
    throw new Error('Job not found');
  }

  if (!response.ok) {
    throw new Error(
      (payload && 'detail' in payload && typeof payload.detail === 'string')
        ? payload.detail
        : 'Failed to fetch video status.',
    );
  }

  if (!payload || !('status' in payload)) {
    throw new Error('Invalid status response from backend.');
  }

  // Convert relative video_url to absolute
  if (payload.video_url) {
    payload = { ...payload, video_url: toAbsoluteUrl(payload.video_url) };
  }

  return payload as AnimateStatusResponse;
}
