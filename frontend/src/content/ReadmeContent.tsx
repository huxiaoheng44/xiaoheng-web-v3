import type { Language } from '../model';

const readme: Record<Language, string> = {
  en: `README.txt
==========

xiaohengOS v1.0 — the personal computer of Xiaoheng Hu


HELLO
  I'm Xiaoheng Hu (胡晓亨), a software engineer in Munich working on
  full-stack products, AI/LLM applications and developer platforms.
  This little computer is my portfolio.


WHAT'S ON THIS DESKTOP
  Projects/        7 projects with write-ups, figures and demo videos
  README.txt       this file: what this site is, plus my profile below
  Experience.exe   where I've worked and what I built there
  Contact          email and LinkedIn


CRT.AGENT
  The small robot living in the screen is CRT.AGENT, a guide for this
  portfolio. Ask it anything in the terminal at the bottom
  ("ask CRT.AGENT…"): my projects, skills, or the public source code of
  this site. It answers in your language and can point at things on the
  page, but it never clicks, scrolls, navigates or types for you.

  Privacy: it only sees a short summary of this visit (which window is
  open, what you hovered or clicked). Never mouse positions or text you
  type elsewhere, and nothing is kept after the visit.


TIPS
  · Click a desktop icon to open it. Windows can be minimized,
    maximized and closed like on any desktop.
  · ▦ Wallpaper in the taskbar picks a random wallpaper.
  · EN / 中 switches the language. ⏻ turns the computer off.


HOW IT'S BUILT
  Frontend   React · TypeScript · Vite, pixel-art desk and CRT monitor
  Agent      Python · FastAPI · LangGraph, retrieval over the portfolio
             content and this site's public GitHub repository
  Source     github.com/huxiaoheng44/xiaoheng-web-v3
`,
  zh: `README.txt
==========

xiaohengOS v1.0 —— 胡晓亨的个人电脑


你好
  我是胡晓亨（Xiaoheng Hu），在慕尼黑工作的软件工程师，做过全栈产品、
  AI/LLM 应用和开发者平台。这台小电脑就是我的作品集。


桌面上有什么
  项目/            7 个项目，附说明、图表和演示视频
  README.txt       就是这个文件：介绍这个网站，下面是我的个人资料
  经历.exe         我的工作经历和做过的事情
  联系             邮箱和 LinkedIn


CRT.AGENT
  住在屏幕里的小机器人叫 CRT.AGENT，是这个作品集的向导。
  在底部的终端（"ask CRT.AGENT…"）里问它任何问题都可以：
  我的项目、技能，或者这个网站公开的源代码。
  它会用你的语言回答，也能在页面上指给你看，
  但它从不替你点击、滚动、跳转或输入。

  隐私：它只能看到这次访问的简短摘要（打开了哪个窗口、
  悬停或点击了什么），不会看到鼠标坐标或你在别处输入的文字，
  离开后也不会保留任何记录。


小提示
  · 点击桌面图标即可打开；窗口可以像普通桌面一样最小化、最大化和关闭。
  · 任务栏里的 ▦ 壁纸 按钮会随机换一张壁纸。
  · EN / 中 切换语言，⏻ 关闭电脑。


技术实现
  前端      React · TypeScript · Vite，像素风书桌与 CRT 显示器
  Agent     Python · FastAPI · LangGraph，检索作品集内容和
            本网站在 GitHub 上的公开仓库
  源码      github.com/huxiaoheng44/xiaoheng-web-v3
`,
};

export function ReadmeContent({ language }: { language: Language }) {
  return <>
    <pre className="readme-file">{readme[language]}</pre>
    <div className="readme-divider" aria-hidden="true">── {language === 'en' ? 'PROFILE' : '个人资料'} ──</div>
  </>;
}
