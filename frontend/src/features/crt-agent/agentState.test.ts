import { describe, expect, it } from 'vitest';
import { idleTransition, interactionTransition, responseTransition } from './agentState';
describe('state semantics',()=>{
 it('does not wake a dozing agent for an explicit user message',()=>expect(interactionTransition('dozing','message')).toEqual(['thinking']));
 it('keeps dozing page interaction out of waking',()=>expect(interactionTransition('dozing','interaction')).toEqual(['observing']));
 it('wakes then returns to idle after sleep and idles through dozing to sleeping',()=>{expect(interactionTransition('sleeping','message')).toEqual(['waking','idle']);expect(idleTransition('idle',59)).toBe('idle');expect(idleTransition('idle',60)).toBe('dozing');expect(idleTransition('dozing',120)).toBe('sleeping');expect(responseTransition('guide')).toBe('guiding');});
 it('does not wake an awake agent for a direct question',()=>expect(interactionTransition('idle','message')).toEqual(['thinking']));
});
