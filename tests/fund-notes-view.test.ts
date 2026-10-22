import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import type { FundNote } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/FundNotes.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Element = { type: unknown; props: { children?: unknown; [key: string]: any } };
const jsx = (type: unknown, props: Element['props']): Element => ({ type, props });
const at = '2026-10-22T12:00:00.000Z';
const note = (id: string, code = 122639, body = 'Monitor monthly rolling return dispersion.'): FundNote =>
  ({ id, schemeCode: code, body, createdAt: at, updatedAt: at });

function view(notes: FundNote[] = [], shouldSave = true) {
  const states: unknown[] = [];
  let index = 0;
  const saved: { body: string; id?: string }[] = [];
  const removed: string[] = [];
  const modules = {
    react: {
      useState(initial: unknown) {
        const at = index++;
        if (!(at in states)) states[at] = initial;
        return [states[at], (next: unknown) => { states[at] = typeof next === 'function' ? (next as (v:unknown)=>unknown)(states[at]) : next; }];
      },
      useMemo: (fn: () => unknown) => fn(),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': { Pencil: () => null, StickyNote: () => null, Trash2: () => null },
    '../lib/storage.ts': { MAX_FUND_NOTES: 120, MAX_FUND_NOTE_LENGTH: 3000 },
  };
  const exports: Record<string, (props: unknown) => Element> = {};
  new Function('require', 'exports', compiled)((name: string) => {
    assert.ok(name in modules, 'Unexpected FundNotes dependency: ' + name);
    return modules[name as keyof typeof modules];
  }, exports);
  let tree: Element;
  const render = () => {
    index = 0;
    tree = exports.FundNotes({
      schemeCode: 122639, notes,
      onSave: (body: string, id?: string) => { saved.push({ body, id }); return shouldSave; },
      onRemove: (id: string) => removed.push(id),
    });
  };
  const find = (pred: (node: Element) => boolean, current: unknown = tree): Element | undefined => {
    if (Array.isArray(current)) {
      for (const child of current) { const match = find(pred, child); if (match) return match; }
    } else if (current && typeof current === 'object' && 'props' in current) {
      const n = current as Element;
      return pred(n) ? n : find(pred, n.props.children);
    }
    return undefined;
  };
  const all = (current: unknown = tree): Element[] => {
    if (Array.isArray(current)) return current.flatMap(all);
    if (current && typeof current === 'object' && 'props' in current) {
      const n = current as Element;
      return [n, ...all(n.props.children)];
    }
    return [];
  };
  const text = (current: unknown = tree): string => {
    if (Array.isArray(current)) return current.map(text).join(' ');
    if (current && typeof current === 'object' && 'props' in current) return text((current as Element).props.children);
    return typeof current === 'string' || typeof current === 'number' ? String(current) : '';
  };
  const click = (description: string) => {
    const button = find(node => node.type === 'button' && node.props['aria-label'] === description);
    assert.ok(button, 'Missing control: ' + description);
    button.props.onClick();
    render();
  };
  const setText = (value: string) => {
    const input = find(node => node.type === 'textarea');
    assert.ok(input);
    input.props.onChange({ target: { value } });
    render();
  };
  const submit = () => {
    const form = find(node => node.type === 'form');
    assert.ok(form);
    let prevented = false;
    form.props.onSubmit({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    render();
  };
  render();
  return {find, all, text, click, setText, submit, saved, removed};
}

test('fund notes keep an accessible plain-text composer and show browser privacy disclosure', () => {
  const research = view();
  assert.match(research.text(), /Personal research notes/);
  assert.match(research.text(), /Private to this browser/);
  assert.match(research.text(), /included in your JSON export/i);
  assert.ok(research.find(node => node.type === 'textarea' && node.props['aria-label'] === 'Personal fund research note'));
  const submit = research.find(node => node.type === 'button' && node.props.type === 'submit');
  assert.equal(submit?.props.disabled, true);
  research.setText('A dated question about volatility.');
  const ready = research.find(node => node.type === 'button' && node.props.type === 'submit');
  assert.equal(ready?.props.disabled, false);
  research.submit();
  assert.deepEqual(research.saved, [{ body: 'A dated question about volatility.', id: undefined }]);
  assert.equal(research.find(node => node.type === 'textarea')?.props.value, '');
});

test('fund notes isolate scheme identities and support editing without accidental deletion', () => {
  const research = view([note('one'), note('two', 120716, 'Other fund text')]);
  assert.match(research.text(), /Monitor monthly rolling return dispersion/);
  assert.doesNotMatch(research.text(), /Other fund text/);
  assert.equal(research.all().filter(node => node.type === 'article').length, 1);
  const edit = research.all().find(node => node.type === 'button' && /^Edit note from/.test(node.props['aria-label']));
  assert.ok(edit);
  research.click(String(edit.props['aria-label']));
  research.setText('Updated analysis after NAV publication.');
  research.submit();
  assert.deepEqual(research.saved, [{ body: 'Updated analysis after NAV publication.', id: 'one' }]);
  const remove = research.all().find(node => node.type === 'button' && /^Remove note from/.test(node.props['aria-label']));
  assert.ok(remove);
  research.click(String(remove.props['aria-label']));
  research.click('Confirm remove note');
  assert.deepEqual(research.removed, ['one']);
});

test('unsaved drafts survive storage failure, and invalid or overlong notes are not submitted', () => {
  const research = view([], false);
  research.setText('Draft needing reliable storage.');
  research.submit();
  assert.equal(research.find(node => node.type === 'textarea')?.props.value, 'Draft needing reliable storage.');
  research.setText('   ');
  assert.equal(research.find(node => node.type === 'button' && node.props.type === 'submit')?.props.disabled, true);
  research.setText('x'.repeat(3001));
  assert.equal(research.find(node => node.type === 'button' && node.props.type === 'submit')?.props.disabled, true);
  assert.equal(research.saved.length, 1);
});

test('full note workspace disables new notes but leaves existing edits available', () => {
  const notes = Array.from({length:120}, (_,i)=>note('id-'+i,i===0?122639:120716));
  const research = view(notes);
  assert.equal(research.find(node => node.type === 'textarea')?.props.disabled, true);
  const edit = research.all().find(node => node.type === 'button' && /^Edit note from/.test(node.props['aria-label']));
  assert.ok(edit);
  research.click(String(edit.props['aria-label']));
  // Editing an existing item does not increase the workspace note count.
  const editor = research.find(node => node.type === 'textarea');
  assert.equal(editor?.props.disabled, false);
  research.setText('Updated note at the workspace limit');
  research.submit();
  assert.deepEqual(research.saved, [{body:'Updated note at the workspace limit', id:'id-0'}]);
});
