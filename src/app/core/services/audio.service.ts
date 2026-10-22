import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

export type SoundName =
  | 'coin' | 'shield' | 'magnet' | 'bonus'
  | 'death' | 'revive' | 'win' | 'spin' | 'click';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private settings = inject(SettingsService);
  private ctx?: AudioContext;

  private ensureCtx(): AudioContext | undefined {
    if (!this.ctx) {
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!Ctor) return undefined;
      try { this.ctx = new Ctor(); } catch { return undefined; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  play(name: SoundName): void {
    if (!this.settings.sound()) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    switch (name) {
      case 'coin':   this.arpeggio(ctx, [880, 1320], 0.08, 'square');    break;
      case 'shield': this.arpeggio(ctx, [440, 660, 880], 0.18, 'sine');  break;
      case 'magnet': this.arpeggio(ctx, [330, 440, 330, 550], 0.22, 'triangle'); break;
      case 'bonus':  this.arpeggio(ctx, [660, 880, 1100, 1320], 0.22, 'square'); break;
      case 'death':  this.sweep(ctx, 440, 80, 0.3, 'sawtooth');          break;
      case 'revive': this.sweep(ctx, 220, 880, 0.4, 'sine');             break;
      case 'win':    this.arpeggio(ctx, [523, 659, 784, 1047, 1319], 0.55, 'square'); break;
      case 'spin':   this.sweep(ctx, 110, 440, 0.25, 'triangle');        break;
      case 'click':  this.arpeggio(ctx, [660], 0.04, 'square');          break;
    }
  }

  private arpeggio(ctx: AudioContext, freqs: number[], dur: number, type: OscillatorType) {
    const step = dur / freqs.length;
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      const start = ctx.currentTime + i * step;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.15, start + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, start + step);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + step);
    });
  }

  private sweep(ctx: AudioContext, from: number, to: number, dur: number, type: OscillatorType) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), ctx.currentTime + dur);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
}
