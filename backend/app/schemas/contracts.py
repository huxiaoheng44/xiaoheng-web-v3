from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

PROJECTS = ['3d-reconstruction', 'drone-simulator', 'fast-ai-movie', 'vehicle-identification']
FOLDERS = ['projects', 'about', 'experience', 'contact']
TABS = ['profile', 'experience', 'education', 'skills', 'research']
NAV = {'openWindow', 'openProject', 'selectAboutTab', 'scrollToSection'}

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Target(Strict):
    id: str = Field(max_length=160, pattern=r'^[a-zA-Z0-9:_-]+$')
    label: str = Field(max_length=180)
    visible: bool
    rect: list[float] = Field(min_length=4, max_length=4)
    excerpt: str = Field(default='', max_length=500)

class PageContext(Strict):
    language: Literal['en', 'zh']
    contextVersion: int = Field(ge=0)
    activeWindow: str | None = Field(default=None, max_length=100)
    windows: list[str] = Field(default_factory=list, max_length=8)
    aboutTab: str = Field(default='profile', max_length=30)
    targets: list[Target] = Field(default_factory=list, max_length=100)

class Point(Strict):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    t: float = Field(ge=0)

class BehaviorEvent(Strict):
    type: Literal['click', 'hover', 'visit', 'scroll', 'visibility']
    target: str = Field(max_length=160)
    duration: float = Field(default=0, ge=0, le=7200000)
    value: float = Field(default=0, ge=0, le=1)

class Behavior(Strict):
    events: list[BehaviorEvent] = Field(default_factory=list, max_length=60)
    trajectory: list[Point] = Field(default_factory=list, max_length=20)
    idleSeconds: float = Field(default=0, ge=0, le=7200)

class ChatRequest(Strict):
    requestId: str = Field(min_length=8, max_length=80)
    message: str = Field(default='', max_length=4000)
    pageContext: PageContext
    companion: bool = False
    quiet: bool = False
    behavior: Behavior | None = None
    @model_validator(mode='after')
    def consent(self):
        if not self.companion:
            self.behavior = None
        return self

class Action(Strict):
    type: Literal['moveGhost', 'playGesture', 'highlightTarget', 'openWindow', 'openProject', 'selectAboutTab', 'scrollToSection', 'showHint']
    target: str = Field(default='', max_length=160, pattern=r'^[a-zA-Z0-9:_-]*$')
    value: str = Field(default='', max_length=200)
    @model_validator(mode='after')
    def allowed(self):
        if self.type == 'openWindow' and self.target not in FOLDERS: raise ValueError('Unknown folder')
        if self.type == 'openProject' and self.target not in PROJECTS: raise ValueError('Unknown project')
        if self.type == 'selectAboutTab' and self.target not in TABS: raise ValueError('Unknown About tab')
        if self.type == 'playGesture' and self.value not in ['idle','look','point','think','nod']: raise ValueError('Unknown gesture')
        if self.type == 'showHint' and not self.value.strip(): raise ValueError('Empty hint')
        return self

class ResumeRequest(Strict):
    requestId: str = Field(min_length=8, max_length=80)
    actionId: str = Field(max_length=80)
    approved: bool | None = None
    status: Literal['success', 'failed', 'cancelled'] | None = None
    detail: str = Field(default='', max_length=300)
    pageContext: PageContext
