import { useState } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';
import type { AnalysisRange, SavedComparison, Scheme } from '../lib/types.ts';
import { MAX_COMPARISON_NAME_LENGTH, MAX_SAVED_COMPARISONS } from '../lib/storage.ts';
import { dateLabel, shortName } from '../lib/format.ts';

interface Props {
  schemes: Scheme[];
  range: AnalysisRange;
  saved: SavedComparison[];
  onSave: (name: string, schemes: Scheme[], range: AnalysisRange) => boolean;
  onLoad: (comparison: SavedComparison) => void;
  onRemove: (id: string) => void;
}
function rangeLabel(range: AnalysisRange): string {
  return typeof range === 'string' ? range : range.start + ' – ' + range.end;
}

/** Local research presets, not frozen NAV outcomes or an external cloud account. */
export function SavedComparisons({ schemes, range, saved, onSave, onLoad, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const full = saved.length >= MAX_SAVED_COMPARISONS;
  const save = () => {
    if (schemes.length < 2 || schemes.length > 4 || !name.trim() || name.length > MAX_COMPARISON_NAME_LENGTH || full) return;
    if (onSave(name.trim(), schemes, range)) setName('');
  };
  return <section className="panel saved-comparisons" aria-labelledby="saved-comparisons-heading">
    <div className="panel-heading"><div>
      <h2 id="saved-comparisons-heading"><BookmarkPlus size={15}/> Saved comparisons
        <span className="count-badge">{saved.length}</span></h2>
      <p>Return to an earlier fund selection and requested analysis period.</p>
    </div><button className="button secondary small" aria-expanded={expanded} aria-controls="saved-comparisons-content"
      onClick={() => setExpanded(value => !value)}>{expanded ? 'Close workspace' : 'Manage saved'}</button></div>
    {expanded && <div className="saved-comparisons-content" id="saved-comparisons-content">
      <form className="save-comparison-form" onSubmit={event => { event.preventDefault(); save(); }}>
        <label htmlFor="comparison-name">Save current selection</label>
        <div className="save-comparison-input"><input id="comparison-name" type="text" value={name}
          onChange={event => setName(event.target.value)} maxLength={MAX_COMPARISON_NAME_LENGTH}
          placeholder="e.g., Flexi-cap alternatives" aria-label="Name for saved comparison"/>
          <button type="submit" className="button primary small"
            disabled={schemes.length < 2 || schemes.length > 4 || !name.trim() || name.length > MAX_COMPARISON_NAME_LENGTH || full}>
            Save current
          </button></div>
        <small>Current: {schemes.length} selected fund{schemes.length === 1 ? '' : 's'} · {rangeLabel(range)} · {saved.length}/{MAX_SAVED_COMPARISONS} saved</small>
        {full && <p className="panel-note" role="status">Remove an old saved comparison to make room for another.</p>}
        {schemes.length < 2 && <p className="panel-note" role="status">Select two to four funds before saving a new comparison. Existing sets can still be loaded.</p>}
      </form>
      {saved.length === 0 ? <p className="panel-note">No comparisons saved yet.</p>
        : <div className="saved-comparison-list">{[...saved].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
          .map(item => <article className="saved-comparison-entry" key={item.id}>
            <div className="saved-comparison-description"><strong>{item.name}</strong>
              <small>{item.schemes.length} funds · {rangeLabel(item.range)} · Saved {dateLabel(item.savedAt.slice(0, 10), true)}</small>
              <span title={item.schemes.map(scheme => scheme.schemeName).join('; ')}>
                {item.schemes.map(scheme => shortName(scheme.schemeName)).join(' · ')}
              </span></div>
            <div className="saved-comparison-actions">
              <button className="button secondary small" onClick={() => onLoad(item)}
                aria-label={'Load saved comparison ' + item.name}>Load</button>
              {deleteId === item.id ? <>
                <span className="muted">Remove this set?</span>
                <button className="button secondary small" aria-label={'Confirm remove comparison ' + item.name}
                  onClick={() => { onRemove(item.id); setDeleteId(null); }}>Confirm</button>
                <button className="button secondary small" onClick={() => setDeleteId(null)}>Cancel</button>
              </> : <button className="button secondary small" aria-label={'Remove saved comparison ' + item.name}
                onClick={() => setDeleteId(item.id)}><Trash2 size={13}/> Remove</button>}
            </div>
          </article>)}</div>}
      <p className="panel-note">Only scheme identities and the requested date range are saved. Results use current available NAV history whenever you load a set. Your saved research stays in this browser and is included in Data &amp; backups.</p>
    </div>}
  </section>;
}
