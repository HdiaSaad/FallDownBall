import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton,
            IonButtons, IonList, IonItem, IonLabel, IonToggle, IonRadioGroup, IonRadio],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  settings = inject(SettingsService);

  async update<K extends 'sound'|'music'|'vibration'|'controlMode'>(key: K, value: any) {
    (this.settings[key] as any).set(value);
    await this.settings.save();
  }
}
