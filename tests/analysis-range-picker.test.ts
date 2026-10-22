import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as analytics from '../src/lib/analytics.ts';
import * as format from '../src/lib/format.ts';
import type { AnalysisRange, DateRange } from '../src/lib/types.ts';

const require = createRequire(import.meta.url);
const componentPath = new URL('../src/components/AnalysisRangePicker.tsx', import.meta.url);
type Element = { type: unknown; props: Record<string, any> };
type PickerProps = { value: AnalysisRange; onChange: (range: AnalysisRange) => void; defaultStart?: string; defaultEnd?: string };
type NoticeProps = { value: AnalysisRange; actualStart?: string | null; actualEnd?: string | null; presetEnd?: string };
type Components = {
  RangePicker: (props: PickerProps) => React.ReactElement;
  RangeNotice: (props: NoticeProps) => React.ReactElement | null;
};
let compiled: string | undefined;
let nextMount = 0;

function loadComponents(react: unknown = React, jsxRuntime: unknown = require('react/jsx-runtime')): Components {
  assert.ok(existsSync(componentPath), 'Shared analysis date controls must be implemented.');
  compiled ??= ts.transpileModule(readFileSync(componentPath, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const dependencies: Record<string, unknown> = {
    react, 'react/jsx-runtime': jsxRuntime,
    '../lib/analytics.ts': analytics, '../lib/format.ts': format,
  };
  const exports = {} as Components;
  new Function('require', 'exports', compiled)((name: string) => {
    assert.ok(name in dependencies, `Unexpected analysis range dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}

function elements(value: unknown, predicate: (element: Element) => boolean): Element[] {
  if (Array.isArray(value)) return value.flatMap(child => elements(child, predicate));
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const element = value as Element;
  return [...(predicate(element) ? [element] : []), ...elements(element.props.children, predicate)];
}

function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join('');
  if (value && typeof value === 'object' && 'props' in value) return text((value as Element).props.children);
  return value == null || typeof value === 'boolean' ? '' : String(value);
}

// Execute the component's real event handlers and shared date validator.
// Only React's mounting boundary is replaced; no browser DOM is needed.
function picker(initial: AnalysisRange = '3Y', defaults: { defaultStart?: string; defaultEnd?: string } = {}) {
  const states: unknown[] = [];
  const id = `analysis-range-test-${nextMount++}`;
  const changes: AnalysisRange[] = [];
  let stateIndex = 0;
  let value = initial;
  let tree: unknown;
  const jsx = (type: unknown, props: Element['props']) => ({ type, props });
  const { RangePicker } = loadComponents({
    useState(initialValue: unknown) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [states[index], (update: unknown) => {
        states[index] = typeof update === 'function' ? update(states[index]) : update;
      }];
    },
    useId: () => id,
  }, { jsx, jsxs: jsx });
  function render() {
    stateIndex = 0;
    tree = RangePicker({ ...defaults, value, onChange(range) { changes.push(range); value = range; } });
  }
  function button(label: string) {
    const result = elements(tree, node => node.type === 'button' && (node.props['aria-label'] === label || text(node) === label))[0];
    assert.ok(result, `Missing button: ${label}`);
    return result;
  }
  function input(label: string) {
    const target = elements(tree, node => node.type === 'label' && text(node) === label)[0];
    assert.ok(target, `Missing label: ${label}`);
    const result = elements(tree, node => node.type === 'input' && node.props.id === target.props.htmlFor)[0];
    assert.ok(result, `${label} must identify its date input.`);
    return result;
  }
  render();
  return {
    changes, button, input,
    value: () => value,
    form: () => elements(tree, node => node.type === 'form')[0],
    alerts: () => elements(tree, node => node.props.role === 'alert'),
    click(label: string) { button(label).props.onClick(); render(); },
    edit(label: string, next: string) {
      input(label).props.onChange({ target: { value: next }, currentTarget: { value: next } });
      render();
    },
    submit() {
      const form = elements(tree, node => node.type === 'form')[0];
      assert.ok(form, 'Custom dates must have a submit form.');
      let prevented = false;
      form.props.onSubmit({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true, 'Applying dates must not navigate away from the analysis.');
      render();
    },
    defaults(next: typeof defaults) { defaults = next; render(); },
  };
}

test('opening and editing Custom preserves the applied preset until submission', () => {
  const view = picker('3Y', { defaultStart: '2021-03-05', defaultEnd: '2024-03-05' });
  assert.equal(view.form(), undefined);
  assert.equal(view.button('Custom date range').props['aria-expanded'], false);
  view.click('Custom date range');
  assert.equal(view.input('Start date').props.value, '2021-03-05');
  assert.equal(view.input('End date').props.value, '2024-03-05');
  view.edit('Start date', '2023-01-01');
  view.edit('End date', '2023-12-31');
  assert.deepEqual(view.changes, []);
  assert.equal(view.value(), '3Y');
  assert.equal(view.button('3 years').props['aria-pressed'], true);
  assert.equal(view.button('Custom date range').props['aria-pressed'], false);
  assert.equal(view.button('Custom date range').props['aria-expanded'], true);
  assert.match(text(view.form()), /Apply dates updates charts and metrics/);
});

test('Apply dates submits both dates together and leaves the editor available', () => {
  const view = picker('1Y', { defaultStart: '2023-03-05', defaultEnd: '2024-03-05' });
  view.click('Custom date range');
  view.edit('Start date', '2023-01-15');
  view.edit('End date', '2023-10-31');
  assert.equal(view.button('Apply dates').props.type, 'submit');
  assert.equal(view.form().props.noValidate, true);
  view.submit();
  assert.deepEqual(view.changes, [{ start: '2023-01-15', end: '2023-10-31' }]);
  assert.equal(view.button('Custom date range').props['aria-pressed'], true);
  assert.equal(view.button('Custom date range').props['aria-expanded'], true);
  assert.equal(view.button('1 year').props['aria-pressed'], false);
  view.edit('End date', '2023-11-30');
  assert.deepEqual(view.value(), { start: '2023-01-15', end: '2023-10-31' }, 'Later edits must not mutate the applied range.');
  assert.equal(view.changes.length, 1);
});

test('an applied custom range seeds the editor and submission copies its value', () => {
  const initial: DateRange = { start: '2020-01-01', end: '2024-01-01' };
  const view = picker(initial, { defaultStart: '2023-01-01', defaultEnd: '2023-12-31' });
  if (!view.form()) view.click('Custom date range');
  assert.equal(view.input('Start date').props.value, initial.start);
  assert.equal(view.input('End date').props.value, initial.end);
  view.submit();
  assert.deepEqual(view.changes, [initial]);
  assert.notEqual(view.changes[0], initial, 'Applied dates must be emitted as a new value.');
});

test('empty, malformed, and impossible dates cannot replace the applied range', () => {
  for (const start of ['', 'not-a-date', '2023-02-29', '2024-02-30']) {
    const view = picker('3Y', { defaultStart: '2023-01-01', defaultEnd: '2024-03-05' });
    view.click('Custom date range');
    view.edit('Start date', start);
    view.submit();
    assert.deepEqual(view.changes, [], `Invalid start ${JSON.stringify(start)} must not apply.`);
    assert.equal(view.value(), '3Y');
    const alert = view.alerts()[0];
    assert.ok(alert, 'The validation message must be announced.');
    assert.match(text(alert), /date|valid|required/i);
    for (const label of ['Start date', 'End date']) {
      const input = view.input(label);
      assert.equal(input.props['aria-invalid'], true);
      assert.ok(input.props['aria-describedby'].split(' ').includes(alert.props.id), 'Date fields must refer to the validation error.');
    }
  }
});

test('reversed dates preserve the current custom result and a corrected range can be applied', () => {
  const initial = { start: '2023-01-01', end: '2023-12-31' };
  const view = picker(initial);
  if (!view.form()) view.click('Custom date range');
  view.edit('Start date', '2024-02-01');
  view.submit();
  assert.deepEqual(view.changes, []);
  assert.deepEqual(view.value(), initial);
  assert.match(text(view.alerts()[0]), /start.*end|end.*start/i);
  assert.equal(view.button('Custom date range').props['aria-pressed'], true);
  view.edit('End date', '2024-03-01');
  view.submit();
  assert.deepEqual(view.changes, [{ start: '2024-02-01', end: '2024-03-01' }]);
  assert.deepEqual(view.alerts(), []);
});

test('a one-day request is allowed so the parent can report insufficient observations', () => {
  const view = picker('MAX', { defaultStart: '2024-02-29', defaultEnd: '2024-02-29' });
  view.click('Custom date range');
  view.submit();
  assert.deepEqual(view.changes, [{ start: '2024-02-29', end: '2024-02-29' }]);
});

test('choosing a preset clears an invalid draft and reopens with the current actual dates', () => {
  const view = picker('3Y', { defaultStart: '2021-03-05', defaultEnd: '2024-03-05' });
  view.click('Custom date range');
  view.edit('End date', '');
  view.submit();
  assert.equal(view.alerts().length, 1);
  view.click('6 months');
  assert.deepEqual(view.changes, ['6M']);
  assert.equal(view.form(), undefined);
  assert.deepEqual(view.alerts(), []);
  assert.equal(view.button('6 months').props['aria-pressed'], true);
  assert.equal(view.button('Custom date range').props['aria-expanded'], false);
  view.defaults({ defaultStart: '2023-09-05', defaultEnd: '2024-03-05' });
  view.click('Custom date range');
  assert.equal(view.input('Start date').props.value, '2023-09-05');
  assert.equal(view.input('End date').props.value, '2024-03-05');
  assert.deepEqual(view.alerts(), []);
});

test('the editor remains usable with no available dates and does not restrict history bounds', () => {
  const view = picker();
  view.click('Custom date range');
  for (const label of ['Start date', 'End date']) {
    const input = view.input(label);
    assert.equal(input.props.type, 'date');
    assert.equal(input.props.value, '');
    assert.equal(input.props.min, undefined);
    assert.equal(input.props.max, undefined);
    assert.equal(input.props.disabled, undefined);
  }
  view.submit();
  assert.deepEqual(view.changes, []);
  view.edit('Start date', '1995-01-01');
  view.edit('End date', '2099-12-31');
  view.submit();
  assert.deepEqual(view.changes, [{ start: '1995-01-01', end: '2099-12-31' }]);
});

test('real React rendering gives each date field a unique, associated label and help text', () => {
  const { RangePicker } = loadComponents();
  const value = { start: '2023-01-01', end: '2024-01-01' };
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(RangePicker, { value, onChange() {} }),
    React.createElement(RangePicker, { value, onChange() {} }),
  ));
  const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(match => match[0]);
  assert.equal(inputs.length, 4);
  const ids = inputs.map(input => input.match(/\bid="([^"]+)"/)?.[1]);
  assert.equal(new Set(ids).size, 4);
  for (const id of ids) {
    assert.ok(id);
    assert.ok(html.includes(`<label for="${id}">`), `Missing associated label for ${id}.`);
  }
  for (const input of inputs) {
    const help = input.match(/\baria-describedby="([^"]+)"/)?.[1];
    assert.ok(help);
    assert.ok(html.includes(`id="${help}"`), 'Date inputs must expose the apply hint.');
  }
});

function notice(props: NoticeProps) {
  const { RangeNotice } = loadComponents();
  const html = renderToStaticMarkup(React.createElement(RangeNotice, props));
  if (html) assert.match(html, /role="status"/, 'Applied date and coverage changes must be announced.');
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

test('custom range notices distinguish requested dates from shorter actual coverage', () => {
  const value = { start: '2023-01-01', end: '2024-12-31' };
  const message = notice({ value, actualStart: '2023-02-01', actualEnd: '2024-12-27' });
  assert.match(message, /Requested 1 Jan 2023 — 31 Dec 2024\./);
  assert.match(message, /starts on 1 Feb 2023.*after the requested start/);
  assert.match(message, /The last NAV used is 27 Dec 2024, before the requested end\./);
  assert.match(message, /Selected-period results use the actual NAV dates shown\./);
});

test('custom range notices disclose a preceding start NAV without claiming a requested-date observation', () => {
  const message = notice({ value: { start: '2024-03-10', end: '2024-04-10' }, actualStart: '2024-03-08', actualEnd: '2024-04-10' });
  assert.match(message, /Requested 10 Mar 2024 — 10 Apr 2024\./);
  assert.match(message, /preceding NAV.*8 Mar 2024/);
  assert.doesNotMatch(message, /starts on.*10 Mar 2024|after the requested start/);
});

test('custom requests remain visible without observations while preset notices keep their existing meaning', () => {
  assert.match(notice({ value: { start: '2099-01-01', end: '2099-12-31' } }), /Requested 1 Jan 2099 — 31 Dec 2099\./);
  assert.equal(notice({ value: 'MAX', actualStart: '2024-01-01', presetEnd: '2024-12-31' }), '');
  assert.equal(notice({ value: '1Y', actualStart: '2023-12-29', presetEnd: '2024-12-31' }), '');
  const presetMessage = notice({ value: '1Y', actualStart: '2024-01-05', presetEnd: '2024-12-31' });
  assert.match(presetMessage, /Available history starts after the requested period/);
  assert.match(presetMessage, /Selected-period results use the actual NAV dates shown\./);
});
