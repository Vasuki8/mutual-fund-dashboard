import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import ts from 'typescript';

// Run the component's lifecycle and event handlers; native focus trapping is checked in-browser.
function preview(openerConnected=true,overrides:Record<string,unknown>={}){
  const compiled=ts.transpileModule(readFileSync(new URL('../src/components/FundPreview.tsx',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  let dismissed=0,opened=0,closed=0,closeFocused=0,openerFocused=0,fallbackFocused=0;let openedAfterClose=false;
  let cleanup:undefined|(()=>void);let effect:()=>()=>void;let index=0;const nativeEvents:(()=>void)[]=[];
  class FakeElement {isConnected=openerConnected;focus(){openerFocused++;}}
  const opener=new FakeElement(),root={style:{overflow:'auto'}};
  const native={showModal(){opened++;},close(){closed++;nativeEvents.push(()=>tree.props.onClose?.());},getBoundingClientRect:()=>({left:100,top:100,right:600,bottom:700})};
  const refs=[{current:native},{current:{focus(){closeFocused++;}}},{current:false},{current:false}];
  const jsx=(type:unknown,props:any)=>({type,props});
  const imports:any={react:{Fragment:'fragment',useRef(){return refs[index++];},useEffect(run:()=>()=>void){effect=run;}},'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':{},'../lib/analytics.ts':{selectPeriod:()=>[]},'../lib/format.ts':{shortName:(s:string)=>s,planLabel:()=>''},'./Chart.tsx':{}};
  const exports:any={};new Function('require','exports',compiled)((name:string)=>{assert.ok(name in imports,name);return imports[name];},exports);
  const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const oldElement=Object.getOwnPropertyDescriptor(globalThis,'HTMLElement');
  Object.defineProperty(globalThis,'document',{value:{activeElement:opener,documentElement:root},configurable:true});
  Object.defineProperty(globalThis,'HTMLElement',{value:FakeElement,configurable:true});
  let tree:any;
  try{tree=exports.FundPreview({scheme:{schemeCode:1,schemeName:'Example Direct Growth'},saved:false,compared:false,openFund:()=>{openedAfterClose=closed>0;},onClose:()=>{dismissed++;},fallbackFocusRef:{current:{isConnected:true,focus(){fallbackFocused++;}}},...overrides});cleanup=effect!();}
  finally{
    if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else delete (globalThis as any).document;
    if(oldElement)Object.defineProperty(globalThis,'HTMLElement',oldElement);else delete (globalThis as any).HTMLElement;
  }
  const click=(x:number,y:number)=>{const event={target:native,currentTarget:native,clientX:x,clientY:y};tree.props.onPointerDown(event);tree.props.onClick(event);};
  return{tree,root,click,get openedAfterClose(){return openedAfterClose;},replayEffect(){
    Object.defineProperty(globalThis,'document',{value:{activeElement:opener,documentElement:root},configurable:true});
    Object.defineProperty(globalThis,'HTMLElement',{value:FakeElement,configurable:true});
    try{cleanup?.();cleanup=effect();nativeEvents.splice(0).forEach(run=>run());}
    finally{if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else delete (globalThis as any).document;if(oldElement)Object.defineProperty(globalThis,'HTMLElement',oldElement);else delete (globalThis as any).HTMLElement;}
  },cleanup:()=>cleanup?.(),get dismissed(){return dismissed;},get opened(){return opened;},get closed(){return closed;},get closeFocused(){return closeFocused;},get openerFocused(){return openerFocused;},get fallbackFocused(){return fallbackFocused;}};
}

test('preview opens modally, focuses close, locks scrolling and restores focus/scroll on dismissal',()=>{
  const view=preview();
  assert.equal(view.tree.type,'dialog');assert.equal(view.tree.props['aria-labelledby'],'fund-preview-title');
  assert.equal(view.opened,1);assert.equal(view.closeFocused,1);assert.equal(view.root.style.overflow,'hidden');
  let prevented=false;view.tree.props.onCancel({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(view.dismissed,1);
  view.cleanup();assert.equal(view.closed,1);assert.equal(view.root.style.overflow,'auto');assert.equal(view.openerFocused,1);assert.equal(view.fallbackFocused,0);
});

test('removing the opener returns focus to the page heading',()=>{
  const view=preview(false);view.cleanup();assert.equal(view.openerFocused,0);assert.equal(view.fallbackFocused,1);
});

test('backdrop dismisses only for a press and release outside the dialog',()=>{
  const view=preview();view.click(200,200);assert.equal(view.dismissed,0);
  view.tree.props.onPointerDown({target:1,currentTarget:1,clientX:200,clientY:200});
  view.tree.props.onClick({target:1,currentTarget:1,clientX:20,clientY:20});assert.equal(view.dismissed,0,'Dragging from inside must not dismiss');
  view.click(20,20);assert.equal(view.dismissed,1);view.cleanup();
});


test('StrictMode effect replay does not dismiss the reopened popup from a queued native close event',()=>{
  const view=preview();view.replayEffect();
  assert.equal(view.opened,2);assert.equal(view.closed,1);assert.equal(view.dismissed,0);
  assert.equal(view.root.style.overflow,'hidden');view.cleanup();
  assert.equal(view.root.style.overflow,'auto');
});


test('full analysis closes the native modal before navigation and preserves navigation focus',()=>{
  const view=preview();
  const walk=(node:any):any[]=>!node?[]:Array.isArray(node)?node.flatMap(walk):typeof node==='object'&&node.props?[node,...walk(node.props.children)]:[];
  const open=walk(view.tree).find(node=>node.type==='button'&&Array.isArray(node.props.children)&&node.props.children.includes('Open full analysis '));
  assert.ok(open);open.props.onClick();assert.equal(view.openedAfterClose,true);assert.equal(view.dismissed,1);
  view.cleanup();assert.equal(view.openerFocused,0);assert.equal(view.fallbackFocused,0);assert.equal(view.root.style.overflow,'auto');
});


test('full collections explain blocked additions inside the popup while keeping removal available',()=>{
  const walk=(node:any):any[]=>!node?[]:Array.isArray(node)?node.flatMap(walk):typeof node==='object'&&node.props?[node,...walk(node.props.children)]:[];
  const full=preview(true,{watchlistFull:true,comparisonFull:true});
  const nodes=walk(full.tree);
  const save=nodes.find(node=>node.type==='button'&&Array.isArray(node.props.children)&&node.props.children.includes('Save'));
  const compare=nodes.find(node=>node.type==='button'&&Array.isArray(node.props.children)&&node.props.children.includes('Compare'));
  assert.equal(save.props.disabled,true);assert.equal(compare.props.disabled,true);
  assert.ok(nodes.some(node=>node.props.id===save.props['aria-describedby']&&node.props.children.includes('100 funds')));
  assert.ok(nodes.some(node=>node.props.id===compare.props['aria-describedby']&&node.props.children.includes('4 funds')));
  full.cleanup();
  const removable=preview(true,{watchlistFull:true,comparisonFull:true,saved:true,compared:true});
  const actions=walk(removable.tree).filter(node=>node.type==='button'&&node.props['aria-pressed']===true);
  assert.equal(actions.length,2);assert.ok(actions.every(node=>node.props.disabled===false));removable.cleanup();
});
