import type { Language } from '../model';

const notes = import.meta.glob<string>('../../../content/projects/**/*.md', { eager: true, query: '?raw', import: 'default' });
const assets = import.meta.glob<string>(['../../../content/projects/assets/**/*.png', '../../../content/pdf/*.pdf', '../../../content/videos/3D.mp4', '../../../content/videos/DroneDemo.mp4', '../../../content/videos/FASTAIMOVIE.mp4'], { eager: true, query: '?url', import: 'default' });

export const projects = [
  { id: '3d-reconstruction', title: 'Stereo 3D Reconstruction', zh: '双目视觉三维重建', category: 'COMPUTER VISION', tags: ['Stereo vision', 'BM / SGBM', 'Point clouds'], image: '3d-reconstruction/output-35.png', video: '3D.mp4', pdf: '3DReconstruction.pdf' },
  { id: 'drone-simulator', title: 'Drone Simulator', zh: '无人机仿真与控制', category: 'SYSTEMS / ROBOTICS', tags: ['seL4 / TrentOS', 'PX4', 'C++'], image: 'drone-simulator/setup-15.png', video: 'DroneDemo.mp4', pdf: 'Drone.pdf' },
  { id: 'fast-ai-movie', title: 'FAST AI Movie Web', zh: 'FAST AI 视频编辑平台', category: 'PRODUCT ENGINEERING', tags: ['AI video', 'Editing workflows', 'Web'], image: 'fast-ai-movie/ui-08.png', video: 'FASTAIMOVIE.mp4', pdf: 'FASTAIMOVIE.pdf' },
  { id: 'vehicle-identification', title: 'Vehicle Noise Classification', zh: '道路噪声车辆分类', category: 'MACHINE LEARNING', tags: ['Acoustics', 'KNN', 'Neural networks'], image: 'vehicle-identification/data-06.png', video: undefined, pdf: 'VehicleIdentification.pdf' },
];
export function assetUrl(href: string): string | undefined {
  const clean = href.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
  const path = clean.startsWith('assets/') ? `../../../content/projects/${clean}` : `../../../content/${clean}`;
  return assets[path];
}
export function projectCopy(id: string, language: Language) {
  const raw = notes[`../../../content/projects/${language === 'en' ? 'en/' : ''}${id}.md`] || '';
  const summary = raw.match(/## (?:Summary|一句话简介)\s+([^\n]+)/)?.[1] || '';
  const sections = raw.split(/(?=^## )/m).filter(section => section.startsWith('## '));
  const body = sections.filter(section => !/^## (?:Summary|一句话简介|Portfolio copy|网页文案草案|待补充信息)\s*\n/.test(section)).join('\n').replace(/^## 建议展示素材/gm, '## 项目展示').replace(/^## 明确提及的工具\/概念/gm, '## 技术与方法');
  return { summary, body };
}
