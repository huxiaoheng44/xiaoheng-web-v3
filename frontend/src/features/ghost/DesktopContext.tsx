import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { desktopReducer, type DesktopAction, type Language, type WindowState, type WindowId } from '../../model';
import type { PageContext } from './GhostChat';

type DesktopState={windows:WindowState[];aboutTab:string};
export function findTarget(id:string) { return [...document.querySelectorAll<HTMLElement>('[data-agent-id]')].find(e=>e.dataset.agentId===id); }
export function visibleTarget(e:HTMLElement) {
  if(e.closest('[hidden]')||!e.getClientRects().length)return false;
  const win=e.closest<HTMLElement>('.desktop-window');
  if(win&&!win.classList.contains('active'))return false;
  const r=e.getBoundingClientRect(); const scroll=e.closest('.content-scroll')?.getBoundingClientRect();
  return r.bottom>Math.max(0,scroll?.top??0)&&r.top<Math.min(innerHeight,scroll?.bottom??innerHeight)&&r.right>0&&r.left<innerWidth;
}
function createDesktop(language:Language) {
  const [state,setState]=useState<DesktopState>({windows:[],aboutTab:'profile'});
  const ref=useRef(state); const version=useRef(0); const undoRef=useRef<{state:DesktopState;version:number;scrolls:[HTMLElement,number][]}|null>(null);
  useEffect(()=>{version.current++;undoRef.current=null;},[language]);
  useEffect(()=>{const resize=()=>{version.current++;undoRef.current=null;};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const active=state.windows.filter(w=>!w.minimized).at(-1)?.id;
  const commit=(next:DesktopState,agent=false)=>{if(!agent)undoRef.current=null;ref.current=next;version.current++;setState(next);if(agent&&undoRef.current)undoRef.current.version=version.current;};
  const dispatch=(action:DesktopAction,agent=false)=>commit({...ref.current,windows:desktopReducer(ref.current.windows,action)},agent);
  const selectTab=(tab:string,agent=false)=>commit({...ref.current,aboutTab:tab,windows:desktopReducer(ref.current.windows,{type:'open',id:'about'})},agent);
  const snapshot=():PageContext=>({language,contextVersion:version.current,activeWindow:ref.current.windows.filter(w=>!w.minimized).at(-1)?.id??null,windows:ref.current.windows.map(w=>w.id),aboutTab:ref.current.aboutTab,targets:[...document.querySelectorAll<HTMLElement>('[data-agent-id]')].filter(e=>!e.closest('[hidden]')).slice(0,100).map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.agentId!,label:(e.dataset.agentLabel||e.getAttribute('aria-label')||e.textContent||'').slice(0,180),visible:visibleTarget(e),rect:[r.x,r.y,r.width,r.height],excerpt:(e.dataset.agentExcerpt||(e.matches('h2')?e.nextElementSibling?.textContent:'')||'').slice(0,500)};})});
  return {state,active,dispatch,selectTab,snapshot,version,
    beginNavigation:(reset=false)=>{if(reset||!undoRef.current)undoRef.current={state:structuredClone(ref.current),version:version.current,scrolls:[...document.querySelectorAll<HTMLElement>('.content-scroll')].map(e=>[e,e.scrollTop])};},
    touch:(agent=false)=>{version.current++;if(agent&&undoRef.current)undoRef.current.version=version.current;else if(!agent)undoRef.current=null;},
    undo:()=>{const undo=undoRef.current;if(!undo||undo.version!==version.current)return false;commit(undo.state);requestAnimationFrame(()=>undo.scrolls.forEach(([e,top])=>{if(e.isConnected)e.scrollTop=top;}));return true;},
    open:(id:WindowId,agent=false)=>dispatch({type:'open',id},agent),
  };
}
const Context=createContext<ReturnType<typeof createDesktop>|null>(null);
export function DesktopProvider({language,children}:{language:Language;children:ReactNode}){const value=createDesktop(language);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useDesktop(){const ctx=useContext(Context);if(!ctx)throw new Error('Missing DesktopProvider');return ctx;}
