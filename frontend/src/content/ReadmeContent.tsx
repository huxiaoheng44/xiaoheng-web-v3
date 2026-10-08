import type { ReactNode } from 'react';
import type { FolderId, Language } from '../model';

type Item = { icon: FolderId; name: string; text: string };
type Copy = {
  title: string; tagline: string; intro: string;
  desktopTitle: string; desktop: Item[];
  montyTitle: string; montyIntro: ReactNode; abilitiesTitle: string; abilities: [string, string][];
  settingsTitle: string; settings: [string, string][];
  privacyTitle: string; privacy: string; boundary: string;
  tipsTitle: string; tips: ReactNode[];
  builtTitle: string; built: [string, string][];
};

const K = ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>;

const copy: Record<Language, Copy> = {
  en: {
    title: 'README', tagline: 'xiaohengOS v1.0 · the personal computer of Xiaoheng Hu',
    intro: 'This site is a portfolio built as a small pixel-art computer. Everything on the screen is a working desktop: open the icons, read the projects, and ask Monty, the agent living in this computer, whatever you like.',
    desktopTitle: 'On this desktop',
    desktop: [
      { icon: 'projects', name: 'Projects', text: '7 projects with write-ups, figures and demo videos' },
      { icon: 'readme', name: 'README', text: 'this file: what the site is and what Monty can do' },
      { icon: 'profile', name: 'Profile', text: 'experience, education, toolkit, research & projects' },
      { icon: 'contact', name: 'Contact', text: 'email and LinkedIn' },
      { icon: 'doom', name: 'DOOM.exe', text: 'the 1993 shareware episode, playable right here' },
      { icon: 'monty-history', name: 'monty.history', text: 'your conversation with Monty in this session' },
    ],
    montyTitle: 'Meet Monty',
    montyIntro: <>The little robot in the bottom-right corner is <b>Monty</b>, the agent of this computer. Type in the terminal at the bottom (<K>ask Monty…</K>) and press <K>Enter</K>, or click Monty itself.</>,
    abilitiesTitle: 'What Monty can do',
    abilities: [
      ['Answer', 'questions about projects, experience and skills, grounded in this portfolio, with the sources it used.'],
      ['Read code', 'explain the public source of this site (stack, structure, a module) and link to the files on GitHub.'],
      ['Speak your language', 'write in English or Chinese and Monty replies the same way.'],
      ['Show the way', 'fly next to the folder, project or tag you are looking for and highlight it. The clicking stays with you.'],
      ['Suggest', 'if you linger on a project, point out a related one. At most two unprompted messages per visit.'],
      ['Rest', 'doze off after a quiet while and wake up as soon as you interact again.'],
    ],
    settingsTitle: 'Settings · ⚙ next to Monty while the chat is open',
    settings: [
      ['Do not disturb', 'no more unprompted messages'],
      ['Clear this session', 'forget the conversation so far'],
      ['Session activity', 'what Monty noticed, which tools it used and which sources it read'],
    ],
    privacyTitle: 'Privacy',
    privacy: 'Monty only sees a short summary of this visit: which window is open and what you hovered or clicked. Never mouse positions or text typed elsewhere, and everything resets when you refresh or leave.',
    boundary: 'Monty never clicks, scrolls, navigates or types for you.',
    tipsTitle: 'Tips',
    tips: [
      <>Click a desktop icon to open it. Windows can be minimized, maximized and closed.</>,
      <>The thin button at the far right of the status bar shows the desktop; click again to restore.</>,
      <>The <K>→</K> arrow in the bottom-right corner switches to the next wallpaper.</>,
      <>Click a figure inside a project to see it full size; <K>Esc</K> closes it.</>,
      <><K>EN / 中</K> switches the language and <K>⏻</K> shuts the computer down.</>,
      <>Outside the screen, the button on the monitor bezel turns the monitor off and on, and the desk lamp can be switched off.</>,
    ],
    builtTitle: 'How it is built',
    built: [
      ['Frontend', 'React · TypeScript · Vite, hand-drawn pixel art'],
      ['Agent', 'Python · FastAPI · LangGraph, retrieval over the portfolio and this site’s public repository'],
      ['Source', 'github.com/huxiaoheng44/xiaoheng-web-v3'],
    ],
  },
  zh: {
    title: 'README', tagline: 'xiaohengOS v1.0 · 胡晓亨的个人电脑',
    intro: '这个网站是一个做成像素风小电脑的作品集。屏幕上的一切都是可以用的桌面：打开图标、看看项目，也可以问问住在这台电脑里的 Agent——Monty。',
    desktopTitle: '桌面上有什么',
    desktop: [
      { icon: 'projects', name: '项目', text: '7 个项目，附说明、图表和演示视频' },
      { icon: 'readme', name: 'README', text: '就是这个文件：介绍这个网站和 Monty 能做什么' },
      { icon: 'profile', name: '个人资料', text: '工作经历、教育、技能、研究与项目' },
      { icon: 'contact', name: '联系', text: '邮箱和 LinkedIn' },
      { icon: 'doom', name: 'DOOM.exe', text: '1993 年的《毁灭战士》共享版，可以直接在这里玩' },
      { icon: 'monty-history', name: 'monty.history', text: '本次会话里和 Monty 的聊天记录' },
    ],
    montyTitle: '认识 Monty',
    montyIntro: <>右下角的小机器人叫 <b>Monty</b>，是这台电脑的 Agent。在底部终端（<K>ask Monty…</K>）里输入问题后按 <K>回车</K>，或者直接点击 Monty。</>,
    abilitiesTitle: 'Monty 能做什么',
    abilities: [
      ['回答问题', '关于项目、经历和技能的问题，依据是这个作品集的内容，并告诉你出处。'],
      ['讲解代码', '讲解这个网站公开的源代码（技术栈、结构、某个模块），附上 GitHub 文件链接。'],
      ['跟你说同一种语言', '你用中文或英文提问，它就用同样的语言回复。'],
      ['指路', '飞到你要找的文件夹、项目或标签旁边并高亮它，点不点由你决定。'],
      ['推荐', '你在某个项目上停留时，可能推荐一个相关项目。每次访问最多主动说两次话。'],
      ['休息', '一段时间没有操作会打瞌睡，你一动它就醒。'],
    ],
    settingsTitle: '设置 · 打开对话后 Monty 旁边的 ⚙',
    settings: [
      ['免打扰', '不再主动发消息'],
      ['清空本次会话', '忘掉目前为止的对话'],
      ['会话活动', 'Monty 注意到了什么、用了哪些工具、读了哪些资料'],
    ],
    privacyTitle: '隐私',
    privacy: 'Monty 只能看到这次访问的简短摘要：打开了哪个窗口、悬停或点击了什么。不会看到鼠标坐标或你在别处输入的文字，刷新或离开后一切都会重置。',
    boundary: 'Monty 从不替你点击、滚动、跳转或输入。',
    tipsTitle: '小提示',
    tips: [
      <>点击桌面图标即可打开；窗口可以最小化、最大化和关闭。</>,
      <>状态栏最右边的细长按钮可以显示桌面，再点一次恢复窗口。</>,
      <>桌面右下角的 <K>→</K> 箭头可以切换到下一张壁纸。</>,
      <>点击项目里的图片可以放大查看，按 <K>Esc</K> 关闭。</>,
      <><K>EN / 中</K> 切换语言，<K>⏻</K> 关闭电脑。</>,
      <>屏幕外面：显示器边框上的按钮可以开关显示器，台灯也可以关掉。</>,
    ],
    builtTitle: '技术实现',
    built: [
      ['前端', 'React · TypeScript · Vite，手绘像素美术'],
      ['Agent', 'Python · FastAPI · LangGraph，检索作品集内容和本网站的公开仓库'],
      ['源码', 'github.com/huxiaoheng44/xiaoheng-web-v3'],
    ],
  },
};

export function ReadmeContent({ language }: { language: Language }) {
  const c = copy[language];
  return <article className="readme-doc">
    <header className="readme-head">
      <h1>{c.title}</h1>
      <p className="readme-tagline">{c.tagline}</p>
      <p>{c.intro}</p>
    </header>

    <section>
      <h2>{c.desktopTitle}</h2>
      <ul className="readme-files">
        {c.desktop.map(item => <li key={item.icon}><img src={`/assets/desktop-icons/${item.icon}.png`} alt="" width={24} height={24}/><b>{item.name}</b><span>{item.text}</span></li>)}
      </ul>
    </section>

    <section>
      <h2>{c.montyTitle}</h2>
      <div className="readme-monty"><span className="monty-sprite readme-monty-sprite" aria-hidden="true"/><p>{c.montyIntro}</p></div>
      <h3>{c.abilitiesTitle}</h3>
      <ul className="readme-abilities">
        {c.abilities.map(([name, text], i) => <li key={name}><span className="readme-num">{String(i + 1).padStart(2, '0')}</span><b>{name}</b><span>{text}</span></li>)}
      </ul>
      <h3>{c.settingsTitle}</h3>
      <dl className="readme-pairs">
        {c.settings.map(([name, text]) => <div key={name}><dt>{name}</dt><dd>{text}</dd></div>)}
      </dl>
      <div className="readme-note">
        <b>{c.privacyTitle}</b>
        <p>{c.privacy}</p>
        <p className="readme-boundary">{c.boundary}</p>
      </div>
    </section>

    <section>
      <h2>{c.tipsTitle}</h2>
      <ul className="readme-tips">{c.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
    </section>

    <section>
      <h2>{c.builtTitle}</h2>
      <dl className="readme-pairs readme-stack">
        {c.built.map(([name, text]) => <div key={name}><dt>{name}</dt><dd>{text}</dd></div>)}
      </dl>
    </section>
  </article>;
}
