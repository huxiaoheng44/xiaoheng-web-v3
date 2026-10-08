"""Trusted, display-only planning for an explicit guided tour.

The planner is deliberately independent of model tool calls.  Its interface is
small: it receives the current question, locale, and the client-declared
semantic target snapshot, then returns exactly one guide target or a safe
finish message.  It never receives layout, DOM, pointer, or history data.
"""
from dataclasses import dataclass
import re
from html import unescape
from ..core.config import ROOT

from ..schemas.contracts import PageContext


_GUIDE_INTENT = re.compile(
    r"带我(?:看|去)|引导我|导览|带我逛|\b(?:show me|take me to|guide me(?: through)?)\b",
    re.IGNORECASE,
)
_PROJECT_INTENT = re.compile(r"项目|作品|\b(?:projects?|work|full[ -]?stack|web|ai)\b", re.IGNORECASE)
from ..knowledge.project_catalog import CATALOG, TOPICS


@dataclass(frozen=True)
class GuideDecision:
    kind: str
    target_id: str = ""
    message: str = ""
    choices: tuple[str, ...] = ()


def _finish(locale: str) -> GuideDecision:
    return GuideDecision(
        "finish",
        message=("你想看哪个项目或桌面文件夹？告诉我名称，我带你过去。" if locale == "zh" else "Which project or desktop folder would you like to see? Tell me its name and I’ll guide you there."),
    )


def _project_arrival(project_id: str, locale: str) -> GuideDecision:
    """Introduce an arrived-at catalog project using its published page copy."""
    document = 'drone' if project_id == 'drone-simulator' else project_id
    language = 'zh' if locale == 'zh' else 'en'
    try:
        page = (ROOT / 'content/html' / language / f'{document}.html').read_text(encoding='utf-8')
    except OSError:
        page = ''
    title = re.search(r'<h1\b[^>]*>(.*?)</h1>', page, re.S)
    lead = re.search(r'<p\b[^>]*class=["\']lead["\'][^>]*>(.*?)</p>', page, re.S)
    def text(match):
        return ' '.join(unescape(re.sub(r'<[^>]*>', '', match.group(1))).split()) if match else ''
    introduction = ' '.join(filter(None, [text(title), text(lead)]))
    message = ('已到达项目详情。' if locale == 'zh' else 'You have reached the project details. ')
    message += introduction or ('可以开始浏览了。' if locale == 'zh' else 'Enjoy exploring.')
    # Presentation text has a shared 200-character client/server limit.
    if len(message) > 200:
        excerpt = message[:199]
        message = (excerpt.rsplit(' ', 1)[0] if locale != 'zh' else excerpt) + '…'
    return GuideDecision('finish', message=message)


class GuidePlanner:
    """A deep module with one interface: ``plan`` returns a trusted decision."""

    def is_explicit(self, question: str) -> bool:
        return bool(_GUIDE_INTENT.search(question))

    def needs_semantic_choices(self, question: str) -> bool:
        return not self.topic(question) and bool(re.search(r'项目|作品|\bprojects?\b', question, re.I))

    @staticmethod
    def topic(question: str) -> str:
        """Persist only a catalog project ID or coarse topic between steps."""
        if re.search(r'关于网站|网站介绍|\b(?:readme|about (?:the |this )?(?:website|site))\b', question, re.I):
            return 'folder:readme'
        for entry in CATALOG:
            if any(alias.casefold() in question.casefold() for alias in [entry['id'], *entry['aliases']]):
                return entry['id']
        for section, pattern in {
            'education': r'教育|学历|\beducation\b|\bacademic background\b',
            'skills': r'技能|技术栈|\b(?:skills?|toolkit)\b',
            'research': r'研究经历|研究背景|研究与项目|\bresearch(?: experience| background| and projects)?\b',
            'experience': r'工作经历|工作经验|职业经历|\b(?:work experience|career|experience)\b',
        }.items():
            if re.search(pattern, question, re.I):
                return f'profile-section:{section}'
        for folder, pattern in {
            'contact': r'联系|邮箱|\bcontact\b',
            'profile': r'工作经历|经历|个人资料|个人简介|自我介绍|关于(?:你|作者)|教育|学历|技能|\b(?:experience|profile|education|skills?|toolkit)\b|\babout (?:you|yourself|xiaoheng)\b',
            'readme': r'关于(?:页面|网站|文件夹)|网站介绍|\b(?:readme|about)\b',
            'doom': r'游戏|\bdoom\b',
        }.items():
            if re.search(pattern, question, re.IGNORECASE):
                return f'folder:{folder}'
        for entry in CATALOG:
            if any(alias.casefold() in question.casefold() for alias in [entry['id'], *entry['aliases']]):
                return entry['id']
        return next((name for name, pattern in TOPICS.items() if re.search(pattern, question, re.IGNORECASE)), '')

    def discover(self, question: str, locale: str) -> GuideDecision | None:
        """Resolve broad project interests before planning any page movement."""
        topic = self.topic(question)
        if topic not in TOPICS:
            return None
        # Keep conceptual questions (e.g. "What is RAG?") on the knowledge path.
        if not (self.is_explicit(question) or re.search(r'项目|作品|推荐|想看|感兴趣|相关|方向|\b(projects?|portfolio|interested|related|recommend)\b', question, re.I) or question.strip().casefold() == topic):
            return None
        ids = tuple(entry['id'] for entry in CATALOG if topic in entry['topics'])
        if not ids:
            return None
        return GuideDecision('choices', message='这些项目与这个方向相关。你对哪个更感兴趣？点击一个，我再带你过去。' if locale == 'zh' else 'These projects relate to your interest. Which would you like to explore? Choose one and I’ll guide you there.', choices=ids)

    @staticmethod
    def _eligible(context: PageContext, target_id: str) -> bool:
        return any(
            target.id == target_id
            and target.guideable is True
            and "guideTo" in target.capabilities
            for target in context.targets
        )

    def from_candidate_ids(self, context: PageContext, locale: str, candidate_ids: list[str]) -> GuideDecision:
        """Accept one exact provider candidate; reject unknown or plural output."""
        if len(candidate_ids) == 1 and self._eligible(context, candidate_ids[0]):
            return GuideDecision("guide", target_id=candidate_ids[0])
        return _finish(locale)

    def plan(self, question: str, context: PageContext, locale: str, candidate_ids: list[str] | None = None, *, guide_step: bool = False, topic: str = "") -> GuideDecision | None:
        """Return ``None`` only for an ordinary question, never for a guide turn."""
        explicit = self.is_explicit(question) or guide_step
        if not explicit:
            return None
        if candidate_ids is not None:
            return self.from_candidate_ids(context, locale, candidate_ids)

        # A completed Projects-folder step receives a new semantic snapshot.
        # Continue only with a registered card in that collection; this is
        # deliberately local metadata, never DOM text or a provider action.
        topic = topic if guide_step else self.topic(question)
        destination = 'folder:profile' if topic.startswith('profile-section:') else topic if topic.startswith('folder:') else 'folder:projects' if topic or _PROJECT_INTENT.search(question) or guide_step else ''
        if not destination:
            return _finish(locale)
        if destination == 'folder:profile' and context.activeWindow == 'profile':
            panel = topic.removeprefix('profile-section:') if topic.startswith('profile-section:') else 'profile'
            if context.activePanel != panel:
                target = f'profile-section:{panel}' if context.activePanel == 'profile' else 'profile:back'
                return GuideDecision('guide', target_id=target) if self._eligible(context, target) else _finish(locale)
        if destination != 'folder:projects' and context.activeWindow == destination.removeprefix('folder:'):
            return GuideDecision('finish', message='已打开你要看的内容，可以开始浏览了。' if locale == 'zh' else 'The requested content is open. Enjoy exploring.')
        if destination == 'folder:projects' and context.activeWindow and context.activeWindow.startswith('project:') and context.activePanel == 'detail':
            project_id = context.activeWindow.removeprefix('project:')
            entry = next((entry for entry in CATALOG if entry['id'] == project_id), None)
            if entry and (not topic or topic == project_id or topic in entry['topics']):
                return _project_arrival(project_id, locale)
        if destination == "folder:projects" and context.activeWindow == "projects" and context.activePanel == "collection":
            cards = [
                target for target in context.targets
                if target.id.startswith("project-card:") and self._eligible(context, target.id)
            ]
            if cards:
                for entry in CATALOG:
                    if (not topic or topic == entry['id'] or topic in entry['topics']) and any(card.id == f"project-card:{entry['id']}" for card in cards):
                        return GuideDecision("guide", target_id=f"project-card:{entry['id']}")
                return _finish(locale)

        # An open window is a real prerequisite, not a dead end. Guide only
        # the registered minimize control; the visitor still performs the click.
        if context.activeWindow is not None:
            minimize = f"window:minimize:{context.activeWindow}"
            if self._eligible(context, minimize):
                return GuideDecision('guide', target_id=minimize)
            return GuideDecision('finish', message='请先最小化当前窗口，回到桌面后再告诉我继续。' if locale == 'zh' else 'Please minimize the current window, then ask me to continue from the desktop.')
        if self._eligible(context, destination):
            return GuideDecision('guide', target_id=destination)
        return _finish(locale)
