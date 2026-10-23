import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Exercise real notification rendering; replace only React's hook/mount boundary.
function notification() {
  const source=readFileSync(new URL('../src/components/StatusToast.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  let retained:unknown='', initialized=false, dependency:unknown, pending:(()=>void)[]=[];
  let dismissed=0;
  const jsx=(type:unknown,props:any)=>({type,props});
  const imports:Record<string,unknown>={
    react:{useState(initial:unknown){if(!initialized){retained=initial;initialized=true;}return [retained,(value:unknown)=>{retained=value;}];},useEffect(run:()=>void,deps:unknown[]){if(!Object.is(dependency,deps[0])){dependency=deps[0];pending.push(run);}}},
    'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':{Check:'check-icon',X:'close-icon'},
  };
  const exports:any={};
  new Function('require','exports',compiled)((name:string)=>{assert.ok(name in imports,name);return imports[name];},exports);
  return {
    render(message:string){const tree=exports.StatusToast({message,onDismiss:()=>{dismissed++;}});const work=pending;pending=[];work.forEach(run=>run());return tree;},
    get dismissed(){return dismissed;},
  };
}
const message=(node:any)=>node.props.children.find((child:any)=>child?.type==='span').props.children;

test('dismissed notification keeps outgoing text while becoming hidden and inert immediately',()=>{
  const view=notification();
  const empty=view.render('');
  assert.equal(empty.props['aria-hidden'],true);
  assert.equal(empty.props.inert,true);
  const shown=view.render('Fund saved.');
  assert.equal(message(shown),'Fund saved.');
  assert.equal(shown.props['aria-hidden'],false);
  assert.equal(shown.props.inert,false);
  shown.props.children.find((child:any)=>child?.type==='button').props.onClick();
  assert.equal(view.dismissed,1);
  const closing=view.render('');
  assert.equal(message(closing),'Fund saved.');
  assert.equal(closing.props['aria-hidden'],true);
  assert.equal(closing.props.inert,true);
  assert.notEqual(closing.props.className,shown.props.className);
});

test('a new notification replaces an outgoing message without waiting for an animation',()=>{
  const view=notification();
  view.render('First fund saved.');
  view.render('');
  const next=view.render('Second fund added to comparison.');
  assert.equal(message(next),'Second fund added to comparison.');
  assert.equal(next.props['aria-hidden'],false);
  assert.equal(next.props.inert,false);
  assert.equal(message(view.render('')),'Second fund added to comparison.');
});
