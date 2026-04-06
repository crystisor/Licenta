import { DebugTracePanel } from '../src/components/DebugTracePanel';
import { useAppContext } from '../src/context/AppContext';
import { LoadingScreen } from '../src/screens/LoadingScreen';

export default function LoadingPage() {
  const { debugEnabled, currentTrace, recentTraces } = useAppContext();

  const debugPanel = debugEnabled ? (
    <DebugTracePanel currentTrace={currentTrace} recentTraces={recentTraces} />
  ) : null;

  return <LoadingScreen debugPanel={debugPanel} />;
}
