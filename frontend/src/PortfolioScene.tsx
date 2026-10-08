import { useEffect, useRef, useState, type Dispatch } from 'react';
import { folders, labels, fileLabels, type DesktopAction, type FolderId, type Language, type WindowState, type WindowId, type ProjectId } from './model';
import { MontyOverlay } from './MontyOverlay';
import { ProfileContent, ContactContent } from './content/ProfileContent';
import { ProjectsContent } from './content/ProjectsContent';
import { ReadmeContent } from './content/ReadmeContent';
import { projects } from './content/projects';
import { DesktopProvider, useDesktop, useSemanticTarget } from './features/monty/DesktopContext';
import { AgentProvider } from './features/monty/MontyContext';
import { MontyHistory, MontyUsage } from './features/monty/MontyHistory';
import { MontyTerminal } from './features/monty/MontyTerminal';
import { useScreenFocus } from './useScreenFocus';
import { PowerScreen, standbyMontyRect, usePowerSequence, type PowerPhase, type PowerStep } from './PowerSequence';

const WALLPAPERS=[1,2,3,4,5,6].map(n=>`/assets/wallpapers/${n}.webp`);
function useWallpaper(){
 const [index,setIndex]=useState(0);
 const next=()=>setIndex(current=>(current+1)%WALLPAPERS.length);
 return {index,src:WALLPAPERS[index],next};
}
const LAMP_KEY='xiaohengos.lamp';
function useLamp(){
 const [on,setOn]=useState(()=>{try{return localStorage.getItem(LAMP_KEY)!=='off';}catch{return true;}});
 useEffect(()=>{try{localStorage.setItem(LAMP_KEY,on?'on':'off');}catch{/* storage unavailable */}},[on]);
 return {on,toggle:()=>setOn(value=>!value)};
}
type MonitorPower='initial'|'on'|'off';
function useMonitorPower(){
 const [power,setPower]=useState<MonitorPower>('initial');
 return {power,on:power!=='off',toggle:()=>setPower(value=>value==='off'?'on':'off')};
}
function DesktopIcon({id}:{id:FolderId}){return <img aria-hidden="true" className="desktop-icon" src={`/assets/desktop-icons/${id}.png`} alt="" width={36} height={36}/>;}
function titleFor(id:WindowId,language:Language){if(id==='monty-history')return language==='zh'?'Monty 聊天记录':'Monty Chat History';if(id.startsWith('project:')){const project=projects.find(p=>p.id===id.slice(8));return (language==='zh'?project?.zh:project?.title)||id;}return fileLabels[id as FolderId][language];}
function RegisteredFolder({id,language,active,dispatch}:{id:FolderId;language:Language;active?:WindowId;dispatch:Dispatch<DesktopAction>}){
 const target=useSemanticTarget({id:`folder:${id}`,parentId:'desktop',names:labels[id],scope:{},capabilities:['highlight','guideTo'],completion:id==='projects'?{window:'projects',panel:'collection'}:{window:id,panel:id==='profile'?'profile':''}});
 return <button ref={target} data-guide={id} data-agent-id={`folder:${id}`} className={`folder ${active===id?'selected':''}`} onClick={()=>dispatch({type:'open',id})}><DesktopIcon id={id}/><span>{fileLabels[id][language]}</span></button>;
}
export function DesktopFolders({language,active,dispatch}:{language:Language;active?:WindowId;dispatch:Dispatch<DesktopAction>}){
 return <nav className="desktop-folders" aria-label={language==='en'?'Desktop folders':'桌面文件夹'}>{folders.map(id=><RegisteredFolder key={id} id={id} language={language} active={active} dispatch={dispatch}/>)}</nav>;
}
export function DesktopWindow({window:win,language,dispatch,index,count=index+1,active}:{window:WindowState;language:Language;dispatch:Dispatch<DesktopAction>;index:number;count?:number;active:boolean}){
 const desktop=useDesktop();const title=titleFor(win.id,language);const projectId=win.id.startsWith('project:')?win.id.slice(8):undefined;
 const minimizeTarget=useSemanticTarget({id:`window:minimize:${win.id}`,names:{en:`Minimize ${titleFor(win.id,'en')}`,zh:`最小化${titleFor(win.id,'zh')}`},scope:{window:win.id},capabilities:['highlight','guideTo'],completion:{minimizedWindow:win.id}});
 return <section data-agent-ui={win.id==='monty-history'?true:undefined} hidden={win.minimized} data-window-id={win.id} role="region" aria-label={title} className={`desktop-window ${win.maximized?'maximized':''} ${active?'active':''}`} style={{zIndex:index+1,'--offset':`${(index%4)*10}px`,'--close-order':count-1-index} as React.CSSProperties} onPointerDown={()=>{if(!active)dispatch({type:'open',id:win.id});}} onFocusCapture={()=>{if(!active)dispatch({type:'open',id:win.id});}}>
  <header className="window-title"><span aria-hidden="true">▣</span><span>/{title}</span><div className="window-controls">{(['minimize','maximize','close'] as const).map((action,i)=><button ref={action==='minimize'?minimizeTarget:undefined} data-agent-id={action==='minimize'?`window:minimize:${win.id}`:undefined} key={action} data-guide="control" aria-label={language==='en'?`${action} ${title}`:`${['最小化','最大化','关闭'][i]}${title}`} onClick={()=>dispatch({type:action,id:win.id})}>{['−',win.maximized?'▣':'□','×'][i]}</button>)}</div></header>
  <div className="window-toolbar"><span>{win.id==='monty-history'?(language==='zh'?'本次会话':'THIS SESSION'):(language==='en'?'Directory':'目录')} / {title}</span><span>{win.id==='monty-history'?'MONTY.LOG':projectId?'PROJECT':win.id==='projects'?`${String(projects.length).padStart(2,'0')} PROJECTS`:win.id==='profile'?'PROFILE':win.id==='readme'?'TEXT FILE':win.id==='doom'?'SHAREWARE · 1993':'CONNECT'}</span></div>
  <div className="content-scroll" tabIndex={0} aria-label={language==='en'?`${title} content`:`${title}内容`}>
   {win.id==='readme'&&<ReadmeContent language={language}/>}
   {(win.id==='projects'||projectId)&&<ProjectsContent language={language} visible={!win.minimized&&active} projectId={projectId} onSelect={id=>desktop.navigate(id?`project:${id as ProjectId}`:'projects')}/>}
   {win.id==='profile'&&<ProfileContent language={language}/>}
   {win.id==='monty-history'&&<MontyHistory language={language} visible={active&&!win.minimized}/>}
   {win.id==='contact'&&<ContactContent language={language}/>}
   {win.id==='doom'&&<iframe className="doom-frame" src="/apps/doom/index.html" title="DOOM" sandbox="allow-scripts" allow="autoplay"/>}
  </div>{win.id==='monty-history'&&<MontyUsage language={language}/>} {win.id==='doom'&&<footer className="window-footer"><span>{language==='en'?'Click the game first · Arrows move · Ctrl fire · Space open · Esc menu':'先点一下画面 · 方向键移动 · Ctrl 开火 · 空格开门 · Esc 菜单'}</span></footer>}
 </section>;
}
function ShowDesktopButton({language,state,dispatch}:{language:Language;state:{windows:WindowState[]};dispatch:Dispatch<DesktopAction>}){
 const target=useSemanticTarget({id:'desktop:show',names:{en:'Show desktop',zh:'显示桌面'},scope:{},capabilities:['highlight','guideTo']});
 const allHidden=state.windows.length>0&&state.windows.every(w=>w.minimized);
 const hint=language==='en'?(allHidden?'Restore windows':'Show desktop'):(allHidden?'恢复窗口':'显示桌面');
 return <button ref={target} data-agent-id="desktop:show" className="show-desktop" data-hint={hint} title={hint} aria-label={language==='en'?'Show desktop':'显示桌面'} aria-pressed={allHidden} disabled={!state.windows.length} onClick={()=>dispatch({type:'showDesktop'})}><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" shapeRendering="crispEdges"><rect x="1.5" y="2.5" width="11" height="9" fill="none" stroke="currentColor"/><path d="M2 9.5h10M2 10.5h10" stroke="currentColor"/><path d="M4 5.5h3" stroke="currentColor"/></svg></button>;
}
type PowerProps={phase:PowerPhase;step:PowerStep;quick:boolean;powerOn:()=>void;shutDown:()=>void};
export function CrtMonitor({language,setLanguage,power,powered=true}:{language:Language;setLanguage:(value:Language)=>void;power:PowerProps;powered?:boolean}){
 const {state,active,dispatch,reset}=useDesktop();const [now,setNow]=useState(new Date());const wallpaper=useWallpaper();
 const on=power.phase==='on';const previous=useRef(power.phase);
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer);},[]);
 // Windows stay up during the shutdown so they can close on screen; the desktop is cleared once it is over.
 useEffect(()=>{if(previous.current==='shutting'&&power.phase==='off')reset();previous.current=power.phase;},[power.phase,reset]);
 const covered=power.phase==='off'||(power.phase==='booting'&&power.step!=='reveal');
 return <div className="monitor-screen" data-booting={covered} data-power={power.phase} inert={!powered}><div className="os-shell" inert={!on}>
  <header className="os-header"><span className="os-brand"><b>▣</b> xiaohengOS <small>v1.0</small></span><span><button className="language-toggle" data-guide="language" aria-label={language==='en'?'Switch to Chinese':'切换为英文'} onClick={()=>setLanguage(language==='en'?'zh':'en')}><span className={language==='en'?'is-active':''}>EN</span><span className="language-sep" aria-hidden="true">/</span><span className={language==='zh'?'is-active':''}>中</span></button><button className="power-control" aria-label={language==='en'?'Shut down xiaohengOS':'关闭 xiaohengOS'} onClick={power.shutDown}>⏻</button></span></header>
  <div className="desktop-area"><div className="wallpaper has-image" aria-hidden="true"><img key={wallpaper.src} className="wallpaper-image" src={wallpaper.src} alt=""/></div><button className="wallpaper-next" data-guide="wallpaper" data-hint={language==='en'?'Next wallpaper':'切换壁纸'} aria-label={language==='en'?'Next wallpaper':'切换壁纸'} onClick={wallpaper.next}><svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" shapeRendering="crispEdges"><path d="M2 8h9V3h2v2h2v2h2v2h2v4h-2v2h-2v2h-2v2h-2v-5H2z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button><DesktopFolders language={language} active={active} dispatch={dispatch}/><div className="window-layer">{state.windows.map((win,index)=><DesktopWindow key={win.id} window={win} index={index} count={state.windows.length} active={active===win.id} language={language} dispatch={dispatch}/>)}</div></div>
  <div className="task-tray">{state.windows.map(w=><button key={w.id} aria-label={`Restore ${titleFor(w.id,language)}`} aria-pressed={active===w.id} onClick={()=>dispatch({type:'open',id:w.id})}>▣ {titleFor(w.id,language)}</button>)}</div>
  <MontyTerminal active={on&&powered} language={language} now={now} trailing={<ShowDesktopButton language={language} state={state} dispatch={dispatch}/>}/>
 </div><PowerScreen phase={power.phase} step={power.step} quick={power.quick} language={language} onPowerOn={power.powerOn}/></div>;
}
export function PortfolioScene(){
 const [language,setLanguage]=useState<Language>('en');const power=usePowerSequence();const started=power.phase!=='off';const lamp=useLamp();const monitor=useMonitorPower();const {stageRef,focused}=useScreenFocus(started);
 useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';},[language]);
 const en=language==='en';
 // The desk Monty exists from the boot wipe until it is back on the standby screen at shutdown.
 const montyOut=power.phase==='on'||(power.phase==='booting'&&power.step==='reveal')||(power.phase==='shutting'&&power.step!=='sleep');
 const lampLabel=en?(lamp.on?'Turn the desk lamp off':'Turn the desk lamp on'):(lamp.on?'关台灯':'开台灯');
 const monitorLabel=en?(monitor.on?'Turn the monitor off':'Turn the monitor on'):(monitor.on?'关闭显示器':'打开显示器');
 return <DesktopProvider language={language}><AgentProvider language={language}><main className={`portfolio-scene ${focused?'screen-focused':''} ${lamp.on?'':'lamp-off'} ${monitor.on?'':'monitor-off'}`} onDragStart={event=>event.preventDefault()}><div className="stage" ref={stageRef}>
  <div className="desk-surface"/><img className="desk-object desk-prop desk-art" src="/assets/desk/desk.png" alt=""/>
  <img className="desk-object desk-prop binders-prop" src="/assets/desk/binders.png" alt=""/><img className="desk-object desk-prop tray-prop" src="/assets/desk/paper-tray.png" alt=""/><img className="desk-object desk-prop sheet-prop" src="/assets/desk/paper-sheet.png" alt=""/><img className="desk-object desk-prop stack-prop" src="/assets/desk/paper-stack.png" alt=""/>
  <button className="desk-prop lamp-object" aria-pressed={lamp.on} aria-label={lampLabel} title={lampLabel} onClick={lamp.toggle}><img className="lamp-sprite" src="/assets/desk/desk-lamp.png" alt=""/><img className="lamp-bulb-glow" src="/assets/desk/desk-lamp.png" alt="" aria-hidden="true"/><span className="lamp-light" aria-hidden="true"><i/><i/><i/><i/><i/><i/></span></button>
  <img className="desk-object desk-prop folder-prop" src="/assets/desk/file-folder.png" alt=""/><img className="desk-object desk-prop envelope-prop" src="/assets/desk/document-envelope.png" alt=""/>
  <div className={`monitor-object power-${monitor.power} ${started?'is-on':''}`}><img className="monitor-art" src="/assets/monitor-v2.png" alt=""/><button className="monitor-power" aria-pressed={monitor.on} aria-label={monitorLabel} title={monitorLabel} onClick={monitor.toggle}><span className="power-led"/></button><CrtMonitor language={language} setLanguage={setLanguage} power={power} powered={monitor.on}/></div>
  <div className="screen-spill" aria-hidden="true"/>
  <img className="desk-object keyboard-object" src="/assets/keyboard.png" alt=""/><img className="desk-object mouse-object" src="/assets/mouse-v2.png" alt=""/><img className="desk-object mug-object" src="/assets/mug.png" alt=""/>
 </div>{montyOut&&<MontyOverlay language={language} launchFrom={standbyMontyRect} parkAt={power.phase==='shutting'?standbyMontyRect:undefined}/>}</main></AgentProvider></DesktopProvider>;
}
