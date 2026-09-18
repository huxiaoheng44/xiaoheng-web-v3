import secrets
import time
from collections import deque
from dataclasses import dataclass, field
from fastapi import HTTPException
from ..core import config

@dataclass
class Session:
    token: str
    created: float=field(default_factory=time.monotonic)
    touched: float=field(default_factory=time.monotonic)
    messages: list=field(default_factory=list)
    rejected: list=field(default_factory=list)
    run: object=None
    requests: deque=field(default_factory=deque)
    seen: set=field(default_factory=set)
    evaluated: float=-1e9
    spoke: float=-1e9
    proactive_count: int=0

class Store:
    def __init__(self): self.sessions={}; self.calls=deque(); self.creates={}; self.ip_requests={}
    def sweep(self):
        now=time.monotonic()
        for token,s in list(self.sessions.items()):
            if now-s.touched>1800 or now-s.created>7200:
                if s.run: s.run.cancelled=True
                del self.sessions[token]
        for ip, times in list(self.creates.items()):
            while times and now-times[0]>60: times.popleft()
            if not times: del self.creates[ip]
        for ip,times in list(self.ip_requests.items()):
            while times and now-times[0]>60: times.popleft()
            if not times: del self.ip_requests[ip]
    def limit_ip(self,ip):
        now=time.monotonic(); times=self.ip_requests.setdefault(ip,deque())
        while times and now-times[0]>60: times.popleft()
        if len(times)>=config.IP_LIMIT: return False
        times.append(now); return True
    def create(self, ip):
        self.sweep(); now=time.monotonic()
        times=self.creates.setdefault(ip,deque())
        if len(times)>=10 or len(self.sessions)>=config.SESSION_LIMIT: raise HTTPException(429,'Session limit reached')
        times.append(now)
        token=secrets.token_urlsafe(32); s=Session(token); self.sessions[token]=s; return s
    def get(self, authorization):
        self.sweep()
        token=(authorization or '').removeprefix('Bearer ')
        s=self.sessions.get(token)
        if not s: raise HTTPException(401,'Session expired. Start a new session. / 会话已过期。')
        s.touched=time.monotonic(); return s
    def limit(self,s,request_id):
        now=time.monotonic()
        while s.requests and now-s.requests[0]>60: s.requests.popleft()
        if len(s.requests)>=config.REQUEST_LIMIT: raise HTTPException(429,'Please slow down / 请求过于频繁')
        if request_id in s.seen: raise HTTPException(409,'Duplicate request; actions will not be replayed')
        s.requests.append(now); s.seen.add(request_id)
        if len(s.seen)>2000: raise HTTPException(429,'Session request limit reached')
    def spend(self):
        now=time.monotonic()
        while self.calls and now-self.calls[0]>3600: self.calls.popleft()
        if len(self.calls)>=config.GLOBAL_LIMIT: raise RuntimeError('Agent usage limit reached / 服务用量已达上限')
        self.calls.append(now)
