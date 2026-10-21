import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent],
  template: '<ion-content>Home</ion-content>',
})
export class HomePage {}
