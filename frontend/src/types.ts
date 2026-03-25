export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  requestId: string;
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


export interface ImageMeta {
  title: string;
  description: string;
  lore: string;
  stats: Record<string, string | number>;
}
