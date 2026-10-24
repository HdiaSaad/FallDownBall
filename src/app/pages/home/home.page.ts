import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline, shareOutline } from 'ionicons/icons';
import { Share } from '@capacitor/share';
import { WalletService } from '../../core/services/wallet.service';
import { AudioService } from '../../core/services/audio.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { MissionsPanelComponent } from './missions-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, RouterLink, TranslatePipe, MissionsPanelComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  wallet = inject(WalletService);
  i18n = inject(I18nService);
  private audio = inject(AudioService);
  private router = inject(Router);
  constructor() {
    addIcons({ settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline, shareOutline });
  }
  ngOnInit() { this.audio.initBgm(); }
  play() { this.router.navigateByUrl('/game'); }

  async shareBest() {
    if (this.wallet.best() <= 0) return;
    try {
      await Share.share({
        title: 'SkyFallBall',
        text: this.i18n.t('share.textBest', { score: this.wallet.best(), storeUrl: '' }),
        dialogTitle: this.i18n.t('share.dialog'),
      });
    } catch { /* ignore */ }
  }
}
