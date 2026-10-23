import { Injectable, effect, inject } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { SettingsService } from './settings.service';

export type SoundName =
  | 'coin' | 'shield' | 'magnet' | 'bonus'
  | 'death' | 'revive' | 'win' | 'spin' | 'click'
  | 'combo' | 'perfectRun' | 'speedBrick';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private settings = inject(SettingsService);
  private ctx?: AudioContext;
  private bgm?: HTMLAudioElement;
  private bgmReady = false;

  private backgrounded = false;

  constructor() {
    effect(() => {
      const wantMusic = this.settings.music();
      if (!this.bgmReady) return;
      if (wantMusic && !this.backgrounded) this.playBgm(); else this.pauseBgm();
    });
    App.addListener('appStateChange', ({ isActive }) => {
      this.backgrounded = !isActive;
      if (!isActive) {
        this.pauseBgm();
        this.clearMediaSession();
      } else if (this.settings.music() && this.bgmReady) {
        this.playBgm();
      }
    }).catch(() => {});
    document.addEventListener('visibilitychange', () => {
      const hidden = document.visibilityState === 'hidden';
      this.backgrounded = hidden;
      if (hidden) {
        this.pauseBgm();
        this.clearMediaSession();
      } else if (this.settings.music() && this.bgmReady) {
        this.playBgm();
      }
    });
  }

  initBgm(): void {
    if (this.bgm) return;
    const a = new Audio('assets/audio/bgm.mp3');
    a.loop = true;
    a.volume = 0.20;
    a.preload = 'auto';
    this.bgm = a;
    this.bgmReady = true;
    if (this.settings.music() && !this.backgrounded) this.playBgm();
  }

  private playBgm(): void {
    if (!this.bgm) return;
    this.bgm.play().catch(() => {
      const resume = () => {
        this.bgm?.play().catch(() => {});
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    });
  }

  private pauseBgm(): void { this.bgm?.pause(); }

  private clearMediaSession(): void {
    try {
      if ('mediaSession' in navigator) {
        (navigator as any).mediaSession.playbackState = 'none';
        (navigator as any).mediaSession.metadata = null;
      }
    } catch { /* ignore */ }
  }

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
      case 'combo':      this.arpeggio(ctx, [440, 660, 880], 0.12, 'triangle'); break;
      case 'perfectRun': this.arpeggio(ctx, [523, 659, 784, 1047, 1319, 1760], 0.6, 'square'); break;
      case 'speedBrick': this.sweep(ctx, 440, 1760, 0.18, 'sawtooth'); break;
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

  async haptic(name: SoundName): Promise<void> {
    if (!this.settings.vibration()) return;
    switch (name) {
      case 'coin':
        await Haptics.selectionStart();
        break;
      case 'shield':
        await Haptics.impact({ style: ImpactStyle.Light });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 100);
        break;
      case 'magnet':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'bonus':
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 80);
        break;
      case 'speedBrick':
        await Haptics.impact({ style: ImpactStyle.Light });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 60);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 120);
        break;
      case 'death':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 150);
        break;
      case 'combo':
        await Haptics.impact({ style: ImpactStyle.Light });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 50);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 100);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 200);
        break;
      case 'perfectRun':
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            (navigator as any).vibrate([30, 50, 30, 50, 100]);
          } else {
            await Haptics.impact({ style: ImpactStyle.Heavy });
          }
        } catch { /* ignore */ }
        break;
      case 'revive':
      case 'win':
      case 'spin':
      case 'click':
        // no haptic for these
        break;
    }
  }
}
