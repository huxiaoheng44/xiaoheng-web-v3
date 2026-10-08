from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

PRESENTATION_CAPABILITIES = {'highlight', 'guideTo'}
PRESENTATION_STATES = {'idle', 'observing', 'thinking', 'speaking', 'guiding', 'dozing', 'sleeping', 'waking'}

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

class TargetNames(Strict):
    en: str = Field(min_length=1, max_length=120)
    zh: str = Field(min_length=1, max_length=120)

class Target(Strict):
    id: str = Field(max_length=160, pattern=r'^[a-zA-Z0-9:_-]+$')
    available: bool
    visible: bool | None = None
    guideable: bool | None = None
    capabilities: list[Literal['highlight', 'guideTo']] = Field(default_factory=list, max_length=2)
    names: TargetNames
    projectId: str | None = Field(default=None, max_length=100, pattern=r'^[a-z0-9-]+$')
    parentId: str | None = Field(default=None, max_length=160, pattern=r'^[a-zA-Z0-9:_-]+$')
    tag: str | None = Field(default=None, max_length=120)

class PageContext(Strict):
    language: Literal['en', 'zh']
    contextVersion: int = Field(ge=0)
    activeWindow: str | None = Field(default=None, max_length=100)
    activePanel: str = Field(default='', max_length=100)
    windows: list[str] = Field(default_factory=list, max_length=8)
    profileSection: str = Field(default='profile', max_length=30)
    targets: list[Target] = Field(default_factory=list, max_length=100)

class BehaviorEvent(Strict):
    type: Literal['click', 'hover', 'dwell', 'visit', 'visibility']
    target: str = Field(max_length=160)
    projectId: str | None = Field(default=None, max_length=100, pattern=r'^[a-z0-9-]+$')
    tag: str | None = Field(default=None, max_length=120)
    duration: float = Field(default=0, ge=0, le=7200000)

class Behavior(Strict):
    route: str = Field(max_length=100)
    window: str | None = Field(default=None, max_length=100)
    activePanel: str = Field(default='', max_length=100)
    locale: Literal['en', 'zh']
    dnd: bool = False
    proactiveCount: int = Field(default=0, ge=0, le=2)
    events: list[BehaviorEvent] = Field(default_factory=list, max_length=60)
    idleSeconds: float = Field(default=0, ge=0, le=7200)

class ChatRequest(Strict):
    requestId: str = Field(min_length=8, max_length=80)
    message: str = Field(default='', max_length=4000)
    messageLocale: Literal['en', 'zh'] | None = None
    pageContext: PageContext
    dnd: bool = False
    guideStep: bool = False
    behavior: Behavior | None = None

class PresentationInstruction(Strict):
    """A display-only instruction. The client remains authoritative over targets."""
    type: Literal['speak', 'setState', 'highlight', 'guideTo', 'showHint', 'showRecommendation']
    target: str = Field(default='', max_length=160, pattern=r'^[a-zA-Z0-9:_-]*$')
    targets: list[str] = Field(default_factory=list, max_length=20)
    value: str = Field(default='', max_length=200)
    @model_validator(mode='after')
    def allowed(self):
        if self.type in PRESENTATION_CAPABILITIES and not self.target and not self.targets: raise ValueError('Target required')
        if self.type in {'speak', 'showHint', 'showRecommendation'} and not self.value.strip(): raise ValueError('Text required')
        if self.type == 'setState' and self.value not in PRESENTATION_STATES: raise ValueError('Unknown presentation state')
        if self.type not in PRESENTATION_CAPABILITIES and self.target: raise ValueError('Target is not allowed for this instruction')
        if self.targets:
            if self.type != 'highlight' or self.target: raise ValueError('Lists are only allowed for highlight, without a single target')
            if len(set(self.targets)) != len(self.targets): raise ValueError('Duplicate targets')
            import re
            if any(not re.fullmatch(r'[a-zA-Z0-9:_-]{1,160}', target) for target in self.targets): raise ValueError('Invalid target ID')
        return self
