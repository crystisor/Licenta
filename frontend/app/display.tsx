import { Redirect } from 'expo-router';

import { DebugTracePanel } from '../src/components/DebugTracePanel';
import { useAppContext } from '../src/context/AppContext';
import { ResultScreen } from '../src/screens/ResultScreen';

export default function DisplayPage() {
  const {
    result,
    isAnimating,
    videoUrl,
    handleAnimate,
    handleReset,
    recordTraceEvent,
    debugEnabled,
    currentTrace,
    recentTraces,
  } = useAppContext();

  if (!result) {
    return <Redirect href="/home" />;
  }

  const debugPanel = debugEnabled ? (
    <DebugTracePanel currentTrace={currentTrace} recentTraces={recentTraces} />
  ) : null;

  return (
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
  );
}
