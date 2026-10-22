import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/provide';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { routes } from './app.routes';
import { SettingsService } from './core/services/settings.service';
import { WalletService } from './core/services/wallet.service';
import { GiftService } from './core/services/gift.service';
import { AdsService } from './core/services/ads.service';

export function initAll() {
  return async () => {
    const settings = inject(SettingsService);
    const wallet   = inject(WalletService);
    const gift     = inject(GiftService);
    const ads      = inject(AdsService);
    await Promise.all([settings.load(), wallet.load(), gift.load()]);
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
      } catch {}
      await ads.init();
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideIonicAngular({ mode: 'ios' }),
    { provide: APP_INITIALIZER, useFactory: initAll, multi: true },
  ],
};
