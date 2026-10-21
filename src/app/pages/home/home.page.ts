import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline } from 'ionicons/icons';
import { WalletService } from '../../core/services/wallet.service';
import { AdsService } from '../../core/services/ads.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, RouterLink],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  wallet = inject(WalletService);
  private ads = inject(AdsService);
  private router = inject(Router);
  constructor() {
    addIcons({ settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline });
  }
  ngOnInit() { this.ads.showBanner(); }
  ngOnDestroy() { this.ads.hideBanner(); }
  play() { this.router.navigateByUrl('/game'); }
}
