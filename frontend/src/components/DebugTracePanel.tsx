import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { DebugTraceRecord } from '../types';

interface DebugTracePanelProps {
  currentTrace: DebugTraceRecord | null;
  recentTraces: DebugTraceRecord[];
}

function getElapsedLabel(currentTrace: DebugTraceRecord): string {
  if (currentTrace.events.length === 0) {
    return '0 ms';
  }

  const startedAt = new Date(currentTrace.events[0].timestamp).getTime();
  const endedAt = new Date(currentTrace.events[currentTrace.events.length - 1].timestamp).getTime();
  const elapsedMs = Math.max(0, endedAt - startedAt);

  if (elapsedMs < 1000) {
    return `${elapsedMs} ms`;
  }

  return `${(elapsedMs / 1000).toFixed(2)} s`;
}

export function DebugTracePanel({
  currentTrace,
  recentTraces,
}: DebugTracePanelProps) {
  if (!currentTrace) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Flow</Text>
        <Text style={styles.elapsed}>Elapsed: {getElapsedLabel(currentTrace)}</Text>
      </View>

      <Text style={styles.requestId}>Request: {currentTrace.requestId}</Text>

      <View style={styles.events}>
        {currentTrace.events.map((event, index) => (
          <View key={`${event.requestId}-${event.stage}-${index}`} style={styles.eventRow}>
            <View style={styles.eventMeta}>
              <Text style={styles.badge}>{event.source}</Text>
              <Text style={styles.stage}>{event.stage}</Text>
              <Text style={styles.status}>{event.status}</Text>
            </View>
            {event.details ? <Text style={styles.details}>{event.details}</Text> : null}
            <Text style={styles.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
          </View>
        ))}
      </View>

      {recentTraces.length > 0 ? (
        <View style={styles.recent}>
          <Text style={styles.recentTitle}>Recent Requests</Text>
          {recentTraces.map((trace) => (
            <Text key={trace.requestId} style={styles.recentItem}>
              {trace.requestId} - {trace.prompt.slice(0, 36)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    marginTop: 18,
    padding: 18,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(74, 248, 227, 0.28)',
    backgroundColor: 'rgba(8, 14, 24, 0.88)',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  elapsed: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  requestId: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  events: {
    gap: 10,
  },
  eventRow: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(160, 166, 192, 0.08)',
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stage: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  status: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  details: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  recent: {
    gap: 6,
    marginTop: 6,
  },
  recentTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentItem: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
