import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { WalletService } from './wallet.service';
import { AdsService } from './ads.service';

const KEY = 'fdb_gift';
const DAY_MS = 24 * 3_600_000;
export const PRIZE_TABLE = [50, 100, 50, 200, 50, 100, 500, 100];

@Injectable({ providedIn: 'root' })
export class GiftService {
  readonly lastClaim = signal<number>(0);
  readonly canClaim = computed(() => Date.now() - this.lastClaim() >= DAY_MS);
  readonly msUntilNextClaim = computed(() =>
    Math.max(0, DAY_MS - (Date.now() - this.lastClaim())));

  private wallet = inject(WalletService);
  private ads    = inject(AdsService);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const d = JSON.parse(value);
      if (typeof d.lastClaim === 'number') this.lastClaim.set(d.lastClaim);
    } catch (e) { console.warn('GiftService.load failed', e); }
  }

  async save(): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify({ lastClaim: this.lastClaim() }) });
  }

  async spinWheel(): Promise<number> {
    const idx = Math.floor(Math.random() * PRIZE_TABLE.length);
    const prize = PRIZE_TABLE[idx];
    this.wallet.addCoins(prize);
    this.lastClaim.set(Date.now());
    await this.save();
    return prize;
  }

  async claimFreeGift(): Promise<number> {
    const ok = await this.ads.showRewarded();
    if (!ok) return 0;
    return this.spinWheel();
  }
}
