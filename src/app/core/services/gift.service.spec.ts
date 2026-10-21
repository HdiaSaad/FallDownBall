import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { GiftService } from './gift.service';
import { WalletService } from './wallet.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { Preferences } from '@capacitor/preferences';

describe('GiftService', () => {
  let service: GiftService;
  let wallet: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    wallet  = TestBed.inject(WalletService);
    service = TestBed.inject(GiftService);
    (Preferences.get as any).mockResolvedValue({ value: null });
    (Preferences.set as any).mockResolvedValue(undefined);
  });

  it('canClaim is true by default (no previous claim)', () => {
    expect(service.canClaim()).toBe(true);
  });

  it('canClaim is false if lastClaim is within 24h', () => {
    service.lastClaim.set(Date.now() - 3_600_000); // 1h ago
    expect(service.canClaim()).toBe(false);
  });

  it('canClaim is true if lastClaim is older than 24h', () => {
    service.lastClaim.set(Date.now() - 25 * 3_600_000);
    expect(service.canClaim()).toBe(true);
  });

  it('spinWheel credits a prize from the table and sets lastClaim', async () => {
    const before = wallet.coins();
    const prize = await service.spinWheel();
    expect([50, 100, 200, 500]).toContain(prize);
    expect(wallet.coins()).toBe(before + prize);
    expect(service.canClaim()).toBe(false);
  });
});
