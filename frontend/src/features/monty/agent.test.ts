import { describe,it,expect } from 'vitest';
import { desktopReducer, projectIds } from '../../model';
import { detectMessageLocale, parsePresentationInstruction, validatePresentationForContext } from './MontyChat';
describe('agent boundaries',()=>{
 it('opens independent projects without duplicates',()=>{
  let state=projectIds.reduce((s,id)=>desktopReducer(s,{type:'open',id:`project:${id}`}),[] as ReturnType<typeof desktopReducer>);
  state=desktopReducer(state,{type:'open',id:'project:drone-simulator'});
  expect(state).toHaveLength(projectIds.length);expect(state.at(-1)?.id).toBe('project:drone-simulator');
  state=desktopReducer(state,{type:'close',id:'project:drone-simulator'});expect(state).toHaveLength(projectIds.length-1);
 });
 it('rejects browser control and malformed display instructions',()=>{
  expect(detectMessageLocale('请介绍这个项目')).toBe('zh');expect(detectMessageLocale('Tell me about this project')).toBe('en');
  expect(parsePresentationInstruction({type:'guideTo',target:'body > input',value:''})).toBeNull();
  expect(parsePresentationInstruction({type:'openProject',target:'drone-simulator',value:''})).toBeNull();
  expect(parsePresentationInstruction({type:'setState',target:'',value:'execute'})).toBeNull();
  expect(parsePresentationInstruction({type:'guideTo',target:'project-card:drone-simulator',value:''})).not.toBeNull();
 });
 it('rejects unavailable targets with an activity-safe reason',()=>{
  const targets=[{id:'folder:projects',available:false as const,capabilities:['highlight','guideTo'] as Array<'highlight'|'guideTo'>,names:{en:'Projects',zh:'项目'}}];
  expect(validatePresentationForContext({type:'highlight',target:'folder:projects',value:''},targets)).toEqual({instruction:null,reason:'target-unavailable'});
  expect(validatePresentationForContext({type:'openWindow',target:'about',value:''},targets)).toEqual({instruction:null,reason:'malformed-or-unknown'});
 });
});
