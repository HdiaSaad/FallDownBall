import { TestBed } from '@angular/core/testing';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { SettingsService } from './settings.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { Preferences } from '@capacitor/preferences';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
    (Preferences.get as any).mockResolvedValue({ value: null });
    (Preferences.set as any).mockResolvedValue(undefined);
  });

  it('defaults to sound=true, music=true, vibration=true, controlMode=touch', () => {
    expect(service.sound()).toBe(true);
    expect(service.music()).toBe(true);
    expect(service.vibration()).toBe(true);
    expect(service.controlMode()).toBe('touch');
  });

  it('load() restores from Preferences', async () => {
    (Preferences.get as any).mockResolvedValue({
      value: JSON.stringify({ sound: false, music: true, vibration: false, controlMode: 'tilt' })
    });
    await service.load();
    expect(service.sound()).toBe(false);
    expect(service.vibration()).toBe(false);
    expect(service.controlMode()).toBe('tilt');
  });

  it('save() writes JSON to Preferences', async () => {
    service.sound.set(false);
    await service.save();
    expect(Preferences.set as any).toHaveBeenCalledWith(expect.objectContaining({
      key: 'fdb_settings'
    }));
  });
});
