import { useId, useState } from 'react';
import type { AnalysisRange, DateRange, Period } from '../lib/types.ts';
import { periodStart, validateDateRange } from '../lib/analytics.ts';
import { dateLabel } from '../lib/format.ts';

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];

interface RangePickerProps {
  value: AnalysisRange;
  onChange: (range: AnalysisRange) => void;
  defaultStart?: string;
  defaultEnd?: string;
}

export function RangePicker({ value, onChange, defaultStart, defaultEnd }: RangePickerProps) {
  const customApplied = typeof value !== 'string';
  const [editorOpen, setEditorOpen] = useState(customApplied);
  const [draft, setDraft] = useState<DateRange>(() => customApplied
    ? { ...value }
    : { start: defaultStart ?? '', end: defaultEnd ?? '' });
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const formId = `${id}-form`;
  const startId = `${id}-start`;
  const endId = `${id}-end`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${helpId} ${errorId}` : helpId;

  function toggleEditor() {
    if (!editorOpen) {
      setDraft(customApplied ? { ...value } : { start: defaultStart ?? '', end: defaultEnd ?? '' });
      setError(null);
    }
    setEditorOpen(!editorOpen);
  }

  return <div className="analysis-range-controls">
    <div className="range-picker" role="group" aria-label="Analysis period">
      {PERIODS.map(period => <button
        key={period}
        type="button"
        className={value === period ? 'selected' : ''}
        aria-pressed={value === period}
        aria-label={period === 'MAX' ? 'All available history' : `${period.slice(0, -1)} ${period.endsWith('M') ? 'month' : 'year'}${period.startsWith('1') ? '' : 's'}`}
        onClick={() => { setEditorOpen(false); setError(null); onChange(period); }}
      >{period === 'MAX' ? 'All' : period}</button>)}
      <button
        type="button"
        className={customApplied ? 'selected' : ''}
        aria-label="Custom date range"
        aria-pressed={customApplied}
        aria-expanded={editorOpen}
        aria-controls={editorOpen ? formId : undefined}
        onClick={toggleEditor}
      >Custom</button>
    </div>
    {editorOpen && <form
      id={formId}
      className="custom-range-form"
      aria-label="Custom analysis dates"
      noValidate
      onSubmit={event => {
        event.preventDefault();
        const validationError = validateDateRange(draft);
        setError(validationError);
        if (!validationError) onChange({ ...draft });
      }}
    >
      <div className="custom-range-field">
        <label htmlFor={startId}>Start date</label>
        <input
          id={startId}
          type="date"
          required
          value={draft.start}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={event => { setDraft(previous => ({ ...previous, start: event.target.value })); setError(null); }}
        />
      </div>
      <div className="custom-range-field">
        <label htmlFor={endId}>End date</label>
        <input
          id={endId}
          type="date"
          required
          value={draft.end}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={event => { setDraft(previous => ({ ...previous, end: event.target.value })); setError(null); }}
        />
      </div>
      <div className="custom-range-actions"><button className="button secondary small" type="submit">Apply dates</button></div>
      <p className="custom-range-help" id={helpId}>Apply dates updates charts and metrics. Results use available NAV dates; history may cover a shorter range.</p>
      {error && <p className="custom-range-error" id={errorId} role="alert">{error}</p>}
    </form>}
  </div>;
}

interface RangeNoticeProps {
  value: AnalysisRange;
  actualStart?: string | null;
  actualEnd?: string | null;
  presetEnd?: string;
}

export function RangeNotice({ value, actualStart, actualEnd, presetEnd }: RangeNoticeProps) {
  if (typeof value === 'string') {
    const requestedStart = presetEnd ? periodStart(presetEnd, value) : null;
    if (!requestedStart || !actualStart || actualStart <= requestedStart) return null;
    return <p className="small-notice range-notice" role="status">Available history starts after the requested period. Selected-period results use the actual NAV dates shown.</p>;
  }
  return <p className="small-notice range-notice" role="status">
    Requested {dateLabel(value.start, true)} — {dateLabel(value.end, true)}.{' '}
    {actualStart && actualStart > value.start && <>Available history starts on {dateLabel(actualStart, true)}, after the requested start.{' '}</>}
    {actualStart && actualStart < value.start && <>The start uses the preceding NAV from {dateLabel(actualStart, true)} (within seven days).{' '}</>}
    {actualEnd && actualEnd < value.end && <>The last NAV used is {dateLabel(actualEnd, true)}, before the requested end.{' '}</>}
    Selected-period results use the actual NAV dates shown.
  </p>;
}
