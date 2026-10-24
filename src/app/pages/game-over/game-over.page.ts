import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { ToastController } from '@ionic/angular/toast-controller';
import { addIcons } from 'ionicons';
import { refreshOutline, homeOutline, videocamOutline, shareOutline } from 'ionicons/icons';
import { Share } from '@capacitor/share';
import { WalletService } from '../../core/services/wallet.service';
import { AdsService } from '../../core/services/ads.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, TranslatePipe],
  templateUrl: './game-over.page.html',
  styleUrls: ['./game-over.page.scss'],
})
export class GameOverPage implements OnInit {
  wallet = inject(WalletService);
  i18n = inject(I18nService);
  private ads = inject(AdsService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  score = 0; coins = 0; newRecord = false;
  reviveAvailable = true;
  reviving = false;

  constructor() { addIcons({ refreshOutline, homeOutline, videocamOutline, shareOutline }); }

  ngOnInit() {
    const st = history.state as any;
    this.score     = st?.score ?? 0;
    this.coins     = st?.coins ?? 0;
    this.newRecord = !!st?.newRecord;
    this.ads.showBanner();
  }

  replay() { this.router.navigateByUrl('/game'); }
  home()   { this.ads.hideBanner(); this.router.navigateByUrl('/'); }

  async share() {
    try {
      await Share.share({
        title: 'SkyFallBall',
        text: this.i18n.t('share.text', { score: this.score, storeUrl: '' }),
        dialogTitle: this.i18n.t('share.dialog'),
      });
    } catch { /* user canceled or unavailable */ }
  }

  async revive() {
    this.reviving = true;
    const ok = await this.ads.showRewarded();
    this.reviving = false;
    if (ok) {
      this.reviveAvailable = false;
      this.ads.hideBanner();
      this.router.navigate(['/game'], {
        state: { revive: true, score: this.score, coins: this.coins }
      });
    } else {
      const t = await this.toastCtrl.create({
        message: this.i18n.t('gameOver.adUnavailable'),
        duration: 2000,
        position: 'top',
      });
      await t.present();
    }
  }
}
