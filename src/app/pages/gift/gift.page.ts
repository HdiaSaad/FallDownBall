import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { videocamOutline, giftOutline } from 'ionicons/icons';
import { GiftService, PRIZE_TABLE } from '../../core/services/gift.service';
import { WalletService } from '../../core/services/wallet.service';
import { AudioService } from '../../core/services/audio.service';

interface Confetto { x: number; y: number; vx: number; vy: number; life: number; color: string; }

@Component({
  selector: 'app-gift',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonButton, IonIcon],
  templateUrl: './gift.page.html',
  styleUrls: ['./gift.page.scss'],
})
export class GiftPage implements OnInit, OnDestroy {
  @ViewChild('wheel', { static: true }) wheelRef!: ElementRef<HTMLCanvasElement>;
  gift = inject(GiftService);
  wallet = inject(WalletService);
  private audio = inject(AudioService);
  prizes = PRIZE_TABLE;
  rotation = 0;
  spinning = signal(false);
  lastWon = signal<number | null>(null);
  celebrating = signal(false);
  countdown = signal('');
  private tickId = 0;
  private confetti: Confetto[] = [];
  private confettiRafId = 0;

  constructor() { addIcons({ videocamOutline, giftOutline }); }

  ngOnInit() {
    this.drawWheel();
    this.updateCountdown();
    this.tickId = window.setInterval(() => this.updateCountdown(), 1000) as unknown as number;
  }
  ngOnDestroy() {
    clearInterval(this.tickId);
    cancelAnimationFrame(this.confettiRafId);
  }

  private updateCountdown() {
    const ms = this.gift.msUntilNextClaim();
    if (ms <= 0) { this.countdown.set('Available!'); return; }
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    this.countdown.set(`${h}h ${m}m ${s}s`);
  }

  private drawWheel(angle = 0) {
    const cv = this.wheelRef.nativeElement;
    const ctx = cv.getContext('2d')!;
    const n = this.prizes.length;
    const r = Math.min(cv.width, cv.height) / 2;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate(angle);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - 4, a0, a1); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#4fc3f7' : '#ffd54f';
      ctx.fill();
      ctx.save();
      ctx.rotate((a0 + a1) / 2);
      ctx.fillStyle = '#000'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(String(this.prizes[i]), r - 20, 6);
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cv.width / 2 - 10, 0);
    ctx.lineTo(cv.width / 2 + 10, 0);
    ctx.lineTo(cv.width / 2, 20);
    ctx.closePath(); ctx.fill();
    for (const c of this.confetti) {
      ctx.fillStyle = c.color;
      ctx.globalAlpha = Math.max(0, c.life / 60);
      ctx.fillRect(c.x, c.y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  private celebrate(prize: number) {
    this.lastWon.set(prize);
    this.celebrating.set(true);
    this.audio.play('win');
    const colors = ['#ffd54f', '#ff6e6e', '#4fe3c1', '#b388ff', '#4fc3f7', '#ffffff'];
    const cv = this.wheelRef.nativeElement;
    const cx = cv.width / 2, cy = cv.height / 2;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      this.confetti.push({
        x: cx, y: cy,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 45 + Math.random() * 25,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    const tick = () => {
      for (const c of this.confetti) { c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.life--; }
      this.confetti = this.confetti.filter(c => c.life > 0);
      this.drawWheel(this.rotation);
      if (this.confetti.length) this.confettiRafId = requestAnimationFrame(tick);
      else this.celebrating.set(false);
    };
    this.confettiRafId = requestAnimationFrame(tick);
  }

  async spin() {
    if (!this.gift.canClaim() || this.spinning()) return;
    this.spinning.set(true);
    this.lastWon.set(null);
    this.audio.play('spin');
    const prize = await this.gift.spinWheel();
    const idx = this.prizes.indexOf(prize);
    const target = -((idx + 0.5) / this.prizes.length) * Math.PI * 2 - Math.PI / 2;
    const start = performance.now();
    const dur = 3000;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      this.rotation = eased * (target + Math.PI * 8);
      this.drawWheel(this.rotation);
      if (t < 1) requestAnimationFrame(animate);
      else { this.spinning.set(false); this.celebrate(prize); }
    };
    requestAnimationFrame(animate);
  }

  async freeGift() {
    if (this.spinning()) return;
    this.spinning.set(true);
    this.audio.play('spin');
    const prize = await this.gift.claimFreeGift();
    this.spinning.set(false);
    if (prize > 0) this.celebrate(prize);
  }
}
