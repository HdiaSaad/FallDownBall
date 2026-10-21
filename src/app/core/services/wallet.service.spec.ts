import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { WalletService } from './wallet.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { Preferences } from '@capacitor/preferences';

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletService);
    (Preferences.get as any).mockResolvedValue({ value: null });
    (Preferences.set as any).mockResolvedValue(undefined);
  });

  it('defaults: coins=0, best=0, skin 0 unlocked + equipped', () => {
    expect(service.coins()).toBe(0);
    expect(service.best()).toBe(0);
    expect(service.unlockedSkins().has(0)).toBe(true);
    expect(service.equippedSkin()).toBe(0);
  });

  it('addCoins increments', () => {
    service.addCoins(50);
    expect(service.coins()).toBe(50);
  });

  it('spendCoins returns false if insufficient', () => {
    expect(service.spendCoins(10)).toBe(false);
    expect(service.coins()).toBe(0);
  });

  it('spendCoins returns true and debits when sufficient', () => {
    service.addCoins(100);
    expect(service.spendCoins(30)).toBe(true);
    expect(service.coins()).toBe(70);
  });

  it('submitScore returns newRecord=true on higher score', () => {
    const r = service.submitScore(42);
    expect(r.newRecord).toBe(true);
    expect(service.best()).toBe(42);
  });

  it('submitScore returns newRecord=false on lower score', () => {
    service.submitScore(100);
    const r = service.submitScore(50);
    expect(r.newRecord).toBe(false);
    expect(service.best()).toBe(100);
  });

  it('buySkin unlocks and debits when affordable', () => {
    service.addCoins(200);
    expect(service.buySkin(1, 100)).toBe(true);
    expect(service.unlockedSkins().has(1)).toBe(true);
    expect(service.coins()).toBe(100);
  });

  it('buySkin fails when unaffordable, no debit', () => {
    expect(service.buySkin(1, 100)).toBe(false);
    expect(service.unlockedSkins().has(1)).toBe(false);
    expect(service.coins()).toBe(0);
  });

  it('equipSkin only equips if unlocked', () => {
    service.equipSkin(5);  // not unlocked
    expect(service.equippedSkin()).toBe(0);
    service.addCoins(100); service.buySkin(5, 100);
    service.equipSkin(5);
    expect(service.equippedSkin()).toBe(5);
  });
});
