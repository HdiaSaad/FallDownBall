import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { WalletService } from './wallet.service';
import {
  Mission, MISSION_TEMPLATES, rollDailyMissions, todayKey,
} from '../game/missions-catalog';

const KEY = 'fdb_missions';

export type MissionEventKind = 'run_end' | 'coin_run' | 'combo' | 'powerup' | 'survive_run';

interface State { dayKey: string; missions: Mission[]; streak: number; }

@Injectable({ providedIn: 'root' })
export class MissionsService {
  private wallet = inject(WalletService);
  readonly missions = signal<Mission[]>([]);
  readonly streak = signal(0);
  private dayKey = '';

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) {
        const d = JSON.parse(value) as State;
        this.dayKey = d.dayKey;
        this.missions.set(d.missions);
        this.streak.set(d.streak);
      }
    } catch (e) { console.warn('MissionsService.load failed', e); }
    this.refreshIfNewDay();
  }

  private refreshIfNewDay(): void {
    const today = todayKey();
    if (this.dayKey === today) return;
    const allClaimed = this.missions().length === 3 && this.missions().every(m => m.claimed);
    this.streak.set(allClaimed ? this.streak() + 1 : 0);
    this.dayKey = today;
    this.missions.set(rollDailyMissions());
    this.save();
  }

  recordEvent(kind: MissionEventKind, value: number = 1): void {
    this.refreshIfNewDay();
    const updated = this.missions().map(m => {
      if (m.claimed) return m;
      const match =
        (kind === 'run_end' && m.type === 'score_single' && value >= m.target) ? m.target :
        (kind === 'coin_run' && m.type === 'coins_single') ? Math.max(m.progress, value) :
        (kind === 'survive_run' && m.type === 'survive_single') ? Math.max(m.progress, value) :
        (kind === 'run_end' && m.type === 'runs_day') ? m.progress + 1 :
        (kind === 'combo' && m.type === 'combos_day') ? m.progress + 1 :
        (kind === 'powerup' && m.type === 'powerups_day') ? m.progress + 1 :
        null;
      if (match === null) return m;
      return { ...m, progress: Math.min(match, m.target) };
    });
    this.missions.set(updated);
    this.save();
  }

  claim(id: string): boolean {
    const m = this.missions().find(x => x.id === id);
    if (!m || m.claimed || m.progress < m.target) return false;
    this.wallet.addCoins(m.reward);
    this.missions.set(this.missions().map(x => x.id === id ? { ...x, claimed: true } : x));
    this.save();
    return true;
  }

  async save(): Promise<void> {
    const state: State = { dayKey: this.dayKey, missions: this.missions(), streak: this.streak() };
    await Preferences.set({ key: KEY, value: JSON.stringify(state) });
  }
}
