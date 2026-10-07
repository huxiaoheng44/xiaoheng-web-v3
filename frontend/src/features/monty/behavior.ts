import type { Behavior, BehaviorEvent, PageContext, Target } from './MontyChat';
export class BehaviorTracker {
  private events:Behavior['events']=[];
  private lastActivity=performance.now();private entered=performance.now();private hover='';private lastView='';private dwellRecorded=false;private meaningful=false;private pageActivity=false;
  constructor(private readonly context:()=>PageContext) {}
  private metadata(id:string){const target=this.context().targets.find(candidate=>candidate.id===id&&candidate.available);return target?{target:target.id,...(target.projectId?{projectId:target.projectId}:{}),...(target.tag?{tag:target.tag}:{})}:null;}
  private push(e:BehaviorEvent){this.events.push(e);this.events=this.events.slice(-60);if(e.type!=='visibility')this.meaningful=true;}
  private record(type:BehaviorEvent['type'],id:string,duration=0){const target=this.metadata(id);if(target)this.push({type,...target,duration});}
  hoverTarget=(e:PointerEvent)=>{const now=performance.now();this.lastActivity=now;this.pageActivity=true;const id=(e.target as Element).closest<HTMLElement>('[data-agent-id]')?.dataset.agentId||'';if(id!==this.hover){if(this.hover)this.record('hover',this.hover,(now-this.entered)/1000);this.hover=this.metadata(id)?.target||'';this.entered=now;this.dwellRecorded=false;}};
  click=(e:Event)=>{this.lastActivity=performance.now();this.pageActivity=true;const id=(e.target as Element).closest<HTMLElement>('[data-agent-id]')?.dataset.agentId||'';if(this.metadata(id))this.record('click',id);};
  visibility=()=>{this.entered=performance.now();this.hover='';this.dwellRecorded=false;this.events.push({type:'visibility',target:'page',duration:0});};
  attach(){document.addEventListener('pointerover',this.hoverTarget,{passive:true});document.addEventListener('click',this.click);document.addEventListener('visibilitychange',this.visibility);return()=>{document.removeEventListener('pointerover',this.hoverTarget);document.removeEventListener('click',this.click);document.removeEventListener('visibilitychange',this.visibility);};}
  tick(context:PageContext){if(document.hidden)return;const view=`${context.activeWindow||'desktop'}:${context.activePanel}`;if(view!==this.lastView){this.lastView=view;this.events.push({type:'visit',target:view,duration:0});this.meaningful=true;}const elapsed=(performance.now()-this.entered)/1000;if(this.hover&&!this.dwellRecorded&&elapsed>=5){this.record('dwell',this.hover,elapsed);this.dwellRecorded=true;}}
  consumeMeaningfulInteraction(){const value=this.meaningful;this.meaningful=false;return value;}
  consumePageActivity(){const value=this.pageActivity;this.pageActivity=false;return value;}
  snapshot({locale,dnd,proactiveCount}:{locale:PageContext['language'];dnd:boolean;proactiveCount:number}):Behavior{const context=this.context();const now=performance.now();const events=this.events.slice(-59);const hover=this.hover?this.metadata(this.hover):null;if(hover&&!document.hidden)events.push({type:'hover',...hover,duration:(now-this.entered)/1000});return {route:context.activeWindow||'desktop',window:context.activeWindow,activePanel:context.activePanel,locale,dnd,proactiveCount,events,idleSeconds:Math.min(7200,(now-this.lastActivity)/1000)};}
}
