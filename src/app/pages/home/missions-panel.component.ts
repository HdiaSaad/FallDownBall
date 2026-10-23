import { Component, inject } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { ToastController } from '@ionic/angular/toast-controller';
import { MissionsService } from '../../core/services/missions.service';
import { MISSION_TEMPLATES, Mission } from '../../core/game/missions-catalog';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-missions-panel',
  standalone: true,
  imports: [IonButton, TranslatePipe],
  template: `
    <div class="panel">
      <h3>{{ 'mission.title' | translate }}</h3>
      <div class="row">
        @for (m of missions.missions(); track m.id) {
          <div class="card" [class.ready]="!m.claimed && m.progress >= m.target" [class.done]="m.claimed">
            <span class="icon">{{ icon(m) }}</span>
            <div class="info">
              <p>{{ templateKey(m) | translate: { n: m.target } }}</p>
              <div class="progress-bar">
                <div class="fill" [style.width.%]="(m.progress / m.target) * 100"></div>
              </div>
              <small>{{ m.progress }} / {{ m.target }}</small>
            </div>
            <ion-button size="small" [disabled]="m.claimed || m.progress < m.target" (click)="claim(m)">
              {{ (m.claimed ? 'mission.claimed' : 'mission.claim') | translate }}
            </ion-button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./missions-panel.component.scss'],
})
export class MissionsPanelComponent {
  missions = inject(MissionsService);
  private i18n = inject(I18nService);
  private toastCtrl = inject(ToastController);

  icon(m: Mission): string {
    return MISSION_TEMPLATES.find(t => t.type === m.type)?.icon ?? '🎯';
  }
  templateKey(m: Mission): string {
    return MISSION_TEMPLATES.find(t => t.type === m.type)?.nameKey ?? '';
  }

  async claim(m: Mission) {
    if (!this.missions.claim(m.id)) return;
    const t = await this.toastCtrl.create({
      message: this.i18n.t('mission.rewardToast', { reward: 40 }),
      duration: 2000,
      position: 'top',
      cssClass: 'mission-reward-toast',
      icon: 'gift-outline',
    });
    await t.present();
  }
}
