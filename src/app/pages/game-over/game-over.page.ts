import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { refreshOutline, homeOutline, videocamOutline } from 'ionicons/icons';
import { WalletService } from '../../core/services/wallet.service';
import { AdsService } from '../../core/services/ads.service';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './game-over.page.html',
  styleUrls: ['./game-over.page.scss'],
})
export class GameOverPage implements OnInit {
  wallet = inject(WalletService);
  private ads = inject(AdsService);
  private router = inject(Router);
  score = 0; coins = 0; newRecord = false;
  reviveAvailable = true;
  reviving = false;

  constructor() { addIcons({ refreshOutline, homeOutline, videocamOutline }); }

  ngOnInit() {
    const st = history.state as any;
    this.score     = st?.score ?? 0;
    this.coins     = st?.coins ?? 0;
    this.newRecord = !!st?.newRecord;
    this.ads.showBanner();
  }

  replay() { this.router.navigateByUrl('/game'); }
  home()   { this.ads.hideBanner(); this.router.navigateByUrl('/'); }

  async revive() {
    this.reviving = true;
    const ok = await this.ads.showRewarded();
    this.reviving = false;
    if (ok) {
      this.reviveAvailable = false;
      this.ads.hideBanner();
      this.router.navigate(['/game'], { state: { revive: true } });
    }
  }
}
