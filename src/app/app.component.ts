import { Component } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
})
export class AppComponent {}
