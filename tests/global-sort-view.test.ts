import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as fundSort from '../src/lib/fund-sort.ts';
import * as analytics from '../src/lib/analytics.ts';
import type { Scheme } from '../src/lib/types.ts';

type Element = { type: unknown; props: { children?: unknown; [name: string]: any } };
const source = readFileSync(new URL('../src/components/Home.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const schemes: Scheme[] = Array.from({ length: 21 }, (_, i) =>
  ({ schemeCode: i + 1, schemeName: `Fund ${String(21 - i).padStart(2, '0')} - Direct Growth` }));
const archived = Object.fromEntries(schemes.slice(0,17).map(scheme =>
  [scheme.schemeCode, { schemeCode: scheme.schemeCode, navDate: '2026-10-20',
    oneYear: scheme.schemeCode/100, threeYear: scheme.schemeCode/200, fiveYear: null }]));

function pageView(hasIndex = true) {
  const TABLE = Symbol('FundTable'), PREVIEW=Symbol('FundPreview');
  const state: unknown[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  let stateIndex=0, effectIndex=0, dirty=false, pending: (()=>void)[] = [], tree: Element;
  let readCount=0;
  const jsx=(type:unknown,props:Element['props']):Element=>({type,props});
  const dependencies: Record<string, unknown> = {
    react: {
      useState(value: unknown) {
        const at=stateIndex++;
        if(!(at in state))state[at]=typeof value==='function'?(value as ()=>unknown)():value;
        return [state[at],(next:unknown)=>{
          const actual=typeof next==='function'?(next as (v:unknown)=>unknown)(state[at]):next;
          if(!Object.is(actual,state[at])){state[at]=actual;dirty=true;}
        }];
      },
      useMemo: (fn:()=>unknown) => fn(),
      useEffect(run:()=>void|(()=>void),deps:unknown[]) {
        const at=effectIndex++, prev=effects[at];
        if(prev&&prev.deps.length===deps.length&&deps.every((value,i)=>Object.is(value,prev.deps[i])))return;
        pending.push(()=>{prev?.cleanup?.();effects[at]={deps,cleanup:run()||undefined};});
      },
    },
    'react/jsx-runtime': {jsx,jsxs:jsx,Fragment:Symbol('Fragment')},
    'lucide-react': {},
    '../lib/types.ts': {},
    '../lib/api.ts': {searchSchemes:async()=>[]},
    '../lib/analytics.ts': analytics,
    '../lib/shared-archive.ts': {loadSharedReturnIndex:async()=>{readCount++;return hasIndex ? archived : null;}},
    '../lib/fund-sort.ts': fundSort,
    '../lib/catalog.ts': {STARTER_FUNDS:schemes.slice(0,6)},
    './FundTable.tsx': {FundTable:TABLE},
    './FundPreview.tsx': {FundPreview:PREVIEW},
  };
  const exports: Record<string,(props:unknown)=>Element> = {};
  new Function('require','exports',compiled)((name:string)=>{
    assert.ok(name in dependencies, 'Unexpected Home dependency '+name);
    return dependencies[name];
  },exports);
  const props = { savedOnly:true, watchlist:schemes, compared:[],
    funds:{},errors:{}, ensureFund:async()=>{},toggleWatch(){},toggleCompare(){},openFund(){},
    openCompare(){},openResearch(){},browse(){},
  };
  const walk=(value:unknown):Element[] => {
    if(Array.isArray(value))return value.flatMap(walk);
    if(value && typeof value==='object' && 'props' in value){
      const node=value as Element;return [node,...walk(node.props.children)];
    }
    return [];
  };
  function render() {
    let loops=0;
    do {
      assert.ok(loops++<12,'Home effects should settle');
      dirty=false;stateIndex=0;effectIndex=0;
      tree=exports.Home(props);
      const queued=pending;pending=[];queued.forEach(job=>job());
    } while(dirty);
  }
  const all=()=>walk(tree);
  const table=()=>{const value=all().find(node=>node.type===TABLE);assert.ok(value);return value!;};
  const page=()=>table().props.schemes.map((s:Scheme)=>s.schemeCode);
  const click=(label:string)=>{
    const button=all().find(node=>node.type==='button'&&node.props['aria-label']===label);
    assert.ok(button,'Missing '+label);
    assert.equal(button!.props.disabled,false,'Pagination must be available');
    button!.props.onClick();render();
  };
  render();
  return {
    render,
    ready:async()=>{await new Promise<void>(resolve=>setImmediate(resolve));render();},
    page,
    sort:(key:fundSort.FundSortKey)=>{table().props.onSort(key);render();},
    next:()=>click('Next page'),
    table,
    all,
    get readCount(){return readCount;},
    unmount:()=>effects.forEach(x=>x.cleanup?.()),
  };
}

test('fund name sorting applies before page slicing and includes all watchlist results', async()=>{
  const view=pageView();
  await view.ready();
  assert.deepEqual(view.page(),[21,20,19,18,17,16,15,14]);
  view.next();
  assert.deepEqual(view.page(),[13,12,11,10,9,8,7,6]);
  view.sort('name');
  assert.deepEqual(view.page(),[1,2,3,4,5,6,7,8],'New sorting should reset pagination to page one.');
  assert.equal(view.table().props.sort.desc,true);
  assert.equal(view.readCount,1,'Do not fetch the return index repeatedly on sort.');
  view.unmount();
});

test('performance sort ranks archived returns across every page, never the current eight rows', async()=>{
  const view=pageView();
  await view.ready();
  assert.equal(view.table().props.canSortReturns,true);
  view.next();
  view.sort('1');
  assert.deepEqual(view.page(),[17,16,15,14,13,12,11,10]);
  view.next();
  assert.deepEqual(view.page(),[9,8,7,6,5,4,3,2]);
  view.next();
  assert.deepEqual(view.page(),[1,21,20,19,18],
    'Unarchived funds are last even when performance sorting descends.');
  view.sort('1');
  assert.deepEqual(view.page(),[1,2,3,4,5,6,7,8],'Ascending also sorts all pages and resets to first.');
  view.unmount();
});

test('no verified return index disables misleading multi-page performance sorting', async()=>{
  const view=pageView(false);
  await view.ready();
  assert.equal(view.table().props.canSortReturns,false);
  assert.match(view.all().map(n=>typeof n.props.children==='string'?n.props.children:'').join(' '),
    /global return sorting needs the verified archive/i);
  const before=view.page();
  view.sort('3');
  assert.deepEqual(view.page(),before);
  assert.equal(view.table().props.sort.key,'name');
  view.unmount();
});
