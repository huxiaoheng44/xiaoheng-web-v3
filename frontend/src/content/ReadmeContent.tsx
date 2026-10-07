import type { Language } from '../model';

const readme: Record<Language, string> = {
  en: `README
======

xiaohengOS v1.0 — the personal computer of Xiaoheng Hu


HELLO
  I'm Xiaoheng Hu (胡晓亨), a software engineer in Munich working on
  full-stack products, AI/LLM applications and developer platforms.
  This little computer is my portfolio.


WHAT'S ON THIS DESKTOP
  Projects/        7 projects with write-ups, figures and demo videos
  README           this file: what this site is, plus my profile below
  Experience       where I've worked and what I built there
  Contact          email and LinkedIn
  DOOM.exe         the 1993 shareware episode, playable right here


MEET MONTY
  The little robot living in this screen is Monty, the agent of this
  computer. Type in the terminal at the bottom ("ask Monty…") and press
  Enter, or click Monty itself. What Monty can do:

  · Answer questions about my projects, experience and skills, using
    the content of this portfolio, and show where the answer came from.
  · Explain the public source code of this site (stack, structure, a
    specific module) with links to the files on GitHub.
  · Reply in your language: write in English or Chinese and Monty
    follows you.
  · Show you the way: Monty flies next to the folder, project or tag
    you're looking for and highlights it. The clicking stays with you.
  · Suggest something now and then: if you linger on a project, it may
    point out a related one. At most two unprompted messages per visit.
  · Rest: after a quiet while Monty dozes off, and wakes up when you
    interact again.

  Settings (⚙ next to Monty while the chat is open):
  · Do not disturb: no more unprompted messages.
  · Clear this session.
  · Session activity: what Monty noticed, which tools it used and
    which sources it read.

  Monty never clicks, scrolls, navigates or types for you.
  Privacy: it only sees a short summary of this visit (which window is
  open, what you hovered or clicked). Never mouse positions or text you
  type elsewhere, and everything resets when you leave or refresh.


TIPS
  · Click a desktop icon to open it. Windows can be minimized,
    maximized and closed like on any desktop.
  · The thin button at the far right of the status bar shows the
    desktop; click it again to bring the windows back.
  · The arrow in the bottom-right corner of the desktop switches to the
    next wallpaper.
  · Click a figure inside a project to view it full size.
  · EN / 中 switches the language. ⏻ turns the computer off.
  · Outside the screen: the button on the monitor's bezel turns the
    monitor off and on, and the desk lamp can be switched off too.


HOW IT'S BUILT
  Frontend   React · TypeScript · Vite, pixel-art desk and CRT monitor
  Agent      Python · FastAPI · LangGraph, retrieval over the portfolio
             content and this site's public GitHub repository
  Source     github.com/huxiaoheng44/xiaoheng-web-v3
`,
  zh: `README
======

xiaohengOS v1.0 —— 胡晓亨的个人电脑


你好
  我是胡晓亨（Xiaoheng Hu），在慕尼黑工作的软件工程师，做过全栈产品、
  AI/LLM 应用和开发者平台。这台小电脑就是我的作品集。


桌面上有什么
  项目/            7 个项目，附说明、图表和演示视频
  README           就是这个文件：介绍这个网站，下面是我的个人资料
  经历             我的工作经历和做过的事情
  联系             邮箱和 LinkedIn
  DOOM.exe         1993 年的《毁灭战士》共享版，可以直接在这里玩


认识 Monty
  住在这块屏幕里的小机器人叫 Monty，是这台电脑的 Agent。
  在底部终端（"ask Monty…"）里输入问题后按回车，或者直接点击 Monty。
  Monty 能做的事：

  · 回答关于我的项目、经历和技能的问题，依据是这个作品集里的内容，
    并告诉你答案出自哪里。
  · 讲解这个网站公开的源代码（技术栈、结构、某个模块），
    附上 GitHub 上对应文件的链接。
  · 用你的语言回答：你用中文或英文提问，它就用同样的语言回复。
  · 给你指路：Monty 会飞到你要找的文件夹、项目或标签旁边并高亮它，
    点不点由你决定。
  · 偶尔给点建议：你在某个项目上停留时，它可能推荐一个相关的项目。
    每次访问最多主动说两次话。
  · 会休息：你一段时间没有操作，它会打瞌睡；你再次操作时它会醒来。

  设置（打开对话后，Monty 旁边的 ⚙）：
  · 免打扰：不再主动发消息。
  · 清空本次会话。
  · 会话活动：Monty 注意到了什么、用了哪些工具、读了哪些资料。

  Monty 从不替你点击、滚动、跳转或输入。
  隐私：它只能看到这次访问的简短摘要（打开了哪个窗口、
  悬停或点击了什么），不会看到鼠标坐标或你在别处输入的文字，
  离开或刷新页面后一切都会重置。


小提示
  · 点击桌面图标即可打开；窗口可以像普通桌面一样最小化、最大化和关闭。
  · 状态栏最右边的细长按钮可以显示桌面，再点一次恢复窗口。
  · 桌面右下角的箭头可以切换到下一张壁纸。
  · 点击项目里的图片可以放大查看。
  · EN / 中 切换语言，⏻ 关闭电脑。
  · 屏幕外面：显示器边框上的按钮可以开关显示器，台灯也可以关掉。


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
