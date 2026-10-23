import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { WalletService } from './wallet.service';
import { ACHIEVEMENTS, AchievementTrigger } from '../game/achievement-catalog';

const KEY = 'fdb_achievements';

export interface AchievementSignal {
  score?: number;
  coinsThisRun?: number;
  wooowFired?: boolean;
  comboSteps?: number;
  shieldSavedTotal?: number;
  dailyStreak?: number;
  runEnded?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private wallet = inject(WalletService);
  readonly unlocked = signal<Set<string>>(new Set());
  readonly progress = signal<Record<string, number>>({});

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const d = JSON.parse(value);
      if (Array.isArray(d.unlocked)) this.unlocked.set(new Set(d.unlocked));
      if (d.progress && typeof d.progress === 'object') this.progress.set(d.progress);
    } catch (e) { console.warn('AchievementService.load failed', e); }
  }

  async save(): Promise<void> {
    await Preferences.set({
      key: KEY,
      value: JSON.stringify({ unlocked: [...this.unlocked()], progress: this.progress() }),
    });
  }

  recordEvent(sig: AchievementSignal): string[] {
    const newly: string[] = [];
    const unlocked = new Set(this.unlocked());
    const progress = { ...this.progress() };

    for (const def of ACHIEVEMENTS) {
      if (unlocked.has(def.id)) continue;
      if (this.triggerMatches(def.trigger, sig, progress)) {
        unlocked.add(def.id);
        newly.push(def.id);
        this.wallet.addCoins(def.reward);
      }
    }

    if (newly.length) {
      this.unlocked.set(unlocked);
      this.progress.set(progress);
      this.save();
    }
    return newly;
  }

  incrementShieldSave(): number {
    const p = { ...this.progress() };
    p['shield_saved'] = (p['shield_saved'] ?? 0) + 1;
    this.progress.set(p);
    this.save();
    return p['shield_saved'];
  }

  private triggerMatches(
    t: AchievementTrigger,
    s: AchievementSignal,
    progress: Record<string, number>,
  ): boolean {
    switch (t.kind) {
      case 'first_run_ended':        return !!s.runEnded;
      case 'score_run':              return (s.score ?? 0) >= t.min;
      case 'coins_run':              return (s.coinsThisRun ?? 0) >= t.min;
      case 'coins_lifetime':         return this.wallet.coins() >= t.min;
      case 'shield_saved_lifetime':  return (s.shieldSavedTotal ?? progress['shield_saved'] ?? 0) >= t.min;
      case 'first_wooow':            return !!s.wooowFired;
      case 'combo_steps':            return (s.comboSteps ?? 0) >= t.min;
      case 'all_skins_unlocked':     return this.wallet.unlockedSkins().size >= t.totalSkins;
      case 'daily_streak':           return (s.dailyStreak ?? 0) >= t.min;
    }
  }
}
