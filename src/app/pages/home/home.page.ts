import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline } from 'ionicons/icons';
import { WalletService } from '../../core/services/wallet.service';
import { AdsService } from '../../core/services/ads.service';
import { AudioService } from '../../core/services/audio.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { MissionsPanelComponent } from './missions-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, RouterLink, TranslatePipe, MissionsPanelComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  wallet = inject(WalletService);
  private ads = inject(AdsService);
  private audio = inject(AudioService);
  private router = inject(Router);
  constructor() {
    addIcons({ settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline });
  }
  ngOnInit() { this.ads.showBanner(); this.audio.initBgm(); }
  ngOnDestroy() { this.ads.hideBanner(); }
  play() { this.router.navigateByUrl('/game'); }
}
