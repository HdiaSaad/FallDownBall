import { Component, ElementRef, Injector, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { ToastController } from '@ionic/angular/toast-controller';
import { addIcons } from 'ionicons';
import { pauseOutline, playOutline, homeOutline, refreshOutline, trophy } from 'ionicons/icons';
import { GameEngine } from '../../core/game/game-engine';
import { WalletService } from '../../core/services/wallet.service';
import { SettingsService } from '../../core/services/settings.service';
import { AdsService } from '../../core/services/ads.service';
import { AudioService } from '../../core/services/audio.service';
import { AchievementService } from '../../core/services/achievement.service';
import { MissionsService } from '../../core/services/missions.service';
import { TutorialService } from '../../core/services/tutorial.service';
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
  private missions = inject(MissionsService);
  tutorial = inject(TutorialService);
  private i18n = inject(I18nService);
  private toastCtrl = inject(ToastController);
  private injector = inject(Injector);
  paused = signal(false);
  private coinsThisRun = 0;
  private runStartMs = 0;
  private tutLeftTaps = 0;
  private tutRightTaps = 0;
  private tutPickups = 0;
  private tutBricks = 0;

  constructor() { addIcons({ pauseOutline, playOutline, homeOutline, refreshOutline, trophy }); }

  ionViewDidEnter() {
    const canvas = this.cvRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 360 * dpr; canvas.height = 640 * dpr;
    canvas.getContext('2d')!.scale(dpr, dpr);

    this.coinsThisRun = 0;
    this.runStartMs = performance.now();
    this.tutLeftTaps = 0;
    this.tutRightTaps = 0;
    this.tutPickups = 0;
    this.tutBricks = 0;
    this.ads.hideBanner();
    const launchTutorial = this.tutorial.shouldLaunch();
    const engine = new GameEngine(canvas, {
      skinId: this.wallet.equippedSkin(),
      sound:  this.settings.sound(),
      onSoundEvent: (name) => {
        this.audio.play(name);
        this.audio.haptic(name);
      },
    });
    this.engineSig.set(engine);
    if (launchTutorial) {
      this.tutorial.start();
      engine.setTutorialMode(true, [
        { board: 5, prop: 'shield' },
        { board: 10, prop: 'magnet' },
        { board: 14, label: '×2' },
        { board: 18, label: '+5' },
        { board: 22, label: 'speed' },
      ]);
    }
    let step2Start = -1;
    effect(() => {
      const s = this.engine?.score() ?? 0;
      if (this.tutorial.step() === 2) {
        if (step2Start < 0) step2Start = s;
        if (s - step2Start >= 3) this.tutorial.advanceStep();
      } else {
        step2Start = -1;
      }
    }, { injector: this.injector });
    effect(() => {
      const s = this.engine?.score() ?? 0;
      if (s > 0) this.notifyUnlocks(this.achievements.recordEvent({ score: s }));
    }, { injector: this.injector });
    engine.events$.subscribe(ev => {
      if (this.tutorial.active()) {
        if (this.tutorial.step() === 3 && (ev.kind === 'shield' || ev.kind === 'magnet')) {
          this.tutPickups++;
          if (this.tutPickups >= 2) this.tutorial.advanceStep();
        }
        if (this.tutorial.step() === 4 && (ev.kind === 'bonus' || ev.kind === 'speedBrick')) {
          this.tutBricks++;
          if (this.tutBricks >= 3) {
            this.tutorial.markDone();
            this.engine.setTutorialMode(false);
          }
        }
      }
      if (ev.kind === 'coin') {
        this.wallet.addCoins(ev.value);
        this.coinsThisRun += ev.value;
        this.missions.recordEvent('coin_run', this.coinsThisRun);
        this.notifyUnlocks(this.achievements.recordEvent({ coinsThisRun: this.coinsThisRun }));
      }
      if (ev.kind === 'shield' || ev.kind === 'magnet' || ev.kind === 'bonus' || ev.kind === 'speedBrick') {
        this.missions.recordEvent('powerup');
      }
      if (ev.kind === 'savedByShield') {
        const total = this.achievements.incrementShieldSave();
        this.notifyUnlocks(this.achievements.recordEvent({ shieldSavedTotal: total }));
      }
      if (ev.kind === 'combo') {
        this.notifyUnlocks(this.achievements.recordEvent({ comboSteps: ev.steps, wooowFired: ev.wooow }));
        this.missions.recordEvent('combo');
      }
      if (ev.kind === 'perfectRun')  this.wallet.addCoins(100);
      if (ev.kind === 'gameOver') {
        const survivedSec = Math.floor((performance.now() - this.runStartMs) / 1000);
        this.missions.recordEvent('run_end', ev.score);
        this.missions.recordEvent('survive_run', survivedSec);
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
      const left = (clientX - rect.left) < rect.width / 2;
      if (left) keys.l = true; else keys.r = true;
      this.engine.setInput(keys.l, keys.r);
      if (this.tutorial.step() === 1) {
        if (left) this.tutLeftTaps++; else this.tutRightTaps++;
        if (this.tutLeftTaps >= 2 && this.tutRightTaps >= 2) this.tutorial.advanceStep();
      }
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
  replay() { this.coinsThisRun = 0; this.runStartMs = performance.now(); this.engine.reset(); this.paused.set(false); }
  home()   { this.router.navigateByUrl('/'); }

  async skipTutorial() {
    await this.tutorial.skip();
    this.engine.setTutorialMode(false);
  }

  private unlockQueue: string[] = [];
  private unlockBusy = false;
  private async notifyUnlocks(newly: string[]) {
    if (!newly.length) return;
    this.unlockQueue.push(...newly);
    if (this.unlockBusy) return;
    this.unlockBusy = true;
    try {
      while (this.unlockQueue.length) {
        const id = this.unlockQueue.shift()!;
        const def = ACHIEVEMENTS.find(a => a.id === id);
        if (!def) continue;
        this.audio.play('win');
        this.audio.haptic('bonus');
        const t = await this.toastCtrl.create({
          message: this.i18n.t('achievement.unlocked', { name: this.i18n.t(def.nameKey), reward: def.reward }),
          duration: 2200,
          position: 'top',
          cssClass: 'achievement-toast',
          icon: 'trophy',
        });
        await t.present();
        await t.onDidDismiss();
      }
    } finally {
      this.unlockBusy = false;
    }
  }

  ngOnDestroy() { this.engine?.destroy(); }
}
