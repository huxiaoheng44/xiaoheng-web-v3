import { useEffect, useState, type Dispatch } from 'react';
import { folders, labels, fileLabels, type DesktopAction, type FolderId, type Language, type WindowState, type WindowId, type ProjectId } from './model';
import { CrtAgentOverlay } from './CrtAgentOverlay';
import { AboutContent, ExperienceContent, ContactContent } from './content/AboutContent';
import { ProjectsContent } from './content/ProjectsContent';
import { ReadmeContent } from './content/ReadmeContent';
import { projects } from './content/projects';
import { DesktopProvider, useDesktop, useSemanticTarget } from './features/crt-agent/DesktopContext';
import { AgentProvider } from './features/crt-agent/CrtAgentContext';
import { CrtAgentTerminal } from './features/crt-agent/CrtAgentTerminal';
import { useScreenFocus } from './useScreenFocus';

const WALLPAPERS=[1,2,3,4,5,6].map(n=>`/assets/wallpapers/${n}.webp`);
const WALLPAPER_KEY='xiaohengos.wallpaper';
function useWallpaper(){
 const [index,setIndex]=useState(()=>{try{const saved=Number(localStorage.getItem(WALLPAPER_KEY));return Number.isInteger(saved)&&saved>=0&&saved<WALLPAPERS.length?saved:0;}catch{return 0;}});
 useEffect(()=>{try{localStorage.setItem(WALLPAPER_KEY,String(index));}catch{/* storage unavailable */}},[index]);
 const next=()=>setIndex(current=>(current+1)%WALLPAPERS.length);
 return {index,src:WALLPAPERS[index],next};
}
function DesktopIcon({id}:{id:FolderId}){return <img aria-hidden="true" className="desktop-icon" src={`/assets/desktop-icons/${id}.png`} alt="" width={36} height={36}/>;}
function titleFor(id:WindowId,language:Language){if(id.startsWith('project:')){const project=projects.find(p=>p.id===id.slice(8));return (language==='zh'?project?.zh:project?.title)||id;}return fileLabels[id as FolderId][language];}
function RegisteredFolder({id,language,active,dispatch}:{id:FolderId;language:Language;active?:WindowId;dispatch:Dispatch<DesktopAction>}){
 const target=useSemanticTarget({id:`folder:${id}`,names:labels[id],scope:{},capabilities:['highlight','guideTo'],completion:id==='projects'?{window:'projects',panel:'collection'}:{window:id,panel:''}});
 return <button ref={target} data-guide={id} data-agent-id={`folder:${id}`} className={`folder ${active===id?'selected':''}`} onClick={()=>dispatch({type:'open',id})}><DesktopIcon id={id}/><span>{fileLabels[id][language]}</span></button>;
}
function RegisteredExperience({language}:{language:Language}){
 const target=useSemanticTarget({id:'experience:timeline',names:{en:'Work experience',zh:'工作经历'},scope:{window:'experience'},capabilities:['highlight','guideTo']});
 return <div ref={target} className="standalone-experience" data-agent-id="experience:timeline"><h1>{language==='en'?'Experience':'工作经历'}</h1><ExperienceContent language={language}/></div>;
}
export function DesktopFolders({language,active,dispatch}:{language:Language;active?:WindowId;dispatch:Dispatch<DesktopAction>}){
 return <nav className="desktop-folders" aria-label={language==='en'?'Desktop folders':'桌面文件夹'}>{folders.map(id=><RegisteredFolder key={id} id={id} language={language} active={active} dispatch={dispatch}/>)}</nav>;
}
export function DesktopWindow({window:win,language,dispatch,index,active}:{window:WindowState;language:Language;dispatch:Dispatch<DesktopAction>;index:number;active:boolean}){
 const desktop=useDesktop();const title=titleFor(win.id,language);const projectId=win.id.startsWith('project:')?win.id.slice(8):undefined;
 return <section hidden={win.minimized} data-window-id={win.id} role="region" aria-label={title} className={`desktop-window ${win.maximized?'maximized':''} ${active?'active':''}`} style={{zIndex:index+1,'--offset':`${(index%4)*10}px`} as React.CSSProperties} onPointerDown={()=>{if(!active)dispatch({type:'open',id:win.id});}} onFocusCapture={()=>{if(!active)dispatch({type:'open',id:win.id});}}>
  <header className="window-title"><span aria-hidden="true">▣</span><span>/{title}</span><div className="window-controls">{(['minimize','maximize','close'] as const).map((action,i)=><button key={action} data-guide="control" aria-label={language==='en'?`${action} ${title}`:`${['最小化','最大化','关闭'][i]}${title}`} onClick={()=>dispatch({type:action,id:win.id})}>{['−',win.maximized?'▣':'□','×'][i]}</button>)}</div></header>
  <div className="window-toolbar"><span>{language==='en'?'Directory':'目录'} / {title}</span><span>{projectId?'PROJECT':win.id==='projects'?`${String(projects.length).padStart(2,'0')} PROJECTS`:win.id==='experience'?'04 ROLES':win.id==='about'?'PROFILE':win.id==='doom'?'SHAREWARE · 1993':'CONNECT'}</span></div>
  <div className="content-scroll" tabIndex={0} aria-label={language==='en'?`${title} content`:`${title}内容`}>
   {win.id==='about'&&<><ReadmeContent language={language}/><AboutContent language={language}/></>}
   {(win.id==='projects'||projectId)&&<ProjectsContent language={language} visible={!win.minimized&&active} projectId={projectId} onSelect={id=>desktop.navigate(id?`project:${id as ProjectId}`:'projects')}/>}
   {win.id==='experience'&&<RegisteredExperience language={language}/>}
   {win.id==='contact'&&<ContactContent language={language}/>}
   {win.id==='doom'&&<iframe className="doom-frame" src="/apps/doom/index.html" title="DOOM" sandbox="allow-scripts" allow="autoplay"/>}
  </div><footer className="window-footer"><span>{win.id==='doom'?(language==='en'?'Click the game first · Arrows move · Ctrl fire · Space open · Esc menu':'先点一下画面 · 方向键移动 · Ctrl 开火 · 空格开门 · Esc 菜单'):(language==='en'?'Scroll to explore · Made with curiosity.':'滚动查看更多 · 保持好奇。')}</span><span>↕</span></footer>
 </section>;
}
export function CrtMonitor({language,setLanguage,active:on, onEnter,onShutdown}:{language:Language;setLanguage:(value:Language)=>void;active:boolean;onEnter:()=>void;onShutdown:()=>void}){
 const {state,active,dispatch,reset}=useDesktop();const [now,setNow]=useState(new Date());const wallpaper=useWallpaper();
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer);},[]);
 return <div className="monitor-screen" data-booting={!on}><div className="os-shell" inert={!on}>
  <header className="os-header"><span className="os-brand"><b>▣</b> xiaohengOS <small>v1.0</small></span><span><button className="language-toggle" data-guide="language" aria-label={language==='en'?'Switch to Chinese':'切换为英文'} onClick={()=>setLanguage(language==='en'?'zh':'en')}>{language==='en'?'EN / 中':'中 / EN'}</button><button className="power-control" aria-label={language==='en'?'Shut down xiaohengOS':'关闭 xiaohengOS'} onClick={()=>{reset();onShutdown();}}>⏻</button></span></header>
  <div className="desktop-area"><div className="wallpaper has-image" aria-hidden="true"><img key={wallpaper.src} className="wallpaper-image" src={wallpaper.src} alt=""/></div><button className="wallpaper-next" data-guide="wallpaper" data-hint={language==='en'?'Next wallpaper':'切换壁纸'} aria-label={language==='en'?'Next wallpaper':'切换壁纸'} onClick={wallpaper.next}><svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" shapeRendering="crispEdges"><path d="M2 8h9V3h2v2h2v2h2v2h2v4h-2v2h-2v2h-2v2h-2v-5H2z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button><DesktopFolders language={language} active={active} dispatch={dispatch}/><div className="window-layer">{state.windows.map((win,index)=><DesktopWindow key={win.id} window={win} index={index} active={active===win.id} language={language} dispatch={dispatch}/>)}</div></div>
  <div className="task-tray"><button className="show-desktop" disabled={!state.windows.length} aria-label={language==='en'?'Show desktop':'显示桌面'} onClick={()=>dispatch({type:'showDesktop'})}>▤ {active?(language==='en'?'Desktop':'桌面'):(state.windows.length?(language==='en'?'Restore':'恢复'):(language==='en'?'Desktop':'桌面'))}</button>{state.windows.map(w=><button key={w.id} aria-label={`Restore ${titleFor(w.id,language)}`} aria-pressed={active===w.id} onClick={()=>dispatch({type:'open',id:w.id})}>▣ {titleFor(w.id,language)}</button>)}</div>
  <CrtAgentTerminal language={language} now={now}/>
 </div>{!on&&<div className="boot-overlay" role="dialog" aria-label={language==='en'?'Start CRT.AGENT':'启动 CRT.AGENT'}><div className="boot-center"><div className="startup-agent" aria-hidden="true"><span className="crt-agent-sprite"/></div><button className="boot-skip" aria-label={language==='en'?'Power on':'开机'} title={language==='en'?'Power on':'开机'} onClick={onEnter}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/><path d="M7.2 6.4a7.5 7.5 0 1 0 9.6 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/></svg></button></div><small className="boot-copyright">© 2026 {language==='en'?'Xiaoheng Hu':'胡晓亨'}</small></div>}</div>;
}
export function PortfolioScene(){
 const [language,setLanguage]=useState<Language>('en');const [started,setStarted]=useState(false);const {stageRef,focused}=useScreenFocus(started);
 useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';},[language]);
 return <DesktopProvider language={language}><AgentProvider language={language}><main className={`portfolio-scene ${focused?'screen-focused':''}`}><header className="page-header"><span>XH<span className="tiny-square">■</span></span><span>PERSONAL SPACE / 001</span></header><div className="stage" ref={stageRef}><div className="desk-surface"/><img className="desk-object desk-prop desk-art" src="/assets/desk/desk.png" alt=""/><img className="desk-object desk-prop tray-prop" src="/assets/desk/paper-tray.png" alt=""/><img className="desk-object desk-prop sheet-prop" src="/assets/desk/paper-sheet.png" alt=""/><img className="desk-object desk-prop stack-prop" src="/assets/desk/paper-stack.png" alt=""/><img className="desk-object desk-prop binders-prop" src="/assets/desk/binders.png" alt=""/><img className="desk-object desk-prop folder-prop" src="/assets/desk/file-folder.png" alt=""/><img className="desk-object desk-prop envelope-prop" src="/assets/desk/document-envelope.png" alt=""/><div className="monitor-object"><img className="monitor-art" src="/assets/monitor-v2.png" alt=""/><CrtMonitor language={language} setLanguage={setLanguage} active={started} onEnter={()=>setStarted(true)} onShutdown={()=>setStarted(false)}/></div><img className="desk-object keyboard-object" src="/assets/keyboard.png" alt=""/><img className="desk-object mouse-object" src="/assets/mouse-v2.png" alt=""/><img className="desk-object mug-object" src="/assets/mug.png" alt=""/></div><div className="scene-caption"><span>BUILT WITH CURIOSITY.</span><span>{language==='en'?'TAKE YOUR TIME. LOOK AROUND.':'慢慢看，随意逛。'}</span></div>{started&&<CrtAgentOverlay language={language} launchFromCenter/>}</main></AgentProvider></DesktopProvider>;
}
