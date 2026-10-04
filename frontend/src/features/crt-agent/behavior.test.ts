import {it,expect,vi,afterEach} from 'vitest';
import {BehaviorTracker} from './behavior';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('captures only registered semantic target events without private fields',()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.stubGlobal('document',{hidden:false});
 const context={language:'en' as const,contextVersion:0,activeWindow:'projects',activePanel:'collection',windows:['projects'],aboutTab:'profile',targets:[{id:'project-card:drone-simulator',available:true,capabilities:['highlight','guideTo'] as Array<'highlight'|'guideTo'>,names:{en:'Drone Simulator',zh:'无人机仿真与控制'},projectId:'drone-simulator'}]};
 const tracker=new BehaviorTracker(()=>context);
 tracker.hoverTarget({target:{closest:()=>({dataset:{agentId:'folder:projects'}})}} as unknown as PointerEvent);
 tracker.hoverTarget({target:{closest:()=>({dataset:{agentId:'project-card:drone-simulator'}})}} as unknown as PointerEvent);
 now=5_000;tracker.tick(context);
 const snapshot=tracker.snapshot({locale:'en',dnd:false,proactiveCount:0});
 expect(snapshot.events.at(-1)?.type).toBe('hover');
 expect(snapshot.events.some(event=>event.type==='dwell'&&event.projectId==='drone-simulator')).toBe(true);
 expect(snapshot).toMatchObject({route:'projects',window:'projects',activePanel:'collection',locale:'en',dnd:false,proactiveCount:0});
 expect(snapshot).not.toHaveProperty('trajectory');
 expect(JSON.stringify(snapshot)).not.toMatch(/clientX|clientY|coordinates|rect|selector|textContent|path/);
});
