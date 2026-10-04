import type { Behavior, PresentationType, Source, Target } from './CrtAgentChat';
import type { SemanticState } from './agentState';

export type ActivitySafeSummary = {
  state: SemanticState;
  observations: Array<{ type:string; target:string; projectId?:string; tag?:string }>;
  targets: Array<{ id:string; en:string; zh:string; capabilities:PresentationType[] }>;
  allowedActions: PresentationType[];
  tools: Array<'searchKnowledge'|'readKnowledge'|'present'>;
  sources: Array<{ title:string; url?:string; sourceType?:string }>;
};
const allowedActions:PresentationType[]=['speak','setState','highlight','guideTo','showHint','showRecommendation'];
export function activitySummary(state:SemanticState, behavior:Behavior|undefined, targets:Target[], tools:string[], sources:Source[]):ActivitySafeSummary {
  return {
    state,
    observations:(behavior?.events||[]).slice(-8).map(({type,target,projectId,tag})=>({type,target,...(projectId?{projectId}:{}),...(tag?{tag}:{})})),
    targets:targets.filter(target=>target.available).map(target=>({id:target.id,en:target.names.en,zh:target.names.zh,capabilities:target.capabilities})),
    allowedActions,
    tools:tools.filter((tool):tool is ActivitySafeSummary['tools'][number]=>tool==='searchKnowledge'||tool==='readKnowledge'||tool==='present').slice(-8),
    sources:sources.slice(-8).map(source=>({title:source.title,...(source.url?{url:source.url}:{}),...(source.sourceType?{sourceType:source.sourceType}:{})})),
  };
}
