import {it,expect,vi,afterEach} from 'vitest';
import {BehaviorTracker} from './behavior';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('bounds pointer sampling, history, coordinates and sends no typed text',()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.stubGlobal('innerWidth',100);vi.stubGlobal('innerHeight',100);vi.stubGlobal('document',{hidden:false});
 const tracker=new BehaviorTracker();
 for(let i=0;i<4000;i++){now=i*10;tracker.pointer({clientX:150,clientY:-2,target:{closest:()=>({dataset:{agentId:'folder:projects'}})}} as unknown as PointerEvent);}
 const snapshot=tracker.snapshot();expect(snapshot.trajectory.length).toBeLessThanOrEqual(20);
 expect(snapshot.trajectory.every(p=>p.x===1&&p.y===0&&now-p.t<=30000)).toBe(true);
 expect(snapshot.events.at(-1)?.type).toBe('hover');
 expect(JSON.stringify(snapshot)).not.toContain('text');
});
