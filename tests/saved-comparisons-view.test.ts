import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as format from '../src/lib/format.ts';
import type { AnalysisRange, SavedComparison, Scheme } from '../src/lib/types.ts';

const source = readFileSync(new URL('../src/components/SavedComparisons.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
type Element = {type: unknown; props: {children?: unknown; [key: string]: any}};
const jsx = (type: unknown, props: Element['props']): Element => ({type, props});
const schemes: Scheme[] = [
  {schemeCode:122639,schemeName:'Alpha Flexi Cap - Direct Plan - Growth'},
  {schemeCode:120716,schemeName:'Beta Flexi Cap - Direct Plan - Growth'},
];
const recorded: SavedComparison = {
  id:'saved-one', name:'My matched funds', schemes, range:{start:'2023-01-01',end:'2025-12-31'},
  savedAt:'2026-10-22T10:00:00.000Z',
};
function workspace(selections: Scheme[] = schemes, saved: SavedComparison[] = [], accepted = true) {
  const state: unknown[] = [];
  let index = 0;
  const stored: {name:string;schemes:Scheme[];range:AnalysisRange}[] = [];
  const loaded: SavedComparison[] = [];
  const removed: string[] = [];
  const dependencies = {
    react: {
      useState(initial: unknown) {
        const i = index++;
        if (!(i in state)) state[i] = initial;
        return [state[i], (value: unknown) => { state[i] = typeof value === 'function' ? (value as (x:unknown)=>unknown)(state[i]) : value; }];
      },
    },
    'react/jsx-runtime': {jsx, jsxs:jsx, Fragment:Symbol('fragment')},
    'lucide-react': {BookmarkPlus:()=>null, Trash2:()=>null},
    '../lib/storage.ts': {MAX_COMPARISON_NAME_LENGTH:80,MAX_SAVED_COMPARISONS:24},
    '../lib/format.ts': format,
  };
  const exports: Record<string, (props: unknown) => Element> = {};
  new Function('require','exports',compiled)((name:string) => {
    assert.ok(name in dependencies, 'Unexpected SavedComparisons dependency: '+name);
    return dependencies[name as keyof typeof dependencies];
  },exports);
  let tree: Element;
  function render() {
    index = 0;
    tree = exports.SavedComparisons({schemes:selections, range:'3Y', saved,
      onSave:(name:string,schemes:Scheme[],range:AnalysisRange)=>{stored.push({name,schemes,range});return accepted;},
      onLoad:(comparison:SavedComparison)=>loaded.push(comparison),
      onRemove:(id:string)=>removed.push(id)});
  }
  function findIn(predicate:(node:Element)=>boolean,current:unknown):Element|undefined {
    if(Array.isArray(current)) {
      for(const child of current){const result=findIn(predicate,child);if(result)return result;}
    } else if(current&&typeof current==='object'&&'props' in current) {
      const node=current as Element;
      return predicate(node)?node:findIn(predicate,node.props.children);
    }
    return undefined;
  }
  const find=(predicate:(node:Element)=>boolean)=>findIn(predicate,tree);
  const button=(label:string)=>{
    const node=find(node=>node.type==='button'&&node.props['aria-label']===label);
    assert.ok(node,'Missing button '+label);
    node.props.onClick();render();
  };
  const expand=()=>{
    const node=find(node=>node.type==='button'&&typeof node.props['aria-expanded']==='boolean');
    assert.ok(node); node.props.onClick();render();
  };
  const setName=(value:string)=>{
    const input=find(node=>node.type==='input'&&node.props['aria-label']==='Name for saved comparison');
    assert.ok(input);input.props.onChange({target:{value}});render();
  };
  const submit=()=>{
    const form=find(node=>node.type==='form');
    assert.ok(form);let prevented=false;
    form.props.onSubmit({preventDefault(){prevented=true;}});render();
    assert.ok(prevented);
  };
  render();
  return {find,button,expand,setName,submit,stored,loaded,removed};
}

test('saving a named comparison captures exact scheme codes and requested period', () => {
  const view=workspace();
  const disclosure=view.find(node=>node.type==='button'&&node.props['aria-expanded']===false);
  assert.ok(disclosure);
  view.expand();
  const initiallyDisabled=view.find(node=>node.type==='button'&&node.props.type==='submit');
  assert.equal(initiallyDisabled?.props.disabled,true);
  view.setName('Flexi cap candidates');
  assert.equal(view.find(node=>node.type==='button'&&node.props.type==='submit')?.props.disabled,false);
  view.submit();
  assert.deepEqual(view.stored, [{name:'Flexi cap candidates',schemes,range:'3Y'}]);
  assert.equal(view.find(node=>node.type==='input'&&node.props['aria-label']==='Name for saved comparison')?.props.value,'');
});

test('saved sets can be restored even when no funds are currently selected, with confirmed removal', () => {
  const view=workspace([], [recorded]);
  view.expand();
  assert.equal(view.find(node=>node.type==='button'&&node.props.type==='submit')?.props.disabled,true);
  view.button('Load saved comparison My matched funds');
  assert.deepEqual(view.loaded,[recorded]);
  view.button('Remove saved comparison My matched funds');
  assert.deepEqual(view.removed,[], 'Removal needs confirmation.');
  view.button('Confirm remove comparison My matched funds');
  assert.deepEqual(view.removed,['saved-one']);
});

test('failed settings storage retains the named comparison draft', () => {
  const view=workspace(schemes, [], false);
  view.expand();view.setName('My investment study');
  view.submit();
  assert.equal(view.find(node=>node.type==='input'&&node.props['aria-label']==='Name for saved comparison')?.props.value,'My investment study');
  view.setName('  ');
  assert.equal(view.find(node=>node.type==='button'&&node.props.type==='submit')?.props.disabled,true);
  assert.equal(view.stored.length,1);
});

test('the 24-set workspace limit blocks new writes without hiding saved sets', () => {
  const snapshots=Array.from({length:24},(_,i)=>({...recorded,id:'saved-'+i,name:'Set '+i}));
  const view=workspace(schemes,snapshots);
  view.expand();view.setName('Additional set');
  assert.equal(view.find(node=>node.type==='button'&&node.props.type==='submit')?.props.disabled,true);
  view.button('Load saved comparison Set 0');
  assert.equal(view.loaded[0].id,'saved-0');
  assert.deepEqual(view.stored,[]);
});
