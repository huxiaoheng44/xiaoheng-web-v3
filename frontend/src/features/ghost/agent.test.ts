import { describe,it,expect } from 'vitest';
import { desktopReducer, projectIds } from '../../model';
import { parseGhostAction } from './GhostChat';
describe('agent boundaries',()=>{
 it('opens independent projects without duplicates',()=>{
  let state=projectIds.reduce((s,id)=>desktopReducer(s,{type:'open',id:`project:${id}`}),[] as ReturnType<typeof desktopReducer>);
  state=desktopReducer(state,{type:'open',id:'project:drone-simulator'});
  expect(state).toHaveLength(4);expect(state.at(-1)?.id).toBe('project:drone-simulator');
  state=desktopReducer(state,{type:'close',id:'project:drone-simulator'});expect(state).toHaveLength(3);
 });
 it('rejects code, URLs, invalid gestures and projects',()=>{
  expect(parseGhostAction({type:'moveGhost',target:'body > input',value:''})).toBeNull();
  expect(parseGhostAction({type:'openProject',target:'unknown',value:''})).toBeNull();
  expect(parseGhostAction({type:'playGesture',target:'',value:'execute'})).toBeNull();
  expect(parseGhostAction({type:'openProject',target:'drone-simulator',value:''})).not.toBeNull();
 });
});
