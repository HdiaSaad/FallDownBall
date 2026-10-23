import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { AchievementService } from './achievement.service';
import { WalletService } from './wallet.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('AchievementService', () => {
  let svc: AchievementService;
  let wallet: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AchievementService, WalletService] });
    svc = TestBed.inject(AchievementService);
    wallet = TestBed.inject(WalletService);
  });

  it('unlocks first_blood on first run end', () => {
    const newly = svc.recordEvent({ runEnded: true });
    expect(newly).toContain('first_blood');
    expect(svc.unlocked().has('first_blood')).toBe(true);
  });

  it('does not re-unlock an already-unlocked achievement', () => {
    svc.recordEvent({ runEnded: true });
    const second = svc.recordEvent({ runEnded: true });
    expect(second).not.toContain('first_blood');
  });

  it('unlocks score_100 and score_500 together on big run', () => {
    const newly = svc.recordEvent({ score: 600 });
    expect(newly).toContain('score_100');
    expect(newly).toContain('score_500');
    expect(newly).not.toContain('score_1000');
  });

  it('awards reward coins per unlock', () => {
    const before = wallet.coins();
    svc.recordEvent({ score: 150 });
    expect(wallet.coins()).toBe(before + 50);
  });

  it('tracks shield saves cumulatively', () => {
    expect(svc.incrementShieldSave()).toBe(1);
    expect(svc.incrementShieldSave()).toBe(2);
    expect(svc.incrementShieldSave()).toBe(3);
    const newly = svc.recordEvent({ shieldSavedTotal: 3 });
    expect(newly).toContain('shield_saved');
  });
});
