import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Language } from '../model';
import { projects, projectHtml, projectSummary, assetUrl } from './projects';
import { Tags } from './ProfileContent';
import { useSemanticTarget } from '../features/monty/DesktopContext';
import { projectGuideTarget } from '../features/monty/GuideWorkflow';

function ProjectFile({item,language,onSelect}:{item:typeof projects[number];index:number;language:Language;onSelect:(id:string)=>void}){
 const target=useSemanticTarget(projectGuideTarget(item.id,{en:item.title,zh:item.zh}));
 return <button ref={target} className="project-file" data-agent-id={`project-card:${item.id}`} onClick={() => onSelect(item.id)}><img src={assetUrl(item.icon)} alt=""/><span>{language === 'en' ? item.title : item.zh}</span><span className="project-file-tooltip" role="tooltip">{projectSummary(item, language)}</span></button>;
}

/** Full-size image view rendered outside the monitor, so no CRT scanlines or size cap sit on top of it. */
function ImageViewer({ image, language, onClose }: { image: { src: string; alt: string }; language: Language; onClose: () => void }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return createPortal(<div className="image-viewer" role="dialog" aria-modal="true" aria-label={image.alt || (language === 'en' ? 'Image preview' : '图片预览')} onClick={onClose}>
    <img src={image.src} alt={image.alt}/>
    <button className="image-viewer-close" aria-label={language === 'en' ? 'Close preview' : '关闭预览'} onClick={onClose}>×</button>
  </div>, document.body);
}

export function ProjectsContent({ language, visible, projectId, onSelect }: { language: Language; visible: boolean; projectId?: string; onSelect: (id: string | null) => void }) {
  const selected = projectId, setSelected = onSelect;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!visible) root.current?.querySelectorAll('video').forEach(video => video.pause()); }, [visible]);
  const project = projects.find(item => item.id === selected);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => setPreview(null), [selected]);
  const openImage = (event: React.MouseEvent) => { const image = (event.target as HTMLElement).closest('img'); if (image) setPreview({ src: image.currentSrc || image.src, alt: image.alt }); };
  const detail=useSemanticTarget({id:`project:${project?.id ?? 'inactive'}`,names:{en:project?.title ?? 'Project detail',zh:project?.zh ?? '项目详情'},scope:{window:`project:${project?.id ?? 'inactive'}`,panel:'detail'},capabilities:['highlight','guideTo'],...(project?{projectId:project.id}:{})});
  useEffect(() => { const scroller = root.current?.closest('.content-scroll'); if (scroller) scroller.scrollTop = 0; }, [selected, language]);
  if (!project) return <div ref={root} className="projects-content"><header className="collection-header"><span className="content-kicker">PROJECTS / {String(projects.length).padStart(2,'0')} ITEMS</span><h1>{language === 'en' ? 'Projects directory' : '项目目录'}</h1></header><div className="project-directory" role="list">{projects.map((item, index) => <ProjectFile key={item.id} item={item} index={index} language={language} onSelect={setSelected}/>)}</div></div>;
  return <div ref={detail} className="project-detail" data-agent-id={`project:${project.id}`}><div className="project-detail-nav"><button onClick={() => setSelected(null)}>← {language === 'en' ? 'All projects' : '全部项目'}</button></div><span className="content-kicker">{project.category}</span><h1>{language === 'en' ? project.title : project.zh}</h1><p className="project-summary">{projectSummary(project, language)}</p><Tags values={project.tags} targetPrefix={`project:${project.id}:tag`} scope={{window:`project:${project.id}`,panel:'detail'}} projectId={project.id} /><article className="html-content markdown-content" onClick={openImage} dangerouslySetInnerHTML={{ __html: projectHtml(project, language) }} /><button className="content-back" onClick={() => setSelected(null)}>← {language === 'en' ? 'Back to projects' : '返回项目列表'}</button>{preview && <ImageViewer image={preview} language={language} onClose={() => setPreview(null)}/>}</div>;
}
