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
