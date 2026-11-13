/** Shared wire protocol: full state on join, changed records during play. */
export function isScoreSnapshot(value) {
  return value && typeof value === 'object' && Array.isArray(value.matches) &&
    Array.isArray(value.mbblTies) && typeof value.generatedAt === 'string' &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    value.matches.every(row => row && typeof row.id === 'string') &&
    value.mbblTies.every(row => row && typeof row.id === 'string');
}
export function scoreSnapshotIsNewer(next, previous) {
  if (!isScoreSnapshot(next)) return false;
  if (previous.generatedAt && Date.parse(next.generatedAt) < Date.parse(previous.generatedAt)) return false;
  // Postgres timestamps have microseconds; JS Date truncates to milliseconds.
  // Record versions prevent regression even when timestamps compare equal.
  for (const key of ['matches', 'mbblTies']) {
    const old = new Map(previous[key].map(row => [row.id, Number(row.version || 0)]));
    if (next[key].some(row => Number(row.version || 0) < (old.get(row.id) || 0))) return false;
  }
  return true;
}
export function scoreDelta(previous, next) {
  const delta = {generatedAt: next.generatedAt};
  let changed = false;
  for (const key of ['matches', 'mbblTies']) {
    const old = new Map(previous[key].map(row => [row.id, JSON.stringify(row)]));
    const ids = new Set(next[key].map(row => row.id));
    delta[key] = next[key].filter(row => old.get(row.id) !== JSON.stringify(row));
    delta['removed_' + key] = previous[key].filter(row => !ids.has(row.id)).map(row => row.id);
    changed ||= delta[key].length > 0 || delta['removed_' + key].length > 0;
  }
  if (JSON.stringify(previous.standings) !== JSON.stringify(next.standings)) {
    delta.standings = next.standings;
    changed = true;
  }
  return changed ? delta : null;
}
export function applyScoreDelta(previous, delta) {
  const next = {...previous, generatedAt: delta.generatedAt};
  for (const key of ['matches', 'mbblTies']) {
    if (!Array.isArray(delta[key]) || !Array.isArray(delta['removed_' + key])) throw Error('Invalid score update');
    const removed = new Set(delta['removed_' + key]);
    const rows = new Map(previous[key].filter(row => !removed.has(row.id)).map(row => [row.id, row]));
    for (const row of delta[key]) {
      if (!row || typeof row.id !== 'string') throw Error('Invalid score row');
      rows.set(row.id, row);
    }
    next[key] = [...rows.values()];
  }
  if ('standings' in delta) next.standings = delta.standings;
  if (!isScoreSnapshot(next)) throw Error('Invalid score snapshot');
  return next;
}
