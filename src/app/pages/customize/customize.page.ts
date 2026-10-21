import { Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonIcon } from '@ionic/angular/ion-icon';
import { ToastController } from '@ionic/angular/toast-controller';
import { addIcons } from 'ionicons';
import { lockClosedOutline, checkmarkCircle } from 'ionicons/icons';
import { WalletService } from '../../core/services/wallet.service';

const SKINS = [
  { id: 0, color: '#ffd54f', price: 0 },
  { id: 1, color: '#ff6e6e', price: 100 },
  { id: 2, color: '#4fe3c1', price: 200 },
  { id: 3, color: '#b388ff', price: 300 },
  { id: 4, color: '#ffa94d', price: 500 },
];
const BGS = [
  { id: 0, name: 'Night',   gradient: 'linear-gradient(#0a0f1c, #1a1030)', price: 0 },
  { id: 1, name: 'Sunset',  gradient: 'linear-gradient(#2b1055, #ff4e50)', price: 150 },
  { id: 2, name: 'Ocean',   gradient: 'linear-gradient(#001f3f, #0074D9)', price: 250 },
];

@Component({
  selector: 'app-customize',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
            IonSegment, IonSegmentButton, IonLabel, IonIcon],
  templateUrl: './customize.page.html',
  styleUrls: ['./customize.page.scss'],
})
export class CustomizePage {
  wallet = inject(WalletService);
  private toastCtrl = inject(ToastController);
  tab: 'skin' | 'bg' = 'skin';
  skins = SKINS;
  bgs = BGS;

  constructor() { addIcons({ lockClosedOutline, checkmarkCircle }); }

  async tapSkin(s: typeof SKINS[number]) {
    const unlocked = this.wallet.unlockedSkins().has(s.id);
    if (unlocked) { this.wallet.equipSkin(s.id); return; }
    if (!this.wallet.buySkin(s.id, s.price)) {
      const t = await this.toastCtrl.create({ message: 'Not enough coins', duration: 1500, color: 'warning' });
      await t.present();
      return;
    }
    this.wallet.equipSkin(s.id);
  }

  async tapBg(b: typeof BGS[number]) {
    const unlocked = this.wallet.unlockedBgs().has(b.id);
    if (unlocked) { this.wallet.equipBg(b.id); return; }
    if (!this.wallet.buyBg(b.id, b.price)) {
      const t = await this.toastCtrl.create({ message: 'Not enough coins', duration: 1500, color: 'warning' });
      await t.present();
      return;
    }
    this.wallet.equipBg(b.id);
  }
}
