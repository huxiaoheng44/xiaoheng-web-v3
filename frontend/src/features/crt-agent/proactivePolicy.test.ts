import { describe, expect, it } from 'vitest';
import { DEFAULT_PROACTIVE_POLICY, decideProactive } from './proactivePolicy';
import type { Behavior, Target } from './CrtAgentChat';
const target:Target={id:'project:drone-simulator',available:true,capabilities:['highlight','guideTo'],names:{en:'Drone Simulator',zh:'无人机仿真与控制'},projectId:'drone-simulator'};
const base=(events:Behavior['events']=[]):Behavior=>({route:'projects',window:'projects',activePanel:'collection',locale:'en',dnd:false,proactiveCount:0,events,idleSeconds:1});
const session={startedAt:0,lastMessageAt:null,proactiveCount:0,unanswered:0,lightInviteUsed:false};
describe('proactive policy',()=>{
 it('stays silent without evidence after the one localized light invitation',()=>{
  expect(decideProactive(base(),[target],session,30_000)).toMatchObject({kind:'invite'});
  expect(decideProactive(base(),[target],{...session,lightInviteUsed:true},30_000)).toEqual({kind:'silent'});
 });
 it('recommends only after explicit project interest and localizes the target name',()=>{
  const behavior=base([{type:'dwell',target:target.id,projectId:'drone-simulator',duration:5}]);behavior.locale='zh';
  expect(decideProactive(behavior,[target],session,30_000)).toEqual({kind:'recommendation',message:'想了解无人机仿真与控制的背景或关键成果吗？'});
 });
 it('enforces first-evaluation, cooldown, budget, unanswered, and DND gates',()=>{
  const interested=base([{type:'click',target:'project:drone-simulator:tag:px4',projectId:'drone-simulator',tag:'PX4',duration:0}]);
  expect(decideProactive(interested,[target],session,29_999)).toEqual({kind:'silent'});
  expect(decideProactive(interested,[target],{...session,lastMessageAt:0},30_000)).toEqual({kind:'silent'});
  expect(decideProactive(interested,[target],{...session,proactiveCount:DEFAULT_PROACTIVE_POLICY.maxMessages},120_000)).toEqual({kind:'silent'});
  expect(decideProactive(interested,[target],{...session,unanswered:2},120_000)).toEqual({kind:'silent'});
  interested.dnd=true;expect(decideProactive(interested,[target],session,120_000)).toEqual({kind:'silent'});
 });
});
