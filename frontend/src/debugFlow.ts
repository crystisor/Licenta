import { DebugTraceEvent, DebugTraceRecord } from './types';

const DEBUG_TRACE_HEADER = 'X-Debug-Trace';
const MAX_RECENT_TRACES = 4;

export function isDebugFlowEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEBUG_FLOW === 'true';
}

export function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function formatDetails(details?: Record<string, unknown> | string): string | undefined {
  if (typeof details === 'string') {
    return details;
  }

  if (!details) {
    return undefined;
  }

  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');
}

export function createTraceRecord(requestId: string, prompt: string): DebugTraceRecord {
  return {
    requestId,
    prompt,
    events: [],
  };
}

export function createTraceEvent(
  requestId: string,
  source: 'frontend' | 'backend',
  stage: string,
  status: string,
  details?: Record<string, unknown> | string,
): DebugTraceEvent {
  return {
    requestId,
    source,
    stage,
    status,
    timestamp: new Date().toISOString(),
    details: formatDetails(details),
  };
}

function sortEvents(events: DebugTraceEvent[]): DebugTraceEvent[] {
  return [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function appendTraceEvent(record: DebugTraceRecord, event: DebugTraceEvent): DebugTraceRecord {
  return {
    ...record,
    events: sortEvents([...record.events, event]),
  };
}

export function appendTraceEvents(record: DebugTraceRecord, events: DebugTraceEvent[]): DebugTraceRecord {
  return {
    ...record,
    events: sortEvents([...record.events, ...events]),
  };
}

export function pushRecentTrace(
  recentTraces: DebugTraceRecord[],
  trace: DebugTraceRecord | null,
): DebugTraceRecord[] {
  if (!trace) {
    return recentTraces;
  }

  const deduped = recentTraces.filter((entry) => entry.requestId !== trace.requestId);
  return [trace, ...deduped].slice(0, MAX_RECENT_TRACES);
}

export function logFrontendTrace(event: DebugTraceEvent): void {
  try {
    if (isDebugFlowEnabled() || event.status === 'error') {
      console.info(
        '[debug-flow]',
        JSON.stringify({
          kind: 'debug_flow',
          ...event,
        }),
      );
    }
  } catch {
    // Debug logging must never block the request flow.
  }
}

export function trackFrontendEvent(
  record: DebugTraceRecord,
  stage: string,
  status: string,
  details?: Record<string, unknown> | string,
): DebugTraceRecord {
  const event = createTraceEvent(record.requestId, 'frontend', stage, status, details);
  logFrontendTrace(event);
  return appendTraceEvent(record, event);
}

export function extractTraceEventsFromHeader(headerValue: string | null): DebugTraceEvent[] {
  if (!headerValue) {
    return [];
  }

  try {
    if (typeof globalThis.atob !== 'function') {
      return [];
    }
    const decoded = globalThis.atob(headerValue);
    const parsed = JSON.parse(decoded) as DebugTraceEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((event) => typeof event?.requestId === 'string');
  } catch {
    return [];
  }
}

export function getDebugTraceHeaderName(): string {
  return DEBUG_TRACE_HEADER;
}
