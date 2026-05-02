import type { HealthInsightReport, PatternInsight, SymptomEntry } from './types';

const DISCLAIMER =
  'These are pattern insights, not a diagnosis or medical advice. Seek urgent care for emergencies, severe symptoms, or symptoms that feel unsafe.';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function normalizeSymptom(symptom: string): string {
  return symptom.trim().toLowerCase();
}

function displaySymptom(symptom: string): string {
  return symptom
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateRange(dates: string[]): string {
  const uniqueDates = Array.from(new Set(dates)).sort();
  if (uniqueDates.length === 0) return 'No dates';
  if (uniqueDates.length === 1) return uniqueDates[0] ?? 'No dates';
  return `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`;
}

function findTimeCluster(entries: SymptomEntry[]): PatternInsight | null {
  const buckets = new Map<string, SymptomEntry[]>();

  for (const entry of entries) {
    if (!entry.time) continue;
    const hour = Number(entry.time.slice(0, 2));
    if (!Number.isFinite(hour)) continue;

    const bucket = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const current = buckets.get(bucket) ?? [];
    current.push(entry);
    buckets.set(bucket, current);
  }

  const strongest = Array.from(buckets.entries()).sort((a, b) => b[1].length - a[1].length)[0];
  if (!strongest) return null;

  const [bucket, bucketEntries] = strongest;
  if (bucketEntries.length < 3 || bucketEntries.length / entries.length < 0.45) return null;

  return {
    id: 'time-cluster',
    title: `${displaySymptom(bucket)} clustering`,
    detail: `${bucketEntries.length} logged symptoms happened in the ${bucket}. Use this as context when preparing questions for a clinician.`,
    priority: 'info',
    evidence: [`${bucketEntries.length} of ${entries.length} entries include ${bucket} timing`],
  };
}

function findSeverityTrend(entries: SymptomEntry[]): PatternInsight | null {
  if (entries.length < 6) return null;

  const sorted = [...entries].sort((a, b) =>
    `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`)
  );
  const midpoint = Math.floor(sorted.length / 2);
  const olderAverage = average(sorted.slice(0, midpoint).map((entry) => entry.severity));
  const newerAverage = average(sorted.slice(midpoint).map((entry) => entry.severity));

  if (olderAverage === null || newerAverage === null) return null;

  const delta = Number((newerAverage - olderAverage).toFixed(1));
  if (Math.abs(delta) < 1.5) return null;

  const rising = delta > 0;
  return {
    id: 'severity-trend',
    title: rising ? 'Severity is trending up' : 'Severity is trending down',
    detail: `The newer half of the log averages ${newerAverage}/10 versus ${olderAverage}/10 earlier.`,
    priority: rising ? 'attention' : 'info',
    evidence: [`Change: ${delta > 0 ? '+' : ''}${delta} severity points`],
  };
}

export function buildHealthInsights(
  entries: SymptomEntry[],
  generatedAt = new Date().toISOString()
): HealthInsightReport {
  const severities = entries.map((entry) => entry.severity);
  const averageSeverity = average(severities);
  const highSeverity = entries.filter((entry) => entry.severity >= 8);
  const insights: PatternInsight[] = [];
  const groups = new Map<string, SymptomEntry[]>();

  for (const entry of entries) {
    const key = normalizeSymptom(entry.symptom);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const groupedSymptoms = Array.from(groups.entries())
    .map(([symptom, group]) => {
      const groupSeverities = group.map((entry) => entry.severity);
      return {
        symptom,
        count: group.length,
        averageSeverity: average(groupSeverities) ?? 0,
        dates: group.map((entry) => entry.date),
      };
    })
    .sort((a, b) => b.count - a.count || b.averageSeverity - a.averageSeverity);

  const topSymptom = groupedSymptoms[0];
  if (topSymptom && topSymptom.count >= 2) {
    insights.push({
      id: 'top-symptom',
      title: `${displaySymptom(topSymptom.symptom)} is the most frequent symptom`,
      detail: `${topSymptom.count} entries mention this symptom, with an average severity of ${topSymptom.averageSeverity}/10.`,
      priority: topSymptom.averageSeverity >= 7 ? 'watch' : 'info',
      evidence: [`Logged from ${formatDateRange(topSymptom.dates)}`],
    });
  }

  if (highSeverity.length > 0) {
    const urgentCount = highSeverity.filter((entry) => entry.severity === 10).length;
    insights.push({
      id: 'high-severity',
      title: urgentCount > 0 ? 'Maximum severity logged' : 'High severity entries logged',
      detail:
        urgentCount > 0
          ? `${urgentCount} entry reached 10/10. Treat severe or unsafe symptoms as urgent.`
          : `${highSeverity.length} entries were 8/10 or higher.`,
      priority: urgentCount > 0 ? 'urgent' : 'attention',
      evidence: highSeverity
        .slice(0, 3)
        .map((entry) => `${entry.date}: ${entry.symptom} ${entry.severity}/10`),
    });
  }

  const trend = findSeverityTrend(entries);
  if (trend) insights.push(trend);

  const timeCluster = findTimeCluster(entries);
  if (timeCluster) insights.push(timeCluster);

  const tagCounts = new Map<string, number>();
  for (const tag of entries.flatMap((entry) => entry.tags.map((item) => item.toLowerCase()))) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTag = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topTag && topTag[1] >= 2) {
    insights.push({
      id: 'tag-pattern',
      title: `${displaySymptom(topTag[0])} appears repeatedly`,
      detail: `The tag "${topTag[0]}" appears on ${topTag[1]} entries. Track whether it happens before, during, or after symptoms.`,
      priority: 'info',
      evidence: [`${topTag[1]} tagged entries`],
    });
  }

  if (entries.length > 0 && entries.length < 3) {
    insights.push({
      id: 'more-data-needed',
      title: 'More logs will improve pattern quality',
      detail: 'A few more entries across different days will make trends and repeated triggers easier to spot.',
      priority: 'info',
      evidence: [`${entries.length} entry${entries.length === 1 ? '' : ' entries'} available`],
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'no-strong-pattern',
      title: 'No strong pattern yet',
      detail: 'The current log does not show a repeated symptom, timing cluster, or severity trend.',
      priority: 'info',
      evidence: [`${entries.length} entries reviewed`],
    });
  }

  return {
    generatedAt,
    entryCount: entries.length,
    averageSeverity,
    highSeverityCount: highSeverity.length,
    insights,
    suggestedQuestions: [
      topSymptom
        ? `What should I watch for when ${displaySymptom(topSymptom.symptom)} appears repeatedly?`
        : 'What symptoms or triggers should I track more consistently?',
      highSeverity.length > 0
        ? 'At what severity level should I seek urgent care for these symptoms?'
        : 'What changes in frequency or severity would be concerning?',
      'Could timing, food, sleep, medication, activity, or stress be relevant to this pattern?',
    ],
    nextActions: [
      'Keep logging symptom, severity, time, notes, and possible triggers.',
      'Bring the recent log and pattern questions to a clinician when symptoms persist.',
      'Use emergency services for severe, sudden, or unsafe symptoms.',
    ],
    disclaimer: DISCLAIMER,
  };
}
