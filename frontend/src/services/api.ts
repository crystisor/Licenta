import { Platform } from "react-native";

// Web uses localhost, Android emulator uses 10.0.2.2 (host loopback alias)
const DEFAULT_API_URL = Platform.select({
  web: "http://localhost:8000",
  android: "http://10.0.2.2:8000",
  default: "http://localhost:8000",
});

const API_BASE = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export interface FullGenerateResponse {
  image_urls: string[];
  video_url: string;
}

export interface ImageGenerateResponse {
  image_urls: string[];
}

export interface VideoGenerateResponse {
  video_url: string;
}

/**
 * Full pipeline: prompt → images → video
 */
export async function generateFull(
  prompt: string,
  motionPrompt?: string,
  imageIndex: number = 0
): Promise<FullGenerateResponse> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      motion_prompt: motionPrompt || null,
      image_index: imageIndex,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generate failed: ${err}`);
  }

  return res.json();
}

/**
 * Generate images only from a text prompt.
 */
export async function generateImages(
  prompt: string,
  numImages: number = 10
): Promise<ImageGenerateResponse> {
  const res = await fetch(`${API_BASE}/generate/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, num_images: numImages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed: ${err}`);
  }

  return res.json();
}

/**
 * Convert a full relative URL to an absolute URL for display.
 */
export function getMediaUrl(relativePath: string): string {
  return `${API_BASE}${relativePath}`;
}
