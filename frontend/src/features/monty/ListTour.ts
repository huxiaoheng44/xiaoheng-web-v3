import type { PresentationItem } from './MontyChat';

/** Presentation advances only while Monty is beside a visible item.
 * Clicking any member completes the whole tour, including members not yet presented.
 */
export class ListTour {
  private items: PresentationItem[] = [];
  private index = 0;
  private elapsed = 0;
  private previousTime: number | null = null;
  finishedPresenting = false;
  owner: string | null = null;

  start(items: PresentationItem[], owner: string | null) {
    this.cancel();
    this.items = items;
    this.owner = owner;
  }
  get active() { return this.items.length > 0; }
  get current() { return this.items[this.index]; }
  get position() { return `${this.index + 1}/${this.items.length}`; }
  contains(target: string) { return this.items.some(item => item.target === target); }
  pause() { this.previousTime = null; }
  tick(target: string, ready: boolean, now: number) {
    if (!this.active || target !== this.current.target || this.finishedPresenting) return false;
    if (!ready) { this.pause(); return false; }
    if (this.previousTime !== null) this.elapsed += Math.min(100, Math.max(0, now - this.previousTime));
    this.previousTime = now;
    const duration = Math.max(4500, Math.min(10000, this.current.introduction.length * 65));
    if (this.elapsed < duration) return false;
    if (this.index === this.items.length - 1) this.finishedPresenting = true;
    else this.index++;
    this.elapsed = 0;
    this.pause();
    return true;
  }
  cancel() {
    this.items = []; this.index = 0; this.elapsed = 0; this.previousTime = null;
    this.finishedPresenting = false; this.owner = null;
  }
}
