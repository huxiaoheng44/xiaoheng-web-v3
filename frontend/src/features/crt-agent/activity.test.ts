import { expect, it } from 'vitest';
import { activitySummary } from './activity';
it('builds a user-facing activity summary without private or model fields',()=>{
 const summary=activitySummary('thinking',{route:'projects',window:'projects',activePanel:'collection',locale:'en',dnd:false,proactiveCount:0,idleSeconds:1,events:[{type:'dwell',target:'project-card:drone',projectId:'drone',duration:5}]},[{id:'project-card:drone',available:true,capabilities:['highlight','guideTo'],names:{en:'Drone',zh:'无人机'},projectId:'drone'}],['searchKnowledge','openWindow'],[{id:'s',title:'README',target:'',source:'repo',version:'1',sourceType:'github-source',url:'https://github.com/example/repo/blob/main/README.md'}]);
 expect(summary).toMatchObject({state:'thinking',observations:[{type:'dwell',target:'project-card:drone',projectId:'drone'}],tools:['searchKnowledge'],sources:[{title:'README'}]});
 expect(JSON.stringify(summary)).not.toMatch(/prompt|reasoning|token|clientX|clientY|trajectory|rect|selector|textContent|input/i);
});
