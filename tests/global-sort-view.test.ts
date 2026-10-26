import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as fundSort from '../src/lib/fund-sort.ts';
import * as directoryLib from '../src/lib/fund-directory.ts';
import * as analytics from '../src/lib/analytics.ts';
import type { Scheme } from '../src/lib/types.ts';

type Element = { type: unknown; props: { children?: unknown; [name: string]: any } };
const source = readFileSync(new URL('../src/components/Home.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function pageView(hasIndex = true, savedOnly = true, returnIndexVersion:1|2 = 1,
  total = 21, withCategories = true, withDirectory = true) {
  const schemes: Scheme[] = Array.from({ length: total }, (_, i) =>
    ({ schemeCode: i + 1, schemeName: `Fund ${String(total - i).padStart(3, '0')} - Direct Growth` }));
  const indexedCount = total === 21 ? 17 : total - 4;
  const archived = Object.fromEntries(schemes.slice(0,indexedCount).map(scheme =>
    [scheme.schemeCode, { schemeCode: scheme.schemeCode, navDate: '2026-10-20',
      oneYear: scheme.schemeCode/100, threeYear: scheme.schemeCode/200, fiveYear: null }]));
  const archivedWithDrawdown = Object.fromEntries(Object.values(archived).map(row =>
    [row.schemeCode,{...row,threeYearMaxDrawdown:row.schemeCode / -100}]));
  const categories = Object.fromEntries(schemes.slice(0,total-2).map(scheme => [scheme.schemeCode,
    scheme.schemeCode%3===0?'Equity Scheme - Small Cap Fund'
      :scheme.schemeCode%3===1?'Debt Scheme - Liquid Fund':'Hybrid Scheme - Aggressive Hybrid Fund']));
  const TABLE = Symbol('FundTable');
  const state: unknown[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  let stateIndex=0, effectIndex=0, dirty=false, pending: (()=>void)[] = [], tree: Element;
  let readCount=0, directoryReads=0, categoryReads=0;
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
    '../lib/shared-archive.ts': {
      loadSharedReturnIndex:async()=>{readCount++;return hasIndex ? returnIndexVersion===2 ? archivedWithDrawdown : archived : null;},
      loadCurrentOpenEndedDirectory:async()=>{directoryReads++;return withDirectory?schemes:null;},
      loadSharedCategoryIndex:async()=>{categoryReads++;return withCategories?categories:null;},
    },
    '../lib/fund-directory.ts': directoryLib,
    '../lib/fund-sort.ts': fundSort,
    '../lib/catalog.ts': {STARTER_FUNDS:schemes.slice(0,6)},
    './FundTable.tsx': {FundTable:TABLE},
  };
  const exports: Record<string,(props:unknown)=>Element> = {};
  new Function('require','exports',compiled)((name:string)=>{
    assert.ok(name in dependencies, 'Unexpected Home dependency '+name);
    return dependencies[name];
  },exports);
  const props = { savedOnly, watchlist:schemes, compared:[],
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
      assert.ok(loops++<15,'Home effects should settle');
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
    assert.equal(button!.props.disabled,false,'Navigation must be enabled');
    button!.props.onClick();render();
  };
  const select=(label:string,value:string)=>{
    const control=all().find(node=>node.type==='select'&&node.props['aria-label']===label);
    assert.ok(control,'Missing '+label);
    assert.notEqual(control!.props.disabled,true,'Selector must be enabled');
    control!.props.onChange({target:{value}});render();
  };
  render();
  return {
    render,
    ready:async()=>{await new Promise<void>(resolve=>setImmediate(resolve));render();},
    page,
    sort:(key:fundSort.FundSortKey)=>{table().props.onSort(key);render();},
    click,select,
    next:()=>click('Next page'),
    table,all,
    get readCount(){return readCount;},
    get directoryReads(){return directoryReads;},
    get categoryReads(){return categoryReads;},
    unmount:()=>effects.forEach(x=>x.cleanup?.()),
  };
}

test('full catalogue opens with 20 funds, instead of a six-fund starter page', async()=>{
  const view=pageView(true,false);
  await view.ready();
  assert.deepEqual(view.page(),Array.from({length:20},(_,i)=>21-i));
  view.next();
  assert.deepEqual(view.page(),[1]);
  assert.equal(view.directoryReads,1);
  assert.equal(view.categoryReads,1);
  view.unmount();
});

test('name sorting applies to all rows BEFORE 20-row pagination', async()=>{
  const view=pageView();
  await view.ready();
  assert.deepEqual(view.page(),Array.from({length:20},(_,i)=>21-i));
  view.next();
  assert.deepEqual(view.page(),[1]);
  view.sort('name');
  assert.deepEqual(view.page(),Array.from({length:20},(_,i)=>i+1),'New sorting resets to page one.');
  assert.equal(view.table().props.sort.desc,true);
  assert.equal(view.readCount,1,'Do not reload verified return index on sorting.');
  view.unmount();
});

test('return sorting ranks all 21 available rows before pagination in both directions', async()=>{
  const view=pageView();
  await view.ready();
  assert.equal(view.table().props.canSortReturns,true);
  view.next();
  view.sort('1');
  assert.deepEqual(view.page(),[...Array.from({length:17},(_,i)=>17-i),21,20,19]);
  view.next();
  assert.deepEqual(view.page(),[18]);
  view.sort('1');
  assert.deepEqual(view.page(),[...Array.from({length:17},(_,i)=>i+1),21,20,19]);
  view.unmount();
});

test('missing verified return index disables misleading global performance sorting', async()=>{
  const view=pageView(false);
  await view.ready();
  assert.equal(view.table().props.canSortReturns,false);
  assert.match(JSON.stringify(view.all().map(n=>n.props.children)),/global return sorting requires complete data/i);
  const before=view.page();
  view.sort('3');
  assert.deepEqual(view.page(),before);
  assert.equal(view.table().props.sort.key,'name');
  view.unmount();
});

test('3Y drawdown sorts all 21 histories, while version 1 keeps downside disabled', async()=>{
  const view=pageView(true,true,2);
  await view.ready();
  assert.equal(view.table().props.canSortDrawdown,true);
  view.next();
  view.sort('dd3');
  assert.deepEqual(view.page(),[...Array.from({length:17},(_,i)=>i+1),21,20,19]);
  view.next();
  assert.deepEqual(view.page(),[18]);
  view.sort('dd3');
  assert.deepEqual(view.page(),[...Array.from({length:17},(_,i)=>17-i),21,20,19]);
  view.unmount();
  const old=pageView(true,true,1);
  await old.ready();
  assert.equal(old.table().props.canSortDrawdown,false);
  old.sort('dd3');
  assert.equal(old.table().props.sort.key,'name');
  old.unmount();
});

test('users can select 20, 50, or 100 funds, jump to a page, and navigate first/last', async()=>{
  const view=pageView(true,false,2,125);
  await view.ready();
  assert.equal(view.page().length,20);
  view.click('Last page');
  assert.deepEqual(view.page(),[5,4,3,2,1]);
  view.select('Funds per page','50');
  assert.equal(view.page().length,50);
  assert.equal(view.page()[0],125);
  view.next();
  assert.equal(view.page().length,50);
  assert.equal(view.page()[0],75);
  view.next();
  assert.deepEqual(view.page(),Array.from({length:25},(_,i)=>25-i));
  view.click('First page');
  assert.equal(view.page()[0],125);
  view.select('Funds per page','100');
  assert.equal(view.page().length,100);
  view.next();
  assert.deepEqual(view.page(),Array.from({length:25},(_,i)=>25-i));
  const pageInput=view.all().find(n=>n.type==='input'&&n.props['aria-label']==='Go to page');
  assert.ok(pageInput);
  pageInput!.props.onChange({target:{value:'1'}});view.render();
  assert.equal(view.page()[0],125,'Direct page jump must update the full result view.');
  view.unmount();
});

test('all source categories including debt, hybrid and an unclassified choice are filterable', async()=>{
  const view=pageView(true,false,2,125);
  await view.ready();
  const selector=view.all().find(node=>node.type==='select'&&node.props['aria-label']==='Fund category');
  assert.ok(selector);
  assert.equal(selector!.props.disabled,false);
  const values=view.all().filter(node=>node.type==='option').map(node=>node.props.value);
  assert.ok(values.includes('all'));
  assert.ok(values.includes('equity scheme - small cap fund'));
  assert.ok(values.includes('debt scheme - liquid fund'));
  assert.ok(values.includes('hybrid scheme - aggressive hybrid fund'));
  assert.ok(values.includes('unclassified'));
  view.click('Last page');
  view.select('Fund category','debt scheme - liquid fund');
  assert.equal(view.page().length,20);
  assert.ok(view.page().every(code=>code%3===1 && code<124));
  view.select('Fund category','unclassified');
  assert.deepEqual(view.page(),[125,124]);
  view.select('Fund category','all');
  assert.equal(view.page().length,20);
  assert.equal(view.page()[0],125);
  view.unmount();
});

test('unavailable category archive keeps catalogue browsable but does not guess categories', async()=>{
  const view=pageView(true,false,2,75,false);
  await view.ready();
  const selector=view.all().find(node=>node.type==='select'&&node.props['aria-label']==='Fund category');
  assert.ok(selector);
  assert.equal(selector!.props.disabled,true);
  assert.equal(view.page().length,20);
  view.unmount();
});

test('without a verified current directory the explorer does not show unverified starter examples', async()=>{
  const view=pageView(true,false,2,75,false,false);
  await view.ready();
  assert.match(JSON.stringify(view.all().map(n=>n.props.children)),/current directory unavailable/i);
  assert.doesNotMatch(JSON.stringify(view.all().map(n=>n.props.children)),/showing starter examples/i);
  view.unmount();
});
