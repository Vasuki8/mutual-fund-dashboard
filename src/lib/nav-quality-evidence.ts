const INVALID_WARNING = /^Invalid NAV observations were excluded \(([1-9]\d*)\); derived analytics are blocked until the data is resolved\.$/;

/** Present only when every rejected observation is an explicitly dated zero. */
export function validateRejectedZeroNavDates(value: unknown, warnings: readonly string[],
  positiveDates?: Iterable<string>): string[] | undefined {
  if (value === undefined) return undefined;
  const invalidWarnings = warnings.filter(warning => /^Invalid NAV\b/i.test(warning));
  const count = invalidWarnings.length === 1 ? INVALID_WARNING.exec(invalidWarnings[0]) : null;
  if (!Array.isArray(value) || value.length === 0 || value.length > 100_000
    || !count || Number(count[1]) !== value.length
    || warnings.some(warning => /^Conflicting NAV\b/i.test(warning))
    || value.some((date, index) => typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date
      || (index > 0 && value[index - 1] >= date))) {
    throw new Error('Invalid rejected-zero NAV evidence.');
  }
  const positives = new Set(positiveDates);
  if (value.some(date => positives.has(date))) throw new Error('Rejected-zero NAV evidence overlaps positive observations.');
  return [...value] as string[];
}
