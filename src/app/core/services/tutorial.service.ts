import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'fdb_tutorial_done';

@Injectable({ providedIn: 'root' })
export class TutorialService {
  readonly step = signal(0);     // 0 = inactive, 1..4 = steps, 5 = done this run
  readonly active = signal(false);
  private done = false;

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      this.done = value === 'true';
    } catch { this.done = false; }
  }

  async markDone(): Promise<void> {
    this.done = true;
    this.active.set(false);
    this.step.set(0);
    await Preferences.set({ key: KEY, value: 'true' });
  }

  async resetForReplay(): Promise<void> {
    this.done = false;
    await Preferences.remove({ key: KEY });
  }

  shouldLaunch(): boolean { return !this.done; }

  start(): void {
    this.active.set(true);
    this.step.set(1);
  }

  advanceStep(): void {
    const next = this.step() + 1;
    if (next > 4) { this.markDone(); return; }
    this.step.set(next);
  }

  skip(): Promise<void> { return this.markDone(); }
}
