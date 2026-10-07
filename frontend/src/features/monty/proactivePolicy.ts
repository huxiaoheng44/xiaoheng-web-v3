import type { Behavior, Target } from './MontyChat';

export const DEFAULT_PROACTIVE_POLICY = { firstEvaluationMs: 30_000, cooldownMs: 90_000, maxMessages: 2, maxUnanswered: 2, dwellSeconds: 5, allowLightInvite: true } as const;
export type ProactivePolicy = typeof DEFAULT_PROACTIVE_POLICY;
export type ProactiveSession = { startedAt: number; lastMessageAt: number | null; proactiveCount: number; unanswered: number; lightInviteUsed: boolean };
export type ProactiveDecision = { kind: 'silent' } | { kind: 'invite'|'recommendation'; message: string };

function localized(locale:'en'|'zh', kind:'invite'|'recommendation', target?:Target):string {
  const name=target?.names[locale];
  if(kind==='invite')return locale==='zh'?'需要我帮你快速定位一个项目或经历吗？':'Would you like a quick guide to a project or experience?';
  return locale==='zh'?`想了解${name||'这个项目'}的背景或关键成果吗？`:`Would you like a concise walkthrough of ${name||'this project'}?`;
}
export function decideProactive(behavior:Behavior, targets:Target[], session:ProactiveSession, now:number, policy:ProactivePolicy=DEFAULT_PROACTIVE_POLICY):ProactiveDecision {
  if(behavior.dnd||now-session.startedAt<policy.firstEvaluationMs||session.proactiveCount>=policy.maxMessages||session.unanswered>=policy.maxUnanswered)return {kind:'silent'};
  if(session.lastMessageAt!==null&&now-session.lastMessageAt<policy.cooldownMs)return {kind:'silent'};
  const evidence=behavior.events.slice().reverse().find(event=>event.type==='dwell'&&event.duration>=policy.dwellSeconds||event.type==='click'&&(Boolean(event.projectId)||Boolean(event.tag))||event.type==='visit'&&event.target.startsWith('project:'));
  if(evidence){const target=targets.find(candidate=>candidate.id===evidence.target)||targets.find(candidate=>candidate.projectId===evidence.projectId&&candidate.available);return {kind:'recommendation',message:localized(behavior.locale,'recommendation',target)};}
  if(policy.allowLightInvite&&!session.lightInviteUsed)return {kind:'invite',message:localized(behavior.locale,'invite')};
  return {kind:'silent'};
}
