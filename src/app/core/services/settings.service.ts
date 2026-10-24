import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'fdb_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly sound     = signal(true);
  readonly music     = signal(true);
  readonly vibration = signal(true);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const data = JSON.parse(value);
      if (typeof data.sound === 'boolean')     this.sound.set(data.sound);
      if (typeof data.music === 'boolean')     this.music.set(data.music);
      if (typeof data.vibration === 'boolean') this.vibration.set(data.vibration);
    } catch (e) { console.warn('SettingsService.load failed, using defaults', e); }
  }

  async save(): Promise<void> {
    const data = {
      sound: this.sound(), music: this.music(), vibration: this.vibration()
    };
    await Preferences.set({ key: KEY, value: JSON.stringify(data) });
  }
}
