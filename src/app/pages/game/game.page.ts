import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { pauseOutline, playOutline, homeOutline, refreshOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GameEngine } from '../../core/game/game-engine';
import { WalletService } from '../../core/services/wallet.service';
import { SettingsService } from '../../core/services/settings.service';
import { AdsService } from '../../core/services/ads.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
})
export class GamePage implements OnDestroy {
  @ViewChild('cv', { static: true }) cvRef!: ElementRef<HTMLCanvasElement>;
  engine!: GameEngine;
  wallet = inject(WalletService);
  settings = inject(SettingsService);
  private ads = inject(AdsService);
  private router = inject(Router);
  paused = signal(false);

  constructor() { addIcons({ pauseOutline, playOutline, homeOutline, refreshOutline }); }

  ionViewDidEnter() {
    const canvas = this.cvRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 360 * dpr; canvas.height = 640 * dpr;
    canvas.getContext('2d')!.scale(dpr, dpr);

    this.ads.hideBanner();
    this.engine = new GameEngine(canvas, {
      skinId: this.wallet.equippedSkin(),
      sound:  this.settings.sound(),
      onSoundEvent: (name) => {
        if (name === 'death' && this.settings.vibration()) Haptics.impact({ style: ImpactStyle.Heavy });
        if (name === 'coin'  && this.settings.vibration()) Haptics.impact({ style: ImpactStyle.Light });
      },
    });
    this.engine.events$.subscribe(ev => {
      if (ev.kind === 'coin')   this.wallet.addCoins(1);
      if (ev.kind === 'gameOver') {
        const { newRecord } = this.wallet.submitScore(ev.score);
        this.ads.showInterstitial().then(() => {
          this.router.navigate(['/game-over'], {
            state: { score: ev.score, coins: ev.coins, newRecord }
          });
        });
      }
    });
    this.hookInputs(canvas);
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
  replay() { this.engine.reset(); this.paused.set(false); }
  home()   { this.router.navigateByUrl('/'); }

  ngOnDestroy() { this.engine?.destroy(); }
}
