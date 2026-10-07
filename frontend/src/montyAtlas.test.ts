import { expect, it } from 'vitest';
import atlas from '../public/assets/monty.json';
import { animationName } from './MontyOverlay';
it('maps renamed Monty sequences to their semantic states',()=>{
 expect(atlas.canvas).toEqual({width:64,height:64});expect(atlas.sheet).toMatchObject({width:576,height:896,columns:9});
 expect(atlas.animations.dozing).toMatchObject({fps:6,loop:true});expect(atlas.animations.dozing.frames).toHaveLength(8);
 expect(atlas.animations.sleep).toMatchObject({fps:6,loop:false});expect(atlas.animations.sleep.frames).toHaveLength(10);
 expect(atlas.animations.awake.frames).toHaveLength(9);expect(atlas.animations.idle.frames).toHaveLength(9);expect(atlas.animations.scan.frames).toHaveLength(9);expect(atlas.frames.every(frame=>frame.w===64&&frame.h===64)).toBe(true);
 expect(animationName('idle',false,false,false,'dozing')).toBe('dozing');expect(animationName('idle',false,false,false,'sleeping')).toBe('sleep');expect(animationName('look',false,false,false,'thinking')).toBe('idle');expect(animationName('look',false,false,true,'thinking')).toBe('scan');
});
