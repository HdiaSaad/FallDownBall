import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [IonContent],
  template: '<ion-content>Settings</ion-content>',
})
export class SettingsPage {}
