import type { SemanticState } from './agentState';

export function visualState(state:SemanticState,reduced:boolean){
  return { marker:`crt-${state}`, wakingEffect:state==='waking'?(reduced?'waking-static':'waking-flash'):'none' };
}
export function stateLabel(state:SemanticState,language:'en'|'zh'){return language==='zh'?({idle:'空闲',observing:'观察中',thinking:'思考中',speaking:'回复中',guiding:'引导中',dozing:'打盹',sleeping:'休眠',waking:'已唤醒'}[state]):state;}
