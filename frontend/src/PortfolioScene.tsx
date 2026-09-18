import { useEffect, useState, type Dispatch } from 'react';
import { folders, labels, type DesktopAction, type FolderId, type Language, type WindowState, type WindowId, type ProjectId } from './model';
import { GhostOverlay } from './GhostOverlay';
import { useScreenFocus } from './useScreenFocus';
import { AboutContent, ExperienceContent, ContactContent } from './content/AboutContent';
import { ProjectsContent } from './content/ProjectsContent';
import { projects } from './content/projects';
import { DesktopProvider, useDesktop } from './features/ghost/DesktopContext';
import { AgentProvider } from './features/ghost/AgentContext';
import { GhostTerminal } from './features/ghost/GhostTerminal';

function FolderIcon(){return <span aria-hidden="true" className="folder-icon"><span/></span>;}
function titleFor(id:WindowId,language:Language){if(id.startsWith('project:')){const project=projects.find(p=>p.id===id.slice(8));return (language==='zh'?project?.zh:project?.title)||id;}return labels[id as FolderId][language];}
export function DesktopFolders({language,active,dispatch}:{language:Language;active?:WindowId;dispatch:Dispatch<DesktopAction>}){
 return <nav className="desktop-folders" aria-label={language==='en'?'Desktop folders':'桌面文件夹'}>{folders.map(id=><button key={id} data-guide={id} data-agent-id={`folder:${id}`} data-agent-label={labels[id][language]} className={`folder ${active===id?'selected':''}`} onClick={()=>dispatch({type:'open',id})}><FolderIcon/><span>{labels[id][language]}</span></button>)}</nav>;
}
export function DesktopWindow({window:win,language,dispatch,index,active}:{window:WindowState;language:Language;dispatch:Dispatch<DesktopAction>;index:number;active:boolean}){
 const desktop=useDesktop();const title=titleFor(win.id,language);const projectId=win.id.startsWith('project:')?win.id.slice(8):undefined;
 return <section hidden={win.minimized} data-window-id={win.id} role="region" aria-label={title} className={`desktop-window ${win.maximized?'maximized':''} ${active?'active':''}`} style={{zIndex:index+1,'--offset':`${(index%4)*10}px`} as React.CSSProperties} onPointerDown={()=>{if(!active)dispatch({type:'open',id:win.id});}} onFocusCapture={()=>{if(!active)dispatch({type:'open',id:win.id});}}>
  <header className="window-title"><span aria-hidden="true">▣</span><span>/{title}</span><div className="window-controls">{(['minimize','maximize','close'] as const).map((action,i)=><button key={action} data-guide="control" aria-label={language==='en'?`${action} ${title}`:`${['最小化','最大化','关闭'][i]}${title}`} onClick={()=>dispatch({type:action,id:win.id})}>{['−',win.maximized?'▣':'□','×'][i]}</button>)}</div></header>
  <div className="window-toolbar"><span>{language==='en'?'Directory':'目录'} / {title}</span><span>{projectId?'PROJECT':win.id==='projects'?'04 PROJECTS':win.id==='experience'?'04 ROLES':win.id==='about'?'PROFILE':'CONNECT'}</span></div>
  <div className="content-scroll" tabIndex={0} aria-label={language==='en'?`${title} content`:`${title}内容`}>
   {win.id==='about'&&<AboutContent language={language}/>}
   {(win.id==='projects'||projectId)&&<ProjectsContent language={language} visible={!win.minimized&&active} projectId={projectId} onSelect={id=>desktop.open(id?`project:${id as ProjectId}`:'projects')}/>}
   {win.id==='experience'&&<div className="standalone-experience" data-agent-id="experience:timeline" data-agent-label="Work experience"><h1>{language==='en'?'Experience':'工作经历'}</h1><ExperienceContent language={language}/></div>}
   {win.id==='contact'&&<ContactContent language={language}/>}
  </div><footer className="window-footer"><span>{language==='en'?'Scroll to explore · Made with curiosity.':'滚动查看更多 · 保持好奇。'}</span><span>↕</span></footer>
 </section>;
}
export function CrtMonitor({language,setLanguage}:{language:Language;setLanguage:(value:Language)=>void}){
 const [booting,setBooting]=useState(true);const {state,active,dispatch}=useDesktop();const [now,setNow]=useState(new Date());
 useEffect(()=>{const timer=setTimeout(()=>setBooting(false),matchMedia('(prefers-reduced-motion: reduce)').matches?150:2200);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer);},[]);
 return <div className="monitor-screen" data-booting={booting}><div className="os-shell" inert={booting}>
  <header className="os-header"><span className="os-brand"><b>▣</b> xiaohengOS <small>v1.0</small></span><button className="language-toggle" data-guide="language" aria-label={language==='en'?'Switch to Chinese':'切换为英文'} onClick={()=>setLanguage(language==='en'?'zh':'en')}>{language==='en'?'EN / 中':'中 / EN'}</button></header>
  <div className="desktop-area"><div className="wallpaper" aria-hidden="true"><span className="orbital orbital-one"/><span className="orbital orbital-two"/><span className="cross cross-one">✦</span><span className="cross cross-two">+</span><div className="skyline">▥ ▥ ▤ ▥ ▥</div></div><DesktopFolders language={language} active={active} dispatch={dispatch}/><div className="desktop-greeting"><span className="eyebrow">WELCOME TO MY LITTLE CORNER</span><h1>胡晓亨<span>XIAOHENG HU</span></h1><p>{language==='en'?'A curious mind. An open directory.':'保持好奇，探索更多。'}</p><span className="desktop-instruction">↖ {language==='en'?'Open a folder to explore':'打开文件夹，开始探索'}</span></div><div className="window-layer">{state.windows.map((win,index)=><DesktopWindow key={win.id} window={win} index={index} active={active===win.id} language={language} dispatch={dispatch}/>)}</div></div>
  {!!state.windows.length&&<div className="task-tray">{state.windows.map(w=><button key={w.id} aria-label={`Restore ${titleFor(w.id,language)}`} aria-pressed={active===w.id} onClick={()=>dispatch({type:'open',id:w.id})}>▣ {titleFor(w.id,language)}</button>)}</div>}
  <GhostTerminal language={language} now={now}/>
 </div>{booting&&<div className="boot-overlay" role="status" aria-label="正在启动 xiaohengOS"><div className="boot-copy"><span className="boot-brand">xiaohengOS<span> / PERSONAL COMPUTER</span></span><p>MEMORY CHECK ................ OK<br/>LOADING YOUR LITTLE CORNER ...</p><div className="boot-progress"><span/></div><small>正在启动 · WELCOME HOME</small></div><button className="boot-skip" onClick={()=>setBooting(false)}>Skip / 跳过 ↵</button></div>}</div>;
}
export function PortfolioScene(){
 const {stageRef,focused}=useScreenFocus();const [language,setLanguage]=useState<Language>('en');
 useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';},[language]);
 return <DesktopProvider language={language}><AgentProvider language={language}><main className={`portfolio-scene ${focused?'screen-focused':''}`}><header className="page-header"><span>XH<span className="tiny-square">■</span></span><span>PERSONAL SPACE / 001</span></header><div className="stage" ref={stageRef}><div className="desk-surface"/><div className="monitor-object"><img className="monitor-art" src="/assets/monitor-v2.png" alt=""/><CrtMonitor language={language} setLanguage={setLanguage}/></div><img className="desk-object keyboard-object" src="/assets/keyboard.png" alt=""/><img className="desk-object mouse-object" src="/assets/mouse-v2.png" alt=""/><img className="desk-object mug-object" src="/assets/mug.png" alt=""/></div><div className="scene-caption"><span>BUILT WITH CURIOSITY.</span><span>{language==='en'?'TAKE YOUR TIME. LOOK AROUND.':'慢慢看，随意逛。'}</span></div><GhostOverlay language={language} screenFocused={focused}/></main></AgentProvider></DesktopProvider>;
}
