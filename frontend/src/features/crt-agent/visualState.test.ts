import { expect, it } from 'vitest';
import { stateLabel, visualState } from './visualState';
it('gives waking a distinct accessible marker and reduced-motion fallback',()=>{
 expect(visualState('waking',false)).toEqual({marker:'crt-waking',wakingEffect:'waking-flash'});
 expect(visualState('thinking',false)).toEqual({marker:'crt-thinking',wakingEffect:'none'});
 expect(visualState('waking',true)).toEqual({marker:'crt-waking',wakingEffect:'waking-static'});
 expect(stateLabel('waking','zh')).toBe('已唤醒');
});
