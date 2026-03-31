export interface CardMeta {
  title: string;
  lore: string;
  stats: Record<string, number>;
}

export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  requestId: string;
  cardMeta: CardMeta | null;
}

export interface DebugTraceEvent {
  requestId: string;
  source: 'frontend' | 'backend';
  stage: string;
  status: string;
  timestamp: string;
  details?: string;
}

export interface DebugTraceRecord {
  requestId: string;
  prompt: string;
  events: DebugTraceEvent[];
}

export interface HistoryEntry {
  id: string;
  prompt: string;
  imageUri: string;
  thumbnailUri: string;
  cardMeta: CardMeta | null;
  videoUri: string | null;
  motionPrompt: string | null;
  createdAt: number;
}

export interface GalleryEntry {
  id: string;
  image_url: string;
  video_url: string | null;
  card_meta: CardMeta | null;
  prompt: string | null;
  created_at: number;
}

export interface GalleryResponse {
  entries: GalleryEntry[];
  total: number;
}

export type VideoJobStatus = 'processing' | 'complete' | 'error';

export interface AnimateResponse {
  job_id: string;
}

export interface AnimateStatusResponse {
  status: VideoJobStatus;
  progress?: number;
  video_url?: string;
  detail?: string;
}
