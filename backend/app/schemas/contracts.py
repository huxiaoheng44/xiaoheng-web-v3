from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

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

class PresentationItem(Strict):
    target: str = Field(min_length=1, max_length=160, pattern=r'^[a-zA-Z0-9:_-]+$')
    introduction: str = Field(min_length=1, max_length=200)

    @model_validator(mode='after')
    def text_required(self):
        self.introduction = self.introduction.strip()
        if not self.introduction: raise ValueError('Introduction required')
        return self


class PresentationTask(Strict):
    """What to introduce. Navigation and visual behavior belong to the client."""
    items: list[PresentationItem] = Field(min_length=1, max_length=20)

    @model_validator(mode='after')
    def unique_targets(self):
        if len({item.target for item in self.items}) != len(self.items): raise ValueError('Duplicate targets')
        return self
