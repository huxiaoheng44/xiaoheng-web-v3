import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { desktopReducer, type DesktopAction, type Language, type WindowState, type WindowId } from '../../model';
import type { PageContext } from './MontyChat';
import { TargetRegistry, hasUsableVisibleArea, type TargetDefinition } from './TargetRegistry';

type DesktopState={windows:WindowState[];profileSection:string};
export function visibleTarget(e:HTMLElement) {
  if(e.closest('[hidden]')||!e.getClientRects().length)return false;
  const win=e.closest<HTMLElement>('.desktop-window');
  if(win&&!win.classList.contains('active'))return false;
  const r=e.getBoundingClientRect(); const scroll=e.closest('.content-scroll')?.getBoundingClientRect();
  return hasUsableVisibleArea(r,{top:Math.max(0,scroll?.top??0),bottom:Math.min(innerHeight,scroll?.bottom??innerHeight),left:Math.max(0,scroll?.left??0),right:Math.min(innerWidth,scroll?.right??innerWidth)});
}
function createDesktop(language:Language) {
  const [state,setState]=useState<DesktopState>({windows:[],profileSection:'profile'});
  const ref=useRef(state); const version=useRef(0);
  const targetRegistry=useRef(new TargetRegistry(visibleTarget)).current;
  // Existing mounted targets also become ready when a window is minimized,
  // restored or focused; registration alone cannot announce these transitions.
  useEffect(()=>{targetRegistry.contextChanged();},[state,targetRegistry]);
  useEffect(()=>{version.current++;},[language]);
  useEffect(()=>{const resize=()=>{version.current++;};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const active=state.windows.filter(w=>!w.minimized).at(-1)?.id;
  const commit=(next:DesktopState)=>{ref.current=next;version.current++;setState(next);};
  const dispatch=(action:DesktopAction)=>commit({...ref.current,windows:desktopReducer(ref.current.windows,action)});
  const reset=()=>commit({windows:[],profileSection:'profile'});
  const navigate=(id:WindowId)=>{
    const activeWindow=ref.current.windows.filter(window=>!window.minimized).at(-1);
    const existing=ref.current.windows.find(window=>window.id===id);
    const maximized=activeWindow?.maximized??existing?.maximized??false;
    commit({...ref.current,windows:[...ref.current.windows.filter(window=>window.id!==id),{id,minimized:false,maximized}]});
  };
  const selectProfileSection=(tab:string)=>commit({...ref.current,profileSection:tab,windows:desktopReducer(ref.current.windows,{type:'open',id:'profile'})});
  const snapshot=():PageContext=>{const activeWindow=ref.current.windows.filter(w=>!w.minimized).at(-1)?.id??null;const activePanel=activeWindow==='profile'?ref.current.profileSection:activeWindow==='projects'?'collection':activeWindow?.startsWith('project:')?'detail':'';return {language,contextVersion:version.current,activeWindow,activePanel,windows:ref.current.windows.map(w=>w.id),profileSection:ref.current.profileSection,targets:targetRegistry.snapshot({activeWindow,activePanel})};};
  return {state,active,dispatch,reset,navigate,selectProfileSection,snapshot,version,targetRegistry,
    touch:()=>{version.current++;},
    open:(id:WindowId)=>dispatch({type:'open',id}),
  };
}
const Context=createContext<ReturnType<typeof createDesktop>|null>(null);
export function DesktopProvider({language,children}:{language:Language;children:ReactNode}){const value=createDesktop(language);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useDesktop(){const ctx=useContext(Context);if(!ctx)throw new Error('Missing DesktopProvider');return ctx;}
export function useSemanticTarget(definition:TargetDefinition):RefObject<any> {
  const desktop=useDesktop();const element=useRef<HTMLElement|null>(null);
  useEffect(()=>{if(!element.current)return;return desktop.targetRegistry.register(definition,element.current);},[desktop.targetRegistry,definition.id,definition.names.en,definition.names.zh,definition.scope.window,definition.scope.panel,definition.capabilities.join('|'),definition.projectId,definition.tag,definition.parentId,JSON.stringify(definition.completion)]);
  return element;
}
