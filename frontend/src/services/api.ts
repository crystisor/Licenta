import { Platform } from "react-native";

const DEFAULT_API_URL = Platform.select({
  web: "http://localhost:8001",
  android: "http://10.0.2.2:8001",
  default: "http://localhost:8001",
});

const API_BASE = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export interface ImageGenerateResponse {
  image_urls: string[];
}

export interface VideoGenerateResponse {
  video_url: string;
}

/**
 * Generate an image from a text prompt via ComfyUI.
 */
export async function generateImage(
  prompt: string,
  negativePrompt?: string,
  seed?: number
): Promise<ImageGenerateResponse> {
  const res = await fetch(`${API_BASE}/generate/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      ...(seed !== undefined ? { seed } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed: ${err}`);
  }

  return res.json();
}

/**
 * Convert a relative path to an absolute URL for display.
 */
export function getMediaUrl(relativePath: string): string {
  return `${API_BASE}${relativePath}`;
}
