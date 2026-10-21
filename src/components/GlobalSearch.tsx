import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, Search, X } from 'lucide-react';
import { searchSchemes } from '../lib/api.ts';
import { planLabel, shortName } from '../lib/format.ts';
import type { Scheme } from '../lib/types.ts';

interface Props { openFund: (scheme: Scheme) => void }
interface SearchState { query: string; results: Scheme[]; error: string; pending: boolean }

export function GlobalSearch({ openFund }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SearchState>({ query: '', results: [], error: '', pending: false });
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const trimmed = query.trim();
  const current = state.query === trimmed;
  const results = current ? state.results.slice(0, 8) : [];
  const pending = !!trimmed && (!current || state.pending);
  const error = current ? state.error : '';

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey))
          || (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey)) {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', focus);
    return () => window.removeEventListener('keydown', focus);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setActive(0);
    if (!trimmed) {
      setState({ query: '', results: [], error: '', pending: false });
      return;
    }
    setState({ query: trimmed, results: [], error: '', pending: true });
    const timer = setTimeout(() => {
      searchSchemes(trimmed).then(matches => {
        if (!cancelled) setState({ query: trimmed, results: matches, error: '', pending: false });
      }).catch(reason => {
        if (!cancelled) setState({ query: trimmed, results: [], error: reason instanceof Error ? reason.message : 'Search is unavailable. Please retry.', pending: false });
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trimmed, attempt]);

  useEffect(() => {
    if (open && results[active]) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId, results.length]);

  const choose = (scheme: Scheme) => {
    setOpen(false);
    setQuery('');
    openFund(scheme);
    input.current?.blur();
  };

  return <div className="global-search" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="global-search-field">
      <Search size={16} aria-hidden="true"/>
      <input ref={input} type="search" value={query} maxLength={200}
        placeholder="Find a fund or scheme code…" aria-label="Search all mutual funds"
        role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off" spellCheck={false}
        onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
          else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            if (results.length) setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
          } else if (event.key === 'Enter' && open && results[active]) {
            event.preventDefault(); choose(results[active]);
          }
        }}/>
      {pending ? <Loader2 className="spin" size={15} aria-label="Searching"/>
        : query ? <button className="icon-button" aria-label="Clear global search" onClick={() => { setQuery(''); input.current?.focus(); }}><X size={14}/></button>
          : <kbd className="search-shortcut">Ctrl K</kbd>}
    </div>
    {open && <div className="global-search-results">
      {!trimmed ? <p className="global-search-state">Search by fund name, fund house, or scheme code.</p>
        : pending ? <p className="global-search-state" role="status">Searching MFAPI’s scheme directory…</p>
          : error ? <div className="global-search-state" role="status"><p>{error}</p><button className="text-action" onClick={() => setAttempt(value => value + 1)}>Retry search</button></div>
            : !results.length ? <p className="global-search-state" role="status">No matching funds. Try a shorter name or a scheme code.</p>
              : <p className="global-search-state" role="status">{state.results.length > 8 ? 'First 8 of ' : ''}{state.results.length} matching funds · ↑ ↓ to select</p>}
      <div id={listId} role="listbox" aria-label="Matching mutual funds">
        {results.map((scheme, index) => <button key={scheme.schemeCode} id={`${listId}-${index}`}
          className={`global-search-option ${index === active ? 'active' : ''}`}
          type="button" role="option" aria-selected={index === active} tabIndex={-1}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(scheme)}>
          <span className="search-result-copy"><strong>{shortName(scheme.schemeName)}</strong><small>{planLabel(scheme.schemeName)} · {scheme.schemeCode}</small></span>
          <ArrowUpRight size={15} aria-hidden="true"/>
        </button>)}
      </div>
    </div>}
  </div>;
}
