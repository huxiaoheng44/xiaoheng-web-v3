from dataclasses import dataclass

@dataclass(frozen=True)
class ProactivePolicy:
    first_evaluation_seconds: int = 30
    cooldown_seconds: int = 90
    max_messages: int = 2
    max_unanswered: int = 2
    dwell_seconds: int = 5
    allow_light_invite: bool = True

DEFAULT_PROACTIVE_POLICY = ProactivePolicy()

@dataclass(frozen=True)
class ProactiveDecision:
    kind: str
    message: str = ''

def _has_interest(behavior):
    for event in reversed(behavior.events):
        if event.type == 'dwell' and event.duration >= 5: return event
        if event.type == 'click' and (event.projectId or event.tag): return event
        if event.type == 'visit' and event.target.startswith('project:'): return event
    return None

def decide_proactive(behavior, context, session, now, policy=DEFAULT_PROACTIVE_POLICY):
    if behavior.dnd or now-session.created < policy.first_evaluation_seconds: return ProactiveDecision('silent')
    if session.proactive_count >= policy.max_messages or session.unanswered_proactive >= policy.max_unanswered: return ProactiveDecision('silent')
    if session.spoke > -1e8 and now-session.spoke < policy.cooldown_seconds: return ProactiveDecision('silent')
    evidence = _has_interest(behavior)
    if evidence:
        target = next((target for target in context.targets if target.id == evidence.target), None)
        if target is None and evidence.projectId:
            target = next((target for target in context.targets if target.projectId == evidence.projectId and target.available), None)
        name = target.names.zh if target and behavior.locale == 'zh' else target.names.en if target else ('这个项目' if behavior.locale == 'zh' else 'this project')
        return ProactiveDecision('recommendation', f'想了解{name}的背景或关键成果吗？' if behavior.locale == 'zh' else f'Would you like a concise walkthrough of {name}?')
    if policy.allow_light_invite and not session.light_invite_sent:
        return ProactiveDecision('invite', '需要我帮你快速定位一个项目或经历吗？' if behavior.locale == 'zh' else 'Would you like a quick guide to a project or experience?')
    return ProactiveDecision('silent')
