import { Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { ToastController } from '@ionic/angular/toast-controller';
import { addIcons } from 'ionicons';
import { pauseOutline, playOutline, homeOutline, refreshOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GameEngine } from '../../core/game/game-engine';
import { WalletService } from '../../core/services/wallet.service';
import { SettingsService } from '../../core/services/settings.service';
import { AdsService } from '../../core/services/ads.service';
import { AudioService } from '../../core/services/audio.service';
import { AchievementService } from '../../core/services/achievement.service';
import { I18nService } from '../../core/services/i18n.service';
import { ACHIEVEMENTS } from '../../core/game/achievement-catalog';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, TranslatePipe],
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
})
export class GamePage implements OnDestroy {
  @ViewChild('cv', { static: true }) cvRef!: ElementRef<HTMLCanvasElement>;
  private engineSig = signal<GameEngine | null>(null);
  get engine(): GameEngine { return this.engineSig()!; }
  score = computed(() => this.engineSig()?.score() ?? 0);
  coins = computed(() => this.engineSig()?.coins() ?? 0);
  wallet = inject(WalletService);
  settings = inject(SettingsService);
  private ads = inject(AdsService);
  private audio = inject(AudioService);
  private router = inject(Router);
  private achievements = inject(AchievementService);
  private i18n = inject(I18nService);
  private toastCtrl = inject(ToastController);
  paused = signal(false);
  private coinsThisRun = 0;

  constructor() { addIcons({ pauseOutline, playOutline, homeOutline, refreshOutline }); }

  ionViewDidEnter() {
    const canvas = this.cvRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 360 * dpr; canvas.height = 640 * dpr;
    canvas.getContext('2d')!.scale(dpr, dpr);

    this.coinsThisRun = 0;
    this.ads.hideBanner();
    const engine = new GameEngine(canvas, {
      skinId: this.wallet.equippedSkin(),
      sound:  this.settings.sound(),
      onSoundEvent: (name) => {
        this.audio.play(name);
        if (name === 'death' && this.settings.vibration()) Haptics.impact({ style: ImpactStyle.Heavy });
        if (name === 'coin'  && this.settings.vibration()) Haptics.impact({ style: ImpactStyle.Light });
      },
    });
    this.engineSig.set(engine);
    engine.events$.subscribe(ev => {
      if (ev.kind === 'coin') {
        this.wallet.addCoins(ev.value);
        this.coinsThisRun += ev.value;
      }
      if (ev.kind === 'savedByShield') {
        const total = this.achievements.incrementShieldSave();
        this.notifyUnlocks(this.achievements.recordEvent({ shieldSavedTotal: total }));
      }
      if (ev.kind === 'combo') {
        this.notifyUnlocks(this.achievements.recordEvent({ comboSteps: ev.steps, wooowFired: ev.wooow }));
      }
      if (ev.kind === 'perfectRun')  this.wallet.addCoins(100);
      if (ev.kind === 'gameOver') {
        this.notifyUnlocks(this.achievements.recordEvent({
          runEnded: true,
          score: ev.score,
          coinsThisRun: this.coinsThisRun,
        }));
        const { newRecord } = this.wallet.submitScore(ev.score);
        this.ads.showInterstitial().then(() => {
          this.router.navigate(['/game-over'], {
            state: { score: ev.score, coins: ev.coins, newRecord }
          });
        });
      }
    });
    this.hookInputs(canvas);
    const st = history.state as any;
    if (st?.revive) engine.seedForRevive(st.score ?? 0, st.coins ?? 0);
  }

  private hookInputs(canvas: HTMLCanvasElement) {
    const keys = { l: false, r: false };
    const onDown = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      if ((clientX - rect.left) < rect.width / 2) keys.l = true; else keys.r = true;
      this.engine.setInput(keys.l, keys.r);
    };
    const onUp = () => { keys.l = keys.r = false; this.engine.setInput(false, false); };
    canvas.addEventListener('pointerdown', e => onDown(e.clientX));
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onUp);
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { keys.l = true;  this.engine.setInput(keys.l, keys.r); }
      if (e.key === 'ArrowRight') { keys.r = true;  this.engine.setInput(keys.l, keys.r); }
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft')  { keys.l = false; this.engine.setInput(keys.l, keys.r); }
      if (e.key === 'ArrowRight') { keys.r = false; this.engine.setInput(keys.l, keys.r); }
    });
  }

  togglePause() {
    if (this.paused()) { this.engine.resume(); this.paused.set(false); }
    else               { this.engine.pause();  this.paused.set(true); }
  }
  replay() { this.coinsThisRun = 0; this.engine.reset(); this.paused.set(false); }
  home()   { this.router.navigateByUrl('/'); }

  private async notifyUnlocks(newly: string[]) {
    for (const id of newly) {
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (!def) continue;
      const t = await this.toastCtrl.create({
        message: this.i18n.t('achievement.unlocked', { name: this.i18n.t(def.nameKey), reward: def.reward }),
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await t.present();
    }
  }

  ngOnDestroy() { this.engine?.destroy(); }
}
