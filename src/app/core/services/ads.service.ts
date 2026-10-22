import { Injectable } from '@angular/core';
import {
  AdMob, AdMobBannerSize, BannerAdOptions, BannerAdPosition, BannerAdSize,
  AdOptions, RewardAdOptions, AdMobRewardItem
} from '@capacitor-community/admob';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private isIPad = false;
  private gameOverCount = 0;

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const info = await Device.getInfo();
    this.isIPad = info.model.toLowerCase().includes('ipad');
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: true,
    } as any);
    try {
      const tracking = await AdMob.trackingAuthorizationStatus();
      if (tracking.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }
    } catch (e) { console.warn('ATT request failed', e); }
    this.initialized = true;
  }

  async showBanner(): Promise<void> {
    if (!this.initialized) return;
    const opts: BannerAdOptions = {
      adId: environment.admob.banner,
      adSize: this.isIPad ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 36,
      isTesting: true,
    };
    try { await AdMob.showBanner(opts); console.log('[ads] banner shown'); }
    catch (e) { console.warn('showBanner failed', e); }
  }

  async hideBanner(): Promise<void> {
    if (!this.initialized) return;
    try { await AdMob.hideBanner(); } catch {}
  }

  async showInterstitial(): Promise<void> {
    if (!this.initialized) return;
    this.gameOverCount = (this.gameOverCount + 1) % 3;
    if (this.gameOverCount !== 0) return;
    try {
      const opts: AdOptions = { adId: environment.admob.interstitial, isTesting: true };
      await AdMob.prepareInterstitial(opts);
      await AdMob.showInterstitial();
    } catch (e) { console.warn('showInterstitial failed', e); }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      const opts: RewardAdOptions = { adId: environment.admob.rewarded, isTesting: true };
      await Promise.race([
        AdMob.prepareRewardVideoAd(opts),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 10000)),
      ]);
      const item: AdMobRewardItem = await AdMob.showRewardVideoAd();
      return !!item;
    } catch (e) {
      console.warn('showRewarded failed/timeout', e);
      return false;
    }
  }
}
