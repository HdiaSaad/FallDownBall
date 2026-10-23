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
import { lockClosedOutline, checkmarkCircle, flameOutline, colorPaletteOutline, trophyOutline } from 'ionicons/icons';
import { WalletService } from '../../core/services/wallet.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { SKINS, BGS, SkinDef, BgDef } from '../../core/game/catalog';

@Component({
  selector: 'app-customize',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
            IonSegment, IonSegmentButton, IonLabel, IonIcon, TranslatePipe],
  templateUrl: './customize.page.html',
  styleUrls: ['./customize.page.scss'],
})
export class CustomizePage {
  wallet = inject(WalletService);
  i18n = inject(I18nService);
  private toastCtrl = inject(ToastController);
  tab: 'skin' | 'bg' = 'skin';
  skins = SKINS;
  bgs = BGS;

  constructor() { addIcons({ lockClosedOutline, checkmarkCircle, flameOutline, colorPaletteOutline, trophyOutline }); }

  scoreLocked(req: number): boolean { return this.wallet.best() < req; }

  async tapSkin(s: SkinDef) {
    const unlocked = this.wallet.unlockedSkins().has(s.id);
    if (unlocked) { this.wallet.equipSkin(s.id); return; }
    if (this.scoreLocked(s.requiredScore)) {
      const t = await this.toastCtrl.create({
        message: this.i18n.t('shop.needScore', { n: s.requiredScore }),
        duration: 1800, color: 'warning',
      });
      await t.present();
      return;
    }
    if (!this.wallet.buySkin(s.id, s.price)) {
      const t = await this.toastCtrl.create({ message: this.i18n.t('shop.notEnough'), duration: 1500, color: 'warning' });
      await t.present();
      return;
    }
    this.wallet.equipSkin(s.id);
  }

  async tapBg(b: BgDef) {
    const unlocked = this.wallet.unlockedBgs().has(b.id);
    if (unlocked) { this.wallet.equipBg(b.id); return; }
    if (this.scoreLocked(b.requiredScore)) {
      const t = await this.toastCtrl.create({
        message: this.i18n.t('shop.needScore', { n: b.requiredScore }),
        duration: 1800, color: 'warning',
      });
      await t.present();
      return;
    }
    if (!this.wallet.buyBg(b.id, b.price)) {
      const t = await this.toastCtrl.create({ message: this.i18n.t('shop.notEnough'), duration: 1500, color: 'warning' });
      await t.present();
      return;
    }
    this.wallet.equipBg(b.id);
  }
}
