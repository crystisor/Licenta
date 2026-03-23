import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  appendTraceEvents,
  createRequestId,
  createTraceRecord,
  isDebugFlowEnabled,
  pushRecentTrace,
  trackFrontendEvent,
} from './debugFlow';
import { DebugTracePanel } from './components/DebugTracePanel';
import { LoadingScreen } from './screens/LoadingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SummonScreen } from './screens/SummonScreen';
import { animateImage, EX_IMAGE_ENDPOINT, generateImage, ImageGenerationError } from './services/api';
import { DebugTraceRecord, GeneratedImage, Screen } from './types';

const MIN_LOADING_MS = 1400;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('summon');
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [prompt, setPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTrace, setCurrentTrace] = useState<DebugTraceRecord | null>(null);
  const [recentTraces, setRecentTraces] = useState<DebugTraceRecord[]>([]);

  const debugEnabled = isDebugFlowEnabled();

  const startTrace = useCallback((requestId: string, nextPrompt: string) => {
    if (!debugEnabled) {
      return;
    }

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
    if (!debugEnabled || events.length === 0) {
      return;
    }

    setCurrentTrace((previous) => {
      if (!previous) {
        return previous;
      }
      return appendTraceEvents(previous, events);
    });
  }, [debugEnabled]);

  const recordTraceEvent = useCallback((
    stage: string,
    status: string,
    details?: Record<string, unknown> | string,
  ) => {
    if (!debugEnabled) {
      return;
    }

    setCurrentTrace((previous) => {
      if (!previous) {
        return previous;
      }
      return trackFrontendEvent(previous, stage, status, details);
    });
  }, [debugEnabled]);

  const handleCast = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    const trimmedPrompt = prompt.trim();
    const requestId = createRequestId();

    startTrace(requestId, trimmedPrompt);
    setErrorMessage(null);
    setScreen('loading');

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

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await sleep(MIN_LOADING_MS - elapsed);
      }

      setResult(nextImage);
      setScreen('result');
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
      setScreen('summon');
    }
  }, [mergeTraceEvents, prompt, recordTraceEvent, startTrace]);

  const handleAnimate = useCallback(async (motionPrompt: string) => {
    if (!result || !motionPrompt.trim()) return;

    const imageFilename = result.imageUrl.split('/').pop();
    if (!imageFilename) return;

    const requestId = createRequestId();
    setIsAnimating(true);

    try {
      const videoResult = await animateImage(imageFilename, motionPrompt.trim(), requestId);
      setVideoUrl(videoResult.videoUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Animation failed.';
      setErrorMessage(message);
    } finally {
      setIsAnimating(false);
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null);
    setPrompt('');
    setErrorMessage(null);
    setVideoUrl(null);
    setIsAnimating(false);
    setScreen('summon');
  }, []);

  const debugPanel = debugEnabled ? (
    <DebugTracePanel currentTrace={currentTrace} recentTraces={recentTraces} />
  ) : null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === 'summon' && (
        <SummonScreen
          debugPanel={debugPanel}
          errorMessage={errorMessage}
          onCast={handleCast}
          onPromptChange={setPrompt}
          prompt={prompt}
        />
      )}
      {screen === 'loading' && <LoadingScreen debugPanel={debugPanel} prompt={prompt} />}
      {screen === 'result' && result && (
        <ResultScreen
          debugPanel={debugPanel}
          isAnimating={isAnimating}
          onAnimate={handleAnimate}
          onImageError={(message) => recordTraceEvent('image_render_failed', 'error', message)}
          onImageLoad={() => recordTraceEvent('image_render_succeeded', 'completed', {
            requestId: result.requestId,
          })}
          onReset={handleReset}
          result={result}
          videoUrl={videoUrl}
        />
      )}
    </SafeAreaProvider>
  );
}
