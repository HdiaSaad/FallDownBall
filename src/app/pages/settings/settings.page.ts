import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonList } from '@ionic/angular/ion-list';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonRadioGroup } from '@ionic/angular/ion-radio-group';
import { IonRadio } from '@ionic/angular/ion-radio';
import { SettingsService } from '../../core/services/settings.service';
import { TutorialService } from '../../core/services/tutorial.service';
import { I18nService, Locale } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton,
            IonButtons, IonList, IonItem, IonLabel, IonToggle, IonRadioGroup, IonRadio, TranslatePipe],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  settings = inject(SettingsService);
  tutorial = inject(TutorialService);
  i18n = inject(I18nService);
  private router = inject(Router);

  async update<K extends 'sound'|'music'|'vibration'>(key: K, value: any) {
    (this.settings[key] as any).set(value);
    await this.settings.save();
  }

  async setLocale(l: Locale) { await this.i18n.setLocale(l); }

  async replayTutorial() {
    await this.tutorial.resetForReplay();
    this.router.navigateByUrl('/game');
  }
}
