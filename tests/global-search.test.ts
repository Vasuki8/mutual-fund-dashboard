import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { planLabel, shortName } from '../src/lib/format.ts';
import type { Scheme } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/GlobalSearch.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Element = { type: unknown; props: Record<string, any> };
type Effect = { deps: unknown[]; cleanup?: () => void };

function elements(node: unknown, role: string): Element[] {
  if (!node || typeof node !== 'object') return [];
  const element = node as Element;
  return [
    ...(element.props?.role === role ? [element] : []),
    ...[element.props?.children].flat(Infinity).flatMap(child => elements(child, role)),
  ];
}

// Execute the component's real search, cancellation, and keyboard handlers.
// Only the React/DOM boundary, debounce clock, and provider replies are replaced.
function mountedSearch() {
  const state: unknown[] = [], refs: { current: unknown }[] = [], effects: Effect[] = [];
  const timers = new Map<number, () => void>();
  const requests: { query: string; resolve: (schemes: Scheme[]) => void }[] = [];
  const opened: Scheme[] = [];
  const scrolled: string[] = [];
  const inputElement = { focus() {}, select() {}, blur() {} };
  let stateIndex = 0, refIndex = 0, effectIndex = 0, nextTimer = 0;
  let dirty = false, tree: unknown;
  let pendingEffects: (() => void)[] = [];
  const jsx = (type: unknown, props: Record<string, any>) => {
    if (props?.ref) props.ref.current = inputElement;
    return { type, props };
  };
  const dependencies: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (update: unknown) => {
          const next = typeof update === 'function' ? update(state[index]) : update;
          if (!Object.is(next, state[index])) { state[index] = next; dirty = true; }
        }];
      },
      useRef(initial: unknown) { return refs[refIndex++] ??= { current: initial }; },
      useId: () => 'global-search-test',
      useEffect(run: () => void | (() => void), deps: unknown[]) {
        const index = effectIndex++;
        const previous = effects[index];
        if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
        pendingEffects.push(() => {
          previous?.cleanup?.();
          effects[index] = { deps, cleanup: run() || undefined };
        });
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {}, '../lib/format.ts': { planLabel, shortName },
    '../lib/api.ts': {
      searchSchemes: (query: string) => new Promise<Scheme[]>(resolve => { requests.push({ query, resolve }); }),
    },
  };
  const exports: { GlobalSearch?: (props: { openFund: (scheme: Scheme) => void }) => unknown } = {};
  new Function('require', 'exports', 'window', 'document', 'setTimeout', 'clearTimeout', compiled)(
    (name: string) => { assert.ok(name in dependencies, `Unexpected GlobalSearch dependency: ${name}`); return dependencies[name]; },
    exports,
    { addEventListener() {}, removeEventListener() {} },
    { getElementById: (id: string) => ({ scrollIntoView: () => { scrolled.push(id); } }) },
    (callback: () => void) => { const id = ++nextTimer; timers.set(id, callback); return id; },
    (id: number) => { timers.delete(id); },
  );
  const render = () => {
    stateIndex = 0; refIndex = 0; effectIndex = 0; dirty = false; pendingEffects = [];
    tree = exports.GlobalSearch!({ openFund: scheme => { opened.push(scheme); } });
  };
  const flush = () => {
    for (let iteration = 0; iteration < 20; iteration += 1) {
      if (dirty) render();
      const work = pendingEffects; pendingEffects = [];
      work.forEach(run => run());
      if (!dirty) return;
    }
    assert.fail('GlobalSearch did not settle after its effects.');
  };
  const input = () => {
    const match = elements(tree, 'combobox')[0];
    assert.ok(match, 'Global search must render an accessible combobox.');
    return match;
  };
  render(); flush();
  return {
    opened, requests, scrolled, input,
    options: () => elements(tree, 'option'),
    type(query: string, commitEffects = true) {
      input().props.onChange({ target: { value: query } });
      render();
      if (commitEffects) flush();
    },
    press(key: string) {
      let prevented = false;
      input().props.onKeyDown({ key, nativeEvent: { isComposing: false }, preventDefault() { prevented = true; } });
      flush();
      return prevented;
    },
    debounce() {
      const work = [...timers.values()]; timers.clear(); work.forEach(run => run());
    },
    async respond(query: string, schemes: Scheme[]) {
      const request = requests.find(value => value.query === query);
      assert.ok(request, `No provider request started for ${query}.`);
      request.resolve(schemes);
      await Promise.resolve();
      await Promise.resolve();
      flush();
    },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
  };
}

const alpha: Scheme = { schemeCode: 111111, schemeName: 'Alpha Direct Growth' };
const beta: Scheme = { schemeCode: 222222, schemeName: 'Beta Direct Growth' };
const secondBeta: Scheme = { schemeCode: 222223, schemeName: 'Beta Second Direct Growth' };

test('a changed query hides previous results before effects and cannot select an obsolete fund', async t => {
  const mounted = mountedSearch(); t.after(mounted.unmount);
  mounted.type('alpha'); mounted.debounce();
  await mounted.respond('alpha', [alpha]);
  assert.equal(mounted.options().length, 1);

  mounted.type('beta', false);
  assert.equal(mounted.options().length, 0, 'Old results must disappear in the input-change render.');
  assert.equal(mounted.input().props['aria-activedescendant'], undefined);
  mounted.press('Enter');
  assert.deepEqual(mounted.opened, [], 'Enter during the new query must not navigate to the old result.');
  mounted.debounce();
  await mounted.respond('beta', [beta]);
  mounted.press('Enter');
  assert.deepEqual(mounted.opened, [beta]);
});

test('an out-of-order reply cannot replace the current results or resurrect a completed search', async t => {
  const mounted = mountedSearch(); t.after(mounted.unmount);
  mounted.type('alpha'); mounted.debounce();
  mounted.type('another pending query'); mounted.debounce();
  mounted.type('beta'); mounted.debounce();
  await mounted.respond('beta', [beta]);
  await mounted.respond('alpha', [alpha]);
  assert.equal(mounted.options().length, 1, 'The obsolete reply must leave the current results available.');
  mounted.press('Enter');
  assert.deepEqual(mounted.opened, [beta]);
  await mounted.respond('another pending query', [alpha]);
  assert.equal(mounted.input().props.value, '');
  assert.equal(mounted.input().props['aria-expanded'], false);
  assert.equal(mounted.options().length, 0);
  assert.deepEqual(mounted.opened, [beta], 'A late reply must not reopen or navigate after selection.');
});

test('ArrowDown updates the accessible highlight and Enter opens the highlighted current fund', async t => {
  const mounted = mountedSearch(); t.after(mounted.unmount);
  mounted.type('beta'); mounted.debounce();
  await mounted.respond('beta', [beta, secondBeta]);
  assert.equal(mounted.input().props['aria-activedescendant'], mounted.options()[0].props.id);
  assert.equal(mounted.press('ArrowDown'), true);
  assert.equal(mounted.input().props['aria-activedescendant'], mounted.options()[1].props.id);
  assert.deepEqual(mounted.options().map(option => option.props['aria-selected']), [false, true]);
  assert.equal(mounted.scrolled.at(-1), mounted.options()[1].props.id);
  assert.equal(mounted.press('Enter'), true);
  assert.deepEqual(mounted.opened, [secondBeta]);
  assert.equal(mounted.input().props['aria-expanded'], false);
  assert.equal(mounted.input().props.value, '');
});

test('Escape closes suggestions and Enter cannot select while they are closed', async t => {
  const mounted = mountedSearch(); t.after(mounted.unmount);
  mounted.type('beta'); mounted.debounce();
  await mounted.respond('beta', [beta, secondBeta]);
  assert.equal(mounted.press('Escape'), true);
  assert.equal(mounted.input().props['aria-expanded'], false);
  assert.equal(mounted.input().props['aria-activedescendant'], undefined);
  assert.equal(mounted.options().length, 0);
  assert.equal(mounted.input().props.value, 'beta', 'Escape keeps the query available to reopen.');
  mounted.press('Enter');
  assert.deepEqual(mounted.opened, []);
  mounted.press('ArrowDown');
  assert.equal(mounted.input().props['aria-expanded'], true);
  assert.equal(mounted.options().length, 2);
});
