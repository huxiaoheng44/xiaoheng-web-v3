"""Trusted, display-only planning for an explicit guided tour.

The planner is deliberately independent of model tool calls.  Its interface is
small: it receives the current question, locale, and the client-declared
semantic target snapshot, then returns exactly one guide target or a safe
finish message.  It never receives layout, DOM, pointer, or history data.
"""
from dataclasses import dataclass
import re

from ..schemas.contracts import PageContext


_GUIDE_INTENT = re.compile(
    r"带我(?:看|去)|引导我|导览|带我逛|\b(?:show me|take me to|guide me(?: through)?)\b",
    re.IGNORECASE,
)
_PROJECT_INTENT = re.compile(r"项目|作品|\b(?:projects?|work|full[ -]?stack|web|ai)\b", re.IGNORECASE)


@dataclass(frozen=True)
class GuideDecision:
    kind: str
    target_id: str = ""
    message: str = ""


def _finish(locale: str) -> GuideDecision:
    return GuideDecision(
        "finish",
        message=("当前页面没有可安全引导的目标。" if locale == "zh" else "There is no safe guide target in the current view."),
    )


class GuidePlanner:
    """A deep module with one interface: ``plan`` returns a trusted decision."""

    def is_explicit(self, question: str) -> bool:
        return bool(_GUIDE_INTENT.search(question))

    @staticmethod
    def topic(question: str) -> str:
        """Persist only a coarse, non-identifying tour topic between steps."""
        return "ai" if re.search(r"AI|人工智能|智能", question, re.IGNORECASE) else ""

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
        if guide_step and context.activeWindow == "projects" and context.activePanel == "collection":
            cards = sorted([
                target for target in context.targets
                if target.id.startswith("project-card:") and self._eligible(context, target.id)
            ], key=lambda target: target.id)
            if cards:
                matching=[target for target in cards if topic and topic.casefold() in f"{target.id} {target.names.en} {target.names.zh}".casefold()]
                return GuideDecision("guide", target_id=(matching or cards)[0].id)

        # The desktop Projects folder is the only stable trusted fallback.  It
        # is an entry point, not a guessed project/detail target.
        if context.activeWindow is None and _PROJECT_INTENT.search(question) and self._eligible(context, "folder:projects"):
            return GuideDecision("guide", target_id="folder:projects")
        return _finish(locale)
