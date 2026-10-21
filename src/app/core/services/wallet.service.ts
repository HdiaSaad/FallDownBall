import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'fdb_wallet';

@Injectable({ providedIn: 'root' })
export class WalletService {
  readonly coins = signal(0);
  readonly best  = signal(0);
  readonly unlockedSkins = signal<Set<number>>(new Set([0]));
  readonly unlockedBgs   = signal<Set<number>>(new Set([0]));
  readonly equippedSkin  = signal(0);
  readonly equippedBg    = signal(0);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const d = JSON.parse(value);
      if (typeof d.coins === 'number') this.coins.set(d.coins);
      if (typeof d.best  === 'number') this.best.set(d.best);
      if (Array.isArray(d.unlockedSkins)) this.unlockedSkins.set(new Set(d.unlockedSkins));
      if (Array.isArray(d.unlockedBgs))   this.unlockedBgs.set(new Set(d.unlockedBgs));
      if (typeof d.equippedSkin === 'number') this.equippedSkin.set(d.equippedSkin);
      if (typeof d.equippedBg   === 'number') this.equippedBg.set(d.equippedBg);
    } catch (e) { console.warn('WalletService.load failed', e); }
  }

  async save(): Promise<void> {
    const data = {
      coins: this.coins(), best: this.best(),
      unlockedSkins: [...this.unlockedSkins()], unlockedBgs: [...this.unlockedBgs()],
      equippedSkin: this.equippedSkin(), equippedBg: this.equippedBg(),
    };
    await Preferences.set({ key: KEY, value: JSON.stringify(data) });
  }

  addCoins(n: number)  { this.coins.update(c => c + n); this.save(); }
  spendCoins(n: number): boolean {
    if (this.coins() < n) return false;
    this.coins.update(c => c - n);
    this.save();
    return true;
  }
  submitScore(s: number): { newRecord: boolean } {
    const newRecord = s > this.best();
    if (newRecord) { this.best.set(s); this.save(); }
    return { newRecord };
  }
  buySkin(id: number, price: number): boolean {
    if (!this.spendCoins(price)) return false;
    const set = new Set(this.unlockedSkins()); set.add(id); this.unlockedSkins.set(set);
    this.save();
    return true;
  }
  buyBg(id: number, price: number): boolean {
    if (!this.spendCoins(price)) return false;
    const set = new Set(this.unlockedBgs()); set.add(id); this.unlockedBgs.set(set);
    this.save();
    return true;
  }
  equipSkin(id: number) { if (this.unlockedSkins().has(id)) { this.equippedSkin.set(id); this.save(); } }
  equipBg(id: number)   { if (this.unlockedBgs().has(id))   { this.equippedBg.set(id);   this.save(); } }
}
