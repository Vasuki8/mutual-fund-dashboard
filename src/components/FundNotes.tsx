import { useMemo, useState } from 'react';
import { Pencil, StickyNote, Trash2 } from 'lucide-react';
import type { FundNote } from '../lib/types.ts';
import { MAX_FUND_NOTE_LENGTH, MAX_FUND_NOTES } from '../lib/storage.ts';

interface Props {
  schemeCode: number;
  notes: FundNote[];
  onSave: (body: string, editingId?: string) => boolean;
  onRemove: (id: string) => void;
}

/** Plain-text personal research: deliberately separate from MFAPI and the NAV archive. */
export function FundNotes({ schemeCode, notes, onSave, onRemove }: Props) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const ownNotes = useMemo(() => notes.filter(note => note.schemeCode === schemeCode)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)), [notes, schemeCode]);
  const full = notes.length >= MAX_FUND_NOTES;
  const cancelEdit = () => { setEditingId(null); setDraft(''); };
  const save = () => {
    if (!draft.trim() || draft.length > MAX_FUND_NOTE_LENGTH || (!editingId && full)) return;
    if (onSave(draft.trim(), editingId ?? undefined)) cancelEdit();
  };
  const timestamp = (value: string) => new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
  return <section className="panel fund-notes" aria-labelledby="fund-notes-heading">
    <div className="panel-heading"><div>
      <h2 id="fund-notes-heading"><StickyNote size={15}/> Personal research notes</h2>
      <p>{ownNotes.length} dated note{ownNotes.length === 1 ? '' : 's'} for scheme {schemeCode} · Private to this browser</p>
    </div></div>
    <form className="note-composer" onSubmit={event => { event.preventDefault(); save(); }}>
      <label htmlFor="fund-research-note">{editingId ? 'Edit research note' : 'Record an observation or research question'}</label>
      <textarea id="fund-research-note" aria-label="Personal fund research note"
        value={draft} onChange={event => setDraft(event.target.value)}
        placeholder="What changed? What will you verify next? Include the relevant NAV or disclosure date when useful."
        maxLength={MAX_FUND_NOTE_LENGTH} rows={4} disabled={!editingId && full}/>
      <div className="note-composer-actions"><small>{draft.length} / {MAX_FUND_NOTE_LENGTH} characters</small>
        {editingId && <button type="button" className="button secondary small" onClick={cancelEdit}>Cancel edit</button>}
        <button type="submit" className="button primary small"
          disabled={!draft.trim() || draft.length > MAX_FUND_NOTE_LENGTH || (!editingId && full)}>
          {editingId ? 'Save changes' : 'Save note'}
        </button>
      </div>
      {full && !editingId && <p className="panel-note" role="status">The {MAX_FUND_NOTES}-note workspace limit has been reached. Existing notes can still be edited or removed.</p>}
    </form>
    {ownNotes.length === 0 ? <p className="panel-note">No notes yet. Record a hypothesis, caveat or question alongside the fund's NAV research.</p>
      : <div className="note-list">{ownNotes.map(note => <article className="note-entry" key={note.id}>
        <div className="note-entry-heading"><time dateTime={note.updatedAt} title={note.updatedAt}>
          {note.createdAt === note.updatedAt ? 'Saved ' : 'Updated '}{timestamp(note.updatedAt)}
        </time><div className="note-entry-actions">
          <button className="button secondary small" type="button"
            aria-label={'Edit note from ' + timestamp(note.createdAt)}
            onClick={() => { setEditingId(note.id); setDraft(note.body); setDeleteId(null); }}>
            <Pencil size={13}/> Edit
          </button>
          {deleteId === note.id ? <>
            <span className="muted">Remove this note?</span>
            <button className="button secondary small" type="button" aria-label="Confirm remove note"
              onClick={() => { onRemove(note.id); setDeleteId(null); if (editingId === note.id) cancelEdit(); }}>
              Confirm remove
            </button>
            <button className="button secondary small" type="button" onClick={() => setDeleteId(null)}>Cancel</button>
          </> : <button className="button secondary small" type="button" aria-label={'Remove note from ' + timestamp(note.createdAt)}
            onClick={() => setDeleteId(note.id)}><Trash2 size={13}/> Remove</button>}
        </div></div>
        <p className="note-content">{note.body}</p>
        {note.createdAt !== note.updatedAt && <small className="muted">Created {timestamp(note.createdAt)}</small>}
      </article>)}</div>}
    <p className="panel-note">Notes are your own plain-text research, not fund data or investment advice. They stay in this browser and are included in your JSON export under Data &amp; backups. Clearing browser storage may erase them.</p>
  </section>;
}
