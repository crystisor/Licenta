import { DebugTracePanel } from '../src/components/DebugTracePanel';
import { useAppContext } from '../src/context/AppContext';
import { SummonScreen } from '../src/screens/SummonScreen';

export default function HomePage() {
  const {
    prompt,
    setPrompt,
    errorMessage,
    handleCast,
    debugEnabled,
    currentTrace,
    recentTraces,
  } = useAppContext();

  const debugPanel = debugEnabled ? (
    <DebugTracePanel currentTrace={currentTrace} recentTraces={recentTraces} />
  ) : null;

  return (
    <SummonScreen
      debugPanel={debugPanel}
      errorMessage={errorMessage}
      onCast={handleCast}
      onPromptChange={setPrompt}
      prompt={prompt}
    />
  );
}
