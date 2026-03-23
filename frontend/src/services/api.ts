import { extractTraceEventsFromHeader, getDebugTraceHeaderName } from '../debugFlow';
import { DebugTraceEvent, GeneratedImage } from '../types';

export const EX_IMAGE_ENDPOINT = '/generate/ex-image';
export const ANIMATE_ENDPOINT = '/generate/animate';

interface ImageResponsePayload {
  image_urls: string[];
}

interface VideoResponsePayload {
  video_url: string;
}

export interface GenerateVideoResult {
  videoUrl: string;
  requestId: string;
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

  return {
    prompt,
    imageUrl: toAbsoluteUrl(payload.image_urls[0]),
    requestId: resolvedRequestId,
    backendTraceEvents,
  };
}

export async function animateImage(
  imageFilename: string,
  motionPrompt: string,
  requestId: string,
): Promise<GenerateVideoResult> {
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

  let payload: VideoResponsePayload | { detail?: string } | null = null;
  try {
    payload = (await response.json()) as VideoResponsePayload | { detail?: string };
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

  if (!payload || !('video_url' in payload) || !payload.video_url) {
    throw new Error('The backend did not return a generated video.');
  }

  return {
    videoUrl: toAbsoluteUrl(payload.video_url),
    requestId,
  };
}
