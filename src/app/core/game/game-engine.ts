import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  Hero, Board, Prop, Particle, createHero
} from './entities';
import {
  applyGravity, clampX, collideBoard, collideProp, applyMagnet
} from './physics';

export interface GameEngineOpts {
  skinId: number;
  sound: boolean;
  onSoundEvent?: (name: 'coin'|'shield'|'magnet'|'bonus'|'death'|'revive') => void;
}

export type GameEvent =
  | { kind: 'coin' | 'shield' | 'magnet' | 'bonus' | 'savedByShield' }
  | { kind: 'gameOver'; score: number; coins: number; newRecord?: boolean };

const W = 360, H = 640;
const G = 0.36, TERMINAL = 8.5, MOVE = 4.2;
const GAP_W = 72, BOARD_H = 7;
const SKINS = ['#ffd54f','#ff6e6e','#4fe3c1','#b388ff','#ffa94d'];

export class GameEngine {
  readonly score = signal(0);
  readonly coins = signal(0);
  readonly state = signal<'playing'|'paused'|'over'>('playing');
  readonly events$ = new Subject<GameEvent>();

  private ctx: CanvasRenderingContext2D;
  private hero: Hero;
  private boards: Board[] = [];
  private props: Prop[] = [];
  private particles: Particle[] = [];
  private laserY = -30;
  private scrollSpeed = 1.1;
  private tFrame = 0;
  private saveUsed = false;
  private rafId = 0;
  private keys = { l: false, r: false };
  private tiltVx = 0;

  constructor(private canvas: HTMLCanvasElement, private opts: GameEngineOpts) {
    this.ctx = canvas.getContext('2d')!;
    this.hero = createHero(W/2, 120, opts.skinId);
    for (let y = 220; y < H + 220; y += 95) this.spawnBoard(y);
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  start()  { if (this.state() === 'paused') this.resume(); }
  pause()  { if (this.state() === 'playing') this.state.set('paused'); }
  resume() { if (this.state() === 'paused')  this.state.set('playing'); }
  reset()  {
    this.hero = createHero(W/2, 120, this.opts.skinId);
    this.boards = []; this.props = []; this.particles = [];
    this.laserY = -30; this.scrollSpeed = 1.1; this.tFrame = 0;
    this.saveUsed = false;
    this.score.set(0); this.coins.set(0); this.state.set('playing');
    for (let y = 220; y < H + 220; y += 95) this.spawnBoard(y);
  }
  revive() {
    if (this.state() !== 'over') return;
    this.hero.y = 160; this.hero.vy = 0; this.hero.x = W/2;
    this.laserY = -40;
    this.saveUsed = true;
    this.state.set('playing');
    this.opts.onSoundEvent?.('revive');
  }
  destroy() { cancelAnimationFrame(this.rafId); this.events$.complete(); }
  setInput(left: boolean, right: boolean) { this.keys.l = left; this.keys.r = right; }
  setTilt(gamma: number) {
    // gamma -90..90 → vx scaled
    this.tiltVx = Math.max(-MOVE, Math.min(MOVE, gamma / 10));
  }

  private spawnBoard(y: number) {
    const gapX = Math.random() * (W - GAP_W);
    const label: Board['label'] = Math.random() < 1/7
      ? (Math.random() < 0.5 ? '×2' : '+5')
      : null;
    this.boards.push({ y, gapX, gapW: GAP_W, label, consumed: false });
    if (Math.random() < 1/6) {
      const kinds: Array<'coin'|'shield'|'magnet'> = ['coin','shield','magnet','coin','coin'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const sideX = Math.random() < 0.5
        ? Math.random() * (gapX - 20) + 10
        : gapX + GAP_W + Math.random() * (W - gapX - GAP_W - 20) + 10;
      this.props.push({ x: sideX, y: y - 18, r: 9, kind });
    }
  }

  private burst(x: number, y: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      this.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 25, color });
    }
  }

  private kill() {
    if (this.state() === 'over') return;
    this.state.set('over');
    this.burst(this.hero.x, this.hero.y, '#ff2244', 30);
    this.opts.onSoundEvent?.('death');
    this.events$.next({ kind: 'gameOver', score: this.score(), coins: this.coins() });
  }

  private loop() {
    if (this.state() === 'playing') this.update();
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private update() {
    this.tFrame++;
    // scroll
    for (const b of this.boards) b.y -= this.scrollSpeed;
    for (const p of this.props)  p.y -= this.scrollSpeed;
    this.laserY += 0.09;

    // recycle
    while (this.boards.length && this.boards[0].y < -20) {
      this.boards.shift();
      this.score.update(s => s + 1);
    }
    const lastY = this.boards.length ? this.boards[this.boards.length - 1].y : 0;
    if (lastY < H) this.spawnBoard(lastY + 95);
    this.props = this.props.filter(p => p.y > -20);

    // input → vx
    let vx = 0;
    if (this.keys.l) vx -= MOVE;
    if (this.keys.r) vx += MOVE;
    if (vx === 0 && this.tiltVx !== 0) vx = this.tiltVx;
    this.hero.vx = vx !== 0 ? vx : this.hero.vx * 0.82;
    this.hero.x += this.hero.vx;
    clampX(this.hero, W);

    // gravity
    applyGravity(this.hero, G, TERMINAL);
    this.hero.y += this.hero.vy;

    // trail
    this.hero.trail.push({ x: this.hero.x, y: this.hero.y });
    if (this.hero.trail.length > 14) this.hero.trail.shift();

    // collisions boards
    for (const b of this.boards) {
      if (collideBoard(this.hero, b)) {
        this.hero.y = b.y - this.hero.r;
        this.hero.vy = 0;
        if (b.label && !b.consumed) {
          b.consumed = true;
          if (b.label === '×2') this.score.update(s => s * 2);
          else                  this.score.update(s => s + 5);
          this.burst(this.hero.x, b.y, '#ffd54f', 14);
          this.events$.next({ kind: 'bonus' });
          this.opts.onSoundEvent?.('bonus');
        }
      }
    }

    // collisions props
    for (const p of this.props) {
      if (collideProp(this.hero, p)) {
        (p as any)._dead = true;
        if (p.kind === 'coin')   { this.coins.update(c => c + 1); this.burst(p.x,p.y,'#ffd54f',8);
          this.events$.next({ kind: 'coin' }); this.opts.onSoundEvent?.('coin'); }
        if (p.kind === 'shield') { this.hero.shield = 300; this.burst(p.x,p.y,'#4fe3c1',14);
          this.events$.next({ kind: 'shield' }); this.opts.onSoundEvent?.('shield'); }
        if (p.kind === 'magnet') { this.hero.magnet = 300; this.burst(p.x,p.y,'#b388ff',14);
          this.events$.next({ kind: 'magnet' }); this.opts.onSoundEvent?.('magnet'); }
      }
    }
    this.props = this.props.filter(p => !(p as any)._dead);

    if (this.hero.magnet > 0) applyMagnet(this.hero, this.props, 110, 2.2);
    if (this.hero.shield > 0) this.hero.shield--;
    if (this.hero.magnet > 0) this.hero.magnet--;

    // particles
    for (const q of this.particles) { q.x += q.vx; q.y += q.vy; q.life--; }
    this.particles = this.particles.filter(q => q.life > 0);

    // laser
    if (this.hero.y - this.hero.r < this.laserY + 18) {
      if (this.hero.shield > 0) {
        this.hero.shield = 0;
        this.hero.vy = 2;
        this.hero.y  = this.laserY + 20 + this.hero.r + 2;
        this.burst(this.hero.x, this.hero.y, '#4fe3c1', 20);
        this.events$.next({ kind: 'savedByShield' });
      } else {
        this.kill();
      }
    }

    this.scrollSpeed += 0.00045;
  }

  private render() {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0f1c'); bg.addColorStop(1, '#1a1030');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // laser
    const g = ctx.createLinearGradient(0, this.laserY, 0, this.laserY + 18);
    g.addColorStop(0, '#ff3058'); g.addColorStop(1, '#550011');
    ctx.fillStyle = g; ctx.fillRect(0, this.laserY, W, 18);

    // boards
    ctx.fillStyle = '#4fc3f7';
    for (const b of this.boards) {
      ctx.fillRect(0, b.y, b.gapX, BOARD_H);
      ctx.fillRect(b.gapX + b.gapW, b.y, W - (b.gapX + b.gapW), BOARD_H);
      if (b.label && !b.consumed) {
        const cx = (b.gapX > W/2) ? b.gapX/2 : b.gapX + b.gapW + (W - b.gapX - b.gapW)/2;
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(cx - 14, b.y - 14, 28, 14);
        ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(b.label, cx, b.y - 3);
        ctx.fillStyle = '#4fc3f7';
      }
    }

    // props
    for (const p of this.props) {
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.kind === 'coin') {
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI*2); ctx.fill();
      } else if (p.kind === 'shield') {
        ctx.fillStyle = '#4fe3c1';
        ctx.beginPath();
        ctx.moveTo(0, -p.r); ctx.lineTo(p.r, -2); ctx.lineTo(0, p.r); ctx.lineTo(-p.r, -2);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#b388ff';
        ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
      }
      ctx.restore();
    }

    // trail
    const h = this.hero;
    for (let i = 0; i < h.trail.length; i++) {
      const t = h.trail[i];
      const a = i / h.trail.length;
      ctx.fillStyle = `rgba(255,255,255,${a*0.4})`;
      ctx.beginPath(); ctx.arc(t.x, t.y, h.r*a*0.9, 0, Math.PI*2); ctx.fill();
    }

    // hero shield aura
    if (h.shield > 0) {
      ctx.strokeStyle = `rgba(79,227,193,${0.5 + 0.3*Math.sin(this.tFrame*0.3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 4, 0, Math.PI*2); ctx.stroke();
    }
    // hero magnet rings
    if (h.magnet > 0) {
      ctx.strokeStyle = 'rgba(179,136,255,0.4)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r + 8 + i*5 + (this.tFrame*0.5 + i*8) % 12, 0, Math.PI*2);
        ctx.stroke();
      }
    }
    // ball
    ctx.fillStyle = SKINS[h.skinId % SKINS.length];
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI*2); ctx.fill();

    // particles
    for (const q of this.particles) {
      ctx.fillStyle = q.color;
      ctx.globalAlpha = Math.max(0, q.life / 30);
      ctx.fillRect(q.x, q.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}
