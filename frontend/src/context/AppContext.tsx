import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';

import {
  appendTraceEvents,
  createRequestId,
  createTraceRecord,
  isDebugFlowEnabled,
  pushRecentTrace,
  trackFrontendEvent,
} from '../debugFlow';
import { animateImage, EX_IMAGE_ENDPOINT, generateImage, ImageGenerationError } from '../services/api';
import { insertEntry, updateVideo } from '../storage/historyDb';
import { consumeGeneration, GenerationStatus, getGenerationStatus } from '../storage/generationCurrency';
import { cacheImage, cacheVideo, createThumbnail } from '../storage/mediaCache';
import { DebugTraceRecord, GeneratedImage } from '../types';

const MIN_LOADING_MS = 1400;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface AppContextValue {
  prompt: string;
  setPrompt: (value: string) => void;
  result: GeneratedImage | null;
  errorMessage: string | null;
  isAnimating: boolean;
  videoUrl: string | null;
  videoJobId: string | null;
  videoJobActive: boolean;
  motionPrompt: string;
  currentTrace: DebugTraceRecord | null;
  recentTraces: DebugTraceRecord[];
  debugEnabled: boolean;
  setVideoUrl: (url: string | null) => void | Promise<void>;
  setVideoJobId: (id: string | null) => void;
  generationStatus: GenerationStatus;
  refreshGenerationStatus: () => Promise<void>;
  handleCast: () => Promise<void>;
  handleAnimate: (motionPrompt: string) => Promise<void>;
  handleReset: () => void;
  recordTraceEvent: (stage: string, status: string, details?: Record<string, unknown> | string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [videoUrl, setVideoUrlRaw] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [motionPrompt, setMotionPrompt] = useState('');
  const [currentTrace, setCurrentTrace] = useState<DebugTraceRecord | null>(null);
  const [recentTraces, setRecentTraces] = useState<DebugTraceRecord[]>([]);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    freeRemaining: 3,
    tokens: 0,
    canGenerate: true,
  });

  const refreshGenerationStatus = useCallback(async () => {
    const status = await getGenerationStatus();
    setGenerationStatus(status);
  }, []);

  useEffect(() => {
    refreshGenerationStatus();
  }, [refreshGenerationStatus]);

  const videoJobActive = videoJobId !== null && videoUrl === null;

  const setVideoUrl = useCallback(async (url: string | null) => {
    setVideoUrlRaw(url);
    if (url && currentEntryId) {
      try {
        const localVideo = await cacheVideo(url, currentEntryId);
        await updateVideo(currentEntryId, localVideo, motionPrompt);
      } catch (err) {
        console.warn('Failed to save video to history:', err);
      }
    }
  }, [currentEntryId, motionPrompt]);

  const debugEnabled = isDebugFlowEnabled();

  const startTrace = useCallback((requestId: string, nextPrompt: string) => {
    if (!debugEnabled) return;

    setRecentTraces((previous) => pushRecentTrace(previous, currentTrace));

    let trace = createTraceRecord(requestId, nextPrompt);
    trace = trackFrontendEvent(trace, 'prompt_submitted', 'completed', {
      promptPreview: nextPrompt.slice(0, 80),
    });
    trace = trackFrontendEvent(trace, 'request_started', 'started', {
      endpoint: EX_IMAGE_ENDPOINT,
    });
    setCurrentTrace(trace);
  }, [currentTrace, debugEnabled]);

  const mergeTraceEvents = useCallback((events: DebugTraceRecord['events']) => {
    if (!debugEnabled || events.length === 0) return;

    setCurrentTrace((previous) => {
      if (!previous) return previous;
      return appendTraceEvents(previous, events);
    });
  }, [debugEnabled]);

  const recordTraceEvent = useCallback((
    stage: string,
    status: string,
    details?: Record<string, unknown> | string,
  ) => {
    if (!debugEnabled) return;

    setCurrentTrace((previous) => {
      if (!previous) return previous;
      return trackFrontendEvent(previous, stage, status, details);
    });
  }, [debugEnabled]);

  const handleCast = useCallback(async () => {
    if (!prompt.trim()) return;

    const canSpend = await consumeGeneration();
    if (!canSpend) {
      setErrorMessage('No generations remaining. Win battles to earn more tokens!');
      await refreshGenerationStatus();
      return;
    }

    const trimmedPrompt = prompt.trim();
    const requestId = createRequestId();

    startTrace(requestId, trimmedPrompt);
    setErrorMessage(null);
    router.push('/loading');

    const startedAt = Date.now();

    try {
      const nextImage = await generateImage(trimmedPrompt, requestId);
      mergeTraceEvents(nextImage.backendTraceEvents);
      recordTraceEvent('response_received', 'completed', {
        requestId: nextImage.requestId,
      });
      recordTraceEvent('image_url_resolved', 'completed', {
        imageUrl: nextImage.imageUrl,
      });

      // Save to history (non-blocking — failures don't affect the UX)
      try {
        const entryId = Crypto.randomUUID();
        const localImage = await cacheImage(nextImage.imageUrl, entryId);
        const localThumb = await createThumbnail(localImage, entryId);
        await insertEntry({
          id: entryId,
          prompt: trimmedPrompt,
          imageUri: localImage,
          thumbnailUri: localThumb,
          cardMeta: nextImage.cardMeta,
          videoUri: null,
          motionPrompt: null,
          createdAt: Date.now(),
        });
        setCurrentEntryId(entryId);
      } catch (saveErr) {
        console.warn('Failed to save generation to history:', saveErr);
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await sleep(MIN_LOADING_MS - elapsed);
      }

      setResult(nextImage);
      await refreshGenerationStatus();
      router.replace('/display');
    } catch (error) {
      if (error instanceof ImageGenerationError) {
        mergeTraceEvents(error.traceEvents);
      }

      const message =
        error instanceof Error
          ? error.message
          : 'The ritual faltered. Please try again.';
      recordTraceEvent('terminal_error', 'error', message);
      setResult(null);
      setErrorMessage(message);
      router.replace('/home');
    }
  }, [mergeTraceEvents, prompt, recordTraceEvent, refreshGenerationStatus, router, startTrace]);

  const handleAnimate = useCallback(async (mp: string) => {
    if (!result || !mp.trim()) return;

    const imageFilename = result.imageUrl.split('/').pop();
    if (!imageFilename) return;

    const requestId = createRequestId();
    setIsAnimating(true);

    try {
      const { job_id } = await animateImage(imageFilename, mp.trim(), requestId);
      setVideoJobId(job_id);
      setMotionPrompt(mp.trim());
      router.push('/video-loading');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Animation failed.';
      setErrorMessage(message);
    } finally {
      setIsAnimating(false);
    }
  }, [result, router]);

  const handleReset = useCallback(() => {
    setResult(null);
    setPrompt('');
    setErrorMessage(null);
    setVideoUrlRaw(null);
    setVideoJobId(null);
    setMotionPrompt('');
    setIsAnimating(false);
    setCurrentEntryId(null);
    router.replace('/home');
  }, [router]);

  return (
    <AppContext.Provider
      value={{
        prompt,
        setPrompt,
        result,
        errorMessage,
        isAnimating,
        videoUrl,
        videoJobId,
        videoJobActive,
        motionPrompt,
        generationStatus,
        refreshGenerationStatus,
        setVideoUrl,
        setVideoJobId,
        currentTrace,
        recentTraces,
        debugEnabled,
        handleCast,
        handleAnimate,
        handleReset,
        recordTraceEvent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
