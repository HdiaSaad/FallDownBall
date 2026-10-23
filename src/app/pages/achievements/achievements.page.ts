import { Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { trophy, lockClosedOutline, checkmarkCircle } from 'ionicons/icons';
import { AchievementService } from '../../core/services/achievement.service';
import { ACHIEVEMENTS } from '../../core/game/achievement-catalog';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, TranslatePipe],
  templateUrl: './achievements.page.html',
  styleUrls: ['./achievements.page.scss'],
})
export class AchievementsPage {
  achievements = inject(AchievementService);
  items = ACHIEVEMENTS;

  constructor() { addIcons({ trophy, lockClosedOutline, checkmarkCircle }); }

  isUnlocked(id: string): boolean { return this.achievements.unlocked().has(id); }
}
