import { useEffect, useRef } from 'react';
import type { Language } from '../model';
import { projects, projectHtml, projectSummary, assetUrl } from './projects';
import { Tags } from './AboutContent';
import { useSemanticTarget } from '../features/crt-agent/DesktopContext';

function ProjectFile({item,language,onSelect}:{item:typeof projects[number];index:number;language:Language;onSelect:(id:string)=>void}){
 const target=useSemanticTarget({id:`project-card:${item.id}`,names:{en:item.title,zh:item.zh},scope:{window:'projects',panel:'collection'},capabilities:['highlight','guideTo'],projectId:item.id,completion:{window:`project:${item.id}`,panel:'detail'}});
 return <button ref={target} className="project-file" data-agent-id={`project-card:${item.id}`} onClick={() => onSelect(item.id)}><img src={assetUrl(item.icon)} alt=""/><span>{language === 'en' ? item.title : item.zh}</span><small>{language === 'en' ? 'HTML document' : 'HTML 文档'}</small><span className="project-file-tooltip" role="tooltip">{projectSummary(item, language)}</span></button>;
}

export function ProjectsContent({ language, visible, projectId, onSelect }: { language: Language; visible: boolean; projectId?: string; onSelect: (id: string | null) => void }) {
  const selected = projectId, setSelected = onSelect;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!visible) root.current?.querySelectorAll('video').forEach(video => video.pause()); }, [visible]);
  const project = projects.find(item => item.id === selected);
  const detail=useSemanticTarget({id:`project:${project?.id ?? 'inactive'}`,names:{en:project?.title ?? 'Project detail',zh:project?.zh ?? '项目详情'},scope:{window:`project:${project?.id ?? 'inactive'}`,panel:'detail'},capabilities:['highlight','guideTo'],...(project?{projectId:project.id}:{})});
  useEffect(() => { const scroller = root.current?.closest('.content-scroll'); if (scroller) scroller.scrollTop = 0; }, [selected, language]);
  if (!project) return <div ref={root} className="projects-content"><header className="collection-header"><span className="content-kicker">PROJECTS / {String(projects.length).padStart(2,'0')} ITEMS</span><h1>{language === 'en' ? 'Projects directory' : '项目目录'}</h1><p>{language === 'en' ? 'Open an HTML document to view a project.' : '打开一个 HTML 文档以查看项目详情。'}</p></header><div className="project-directory" role="list">{projects.map((item, index) => <ProjectFile key={item.id} item={item} index={index} language={language} onSelect={setSelected}/>)}</div></div>;
  return <div ref={detail} className="project-detail" data-agent-id={`project:${project.id}`}><div className="project-detail-nav"><button onClick={() => setSelected(null)}>← {language === 'en' ? 'All projects' : '全部项目'}</button><a href={assetUrl(project.pdf)} target="_blank" rel="noopener noreferrer">PDF ↗</a></div><span className="content-kicker">{project.category}</span><h1>{language === 'en' ? project.title : project.zh}</h1><p className="project-summary">{projectSummary(project, language)}</p><Tags values={project.tags} targetPrefix={`project:${project.id}:tag`} scope={{window:`project:${project.id}`,panel:'detail'}} projectId={project.id} /><article className="html-content markdown-content" dangerouslySetInnerHTML={{ __html: projectHtml(project, language) }} /><button className="content-back" onClick={() => setSelected(null)}>← {language === 'en' ? 'Back to projects' : '返回项目列表'}</button></div>;
}
