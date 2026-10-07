import type { PresentationState } from './MontyChat';
export type SemanticState = PresentationState;
export function interactionTransition(current:SemanticState, kind:'message'|'interaction'):SemanticState[]{
  if(current==='sleeping')return ['waking','idle'];
  if(current==='dozing'&&kind==='interaction')return ['observing'];
  return ['thinking'];
}
export function responseTransition(kind:'speech'|'guide'):SemanticState{return kind==='guide'?'guiding':'speaking';}
export function idleTransition(current:SemanticState,idleSeconds:number,dozeAfterSeconds=60,sleepAfterSeconds=120):SemanticState{if(current==='sleeping')return current;if(idleSeconds>=sleepAfterSeconds)return 'sleeping';return current==='idle'&&idleSeconds>=dozeAfterSeconds?'dozing':current;}
