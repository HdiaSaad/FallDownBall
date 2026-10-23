import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  Hero, Board, Prop, Particle, createHero
} from './entities';
import {
  applyGravity, clampX, collideBoard, collideProp, applyMagnet
} from './physics';
import { getSkin } from './catalog';

export interface GameEngineOpts {
  skinId: number;
  sound: boolean;
  height: number;
  onSoundEvent?: (name: 'coin'|'shield'|'magnet'|'bonus'|'death'|'revive'|'combo'|'perfectRun'|'speedBrick') => void;
}

export type GameEvent =
  | { kind: 'shield' | 'magnet' | 'bonus' | 'savedByShield' | 'perfectRun' | 'speedBrick' }
  | { kind: 'coin'; value: number }
  | { kind: 'combo'; steps: number; wooow: boolean }
  | { kind: 'gameOver'; score: number; coins: number; newRecord?: boolean };

const W = 360;
const G = 0.36, TERMINAL = 8.5, MOVE = 4.2;
const GAP_W = 72, BOARD_H = 7;
const COLOR_CYCLE = ['#ffd54f','#4fc3f7','#b388ff','#4fe3c1','#ff2d55','#ffab40','#64ffda','#f06292','#9ccc65','#ff6a00'];
const BOARD_COLORS = ['#4fc3f7','#64ffda','#b388ff','#ffd54f','#ff6a00','#ff2d55','#9ccc65','#f06292','#4fe3c1','#ffab40'];
const SPEED_BOOST_FRAMES = 240;
const SPEED_BOOST_MULT = 1.8;
const COMBO_WINDOW_FRAMES = 240;
const COMBO_MULTI_CAP = 10;

export class GameEngine {
  readonly score = signal(0);
  readonly coins = signal(0);
  readonly state = signal<'playing'|'paused'|'over'>('playing');
  readonly events$ = new Subject<GameEvent>();

  private ctx: CanvasRenderingContext2D;
  private readonly H: number;
  private hero: Hero;
  private boards: Board[] = [];
  private props: Prop[] = [];
  private particles: Particle[] = [];
  private stars: { x: number; y: number; r: number; a: number; phase: number }[] = [];
  private dust: { x: number; y: number; vx: number; vy: number; len: number; a: number }[] = [];
  private laserY = -30;
  private scrollSpeed = 1.1;
  private tFrame = 0;
  private saveUsed = false;
  private rafId = 0;
  private keys = { l: false, r: false };
  private tiltVx = 0;
  private floatTexts: Array<{x:number;y:number;vy:number;life:number;max:number;text:string;color:string;size:number}> = [];
  private wasInAir = true;
  private stepsSinceLanding = 0;
  private comboTimer = 0;
  private speedBoost = 0;
  private wooowCount = 0;
  readonly comboMulti = signal(1);
  readonly comboMultiFraction = signal(0);
  private comboMultiTimer = 0;
  private tutorialMode = false;
  private forcedSpawns: Array<{ board: number; label?: 'speed' | '×2' | '+5'; prop?: 'shield' | 'magnet' }> = [];

  constructor(private canvas: HTMLCanvasElement, private opts: GameEngineOpts) {
    this.ctx = canvas.getContext('2d')!;
    this.H = opts.height;
    this.hero = createHero(W/2, 120, opts.skinId);
    this.spawnStarterBoards();
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  start()  { if (this.state() === 'paused') this.resume(); }
  pause()  { if (this.state() === 'playing') this.state.set('paused'); }
  resume() { if (this.state() === 'paused')  this.state.set('playing'); }
  reset()  {
    this.tutorialMode = false; this.forcedSpawns = [];
    this.hero = createHero(W/2, 120, this.opts.skinId);
    this.boards = []; this.props = []; this.particles = [];
    this.laserY = -30; this.scrollSpeed = 1.1; this.tFrame = 0;
    this.saveUsed = false;
    this.floatTexts = [];
    this.wasInAir = true; this.stepsSinceLanding = 0; this.comboTimer = 0;
    this.speedBoost = 0;
    this.wooowCount = 0;
    this.comboMulti.set(1);
    this.comboMultiFraction.set(0);
    this.comboMultiTimer = 0;
    this.score.set(0); this.coins.set(0); this.state.set('playing');
    this.spawnStarterBoards();
  }
  revive() {
    if (this.state() !== 'over') return;
    this.hero.y = 160; this.hero.vy = 0; this.hero.x = W/2;
    this.laserY = -40;
    this.saveUsed = true;
    this.state.set('playing');
    this.opts.onSoundEvent?.('revive');
  }
  seedForRevive(score: number, coins: number) {
    this.score.set(score);
    this.coins.set(coins);
    this.saveUsed = true;
    this.opts.onSoundEvent?.('revive');
  }
  destroy() { cancelAnimationFrame(this.rafId); this.events$.complete(); }

  private darken(hex: string, amt: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amt));
    const g = Math.max(0, ((n >>  8) & 0xff) * (1 - amt));
    const b = Math.max(0, ( n        & 0xff) * (1 - amt));
    return `rgb(${r|0},${g|0},${b|0})`;
  }

  setTutorialMode(on: boolean, forcedSpawns: typeof this.forcedSpawns = []): void {
    this.tutorialMode = on;
    this.forcedSpawns = [...forcedSpawns];
  }

  setInput(left: boolean, right: boolean) { this.keys.l = left; this.keys.r = right; }
  setTilt(gamma: number) {
    // gamma -90..90 → vx scaled
    this.tiltVx = Math.max(-MOVE, Math.min(MOVE, gamma / 10));
  }

  private spawnStarterBoards() {
    // First board: force gap to the edge so the ball always lands on spawn.
    // This gives the player a moment to orient before navigating real gaps.
    const leftSide = Math.random() < 0.5;
    const starterGapX = leftSide ? 10 : W - GAP_W - 10;
    this.boards.push({ y: 220, gapX: starterGapX, gapW: GAP_W, label: null, consumed: false });
    // Second board: gap on the opposite side — a clear navigable path.
    const secondGapX = leftSide ? W - GAP_W - 10 : 10;
    this.boards.push({ y: 315, gapX: secondGapX, gapW: GAP_W, label: null, consumed: false });
    // Remaining boards: random as usual.
    for (let y = 410; y < this.H + 220; y += 95) this.spawnBoard(y);
  }

  private spawnBoard(y: number) {
    const forced = this.forcedSpawns.shift();
    const gapX = Math.random() * (W - GAP_W);
    let label: Board['label'] = null;
    if (Math.random() < 1/5) {
      const t = Math.random();
      label = t < 1/3 ? '×2' : t < 2/3 ? '+5' : 'speed';
    }
    if (forced?.label) label = forced.label;
    this.boards.push({ y, gapX, gapW: GAP_W, label, consumed: false });
    if (forced?.prop) {
      this.props.push({ x: gapX + GAP_W / 2, y: y - 20, r: 10, kind: forced.prop });
    } else if (Math.random() < 1/6) {
      const kinds: Array<'coin'|'shield'|'magnet'> = ['coin','shield','magnet','coin','coin'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const sideX = Math.random() < 0.5
        ? Math.random() * (gapX - 20) + 10
        : gapX + GAP_W + Math.random() * (W - gapX - GAP_W - 20) + 10;
      this.props.push({ x: sideX, y: y - 18, r: 9, kind });
    }
  }

  private spawnFloatText(text: string, x: number, y: number, size = 42, color = '#ffd54f') {
    const life = 90;
    this.floatTexts.push({ x, y, vy: -1.4, life, max: life, text, color, size });
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
    if (this.comboMultiTimer > 0) {
      this.comboMultiTimer--;
      this.comboMultiFraction.set(this.comboMultiTimer / COMBO_WINDOW_FRAMES);
      if (this.comboMultiTimer === 0) this.comboMulti.set(1);
    }
    // scroll — camera follows the ball when it enters the bottom "follow zone"
    const scrollMul = this.tutorialMode ? 0.5 : 1;
    const followStart = this.H * 0.75;
    let catchUp = 0;
    if (this.hero.y > followStart) {
      const t = Math.min(1, (this.hero.y - followStart) / (this.H - followStart));
      // match the ball's fall speed inside the follow zone...
      catchUp = Math.max(0, this.hero.vy) * t;
      // ...and add a recovery pull if the ball already dropped below the viewport
      if (this.hero.y > this.H) catchUp += (this.hero.y - this.H) * 0.25;
    }
    const effSpeed = (this.scrollSpeed + catchUp) * scrollMul;
    for (const b of this.boards) b.y -= effSpeed;
    for (const p of this.props)  p.y -= effSpeed;
    // shift the ball itself by the catch-up component so it stays visible on screen
    if (catchUp > 0) this.hero.y -= catchUp * scrollMul;
    // laser: constant descent, independent of tutorial slow-mo so pace stays steady
    this.laserY += 0.075;
    const boosted = this.speedBoost > 0;
    if (boosted) this.speedBoost--;

    // recycle
    while (this.boards.length && this.boards[0].y < -20) {
      this.boards.shift();
      this.score.update(s => s + 1);
    }
    const lastY = this.boards.length ? this.boards[this.boards.length - 1].y : 0;
    if (lastY < this.H) this.spawnBoard(lastY + 95);
    this.props = this.props.filter(p => p.y > -20);

    // input → vx (green brick boosts the BALL for a few seconds)
    const move = boosted ? MOVE * SPEED_BOOST_MULT : MOVE;
    const terminal = boosted ? TERMINAL * SPEED_BOOST_MULT : TERMINAL;
    let vx = 0;
    if (this.keys.l) vx -= move;
    if (this.keys.r) vx += move;
    if (vx === 0 && this.tiltVx !== 0) vx = this.tiltVx * (boosted ? SPEED_BOOST_MULT : 1);
    this.hero.vx = vx !== 0 ? vx : this.hero.vx * 0.82;
    this.hero.x += this.hero.vx;
    clampX(this.hero, W);

    // gravity
    applyGravity(this.hero, G, terminal);
    this.hero.y += this.hero.vy;

    // trail
    this.hero.trail.push({ x: this.hero.x, y: this.hero.y });
    if (this.hero.trail.length > 14) this.hero.trail.shift();

    // boards that moved above the hero while in air count as "fallen past"
    for (const b of this.boards) {
      if (!b.passedHero && b.y + BOARD_H < this.hero.y - this.hero.r) {
        b.passedHero = true;
        if (this.wasInAir) this.stepsSinceLanding++;
      }
    }

    // collisions boards
    let anyCollision = false;
    for (const b of this.boards) {
      if (collideBoard(this.hero, b)) {
        anyCollision = true;
        this.hero.y = b.y - this.hero.r;
        this.hero.vy = 0;
        if (b.label && !b.consumed) {
          b.consumed = true;
          if (b.label === '×2') {
            this.score.update(s => s * 2);
            this.burst(this.hero.x, b.y, '#ffd54f', 14);
          } else if (b.label === '+5') {
            this.score.update(s => s + 5);
            this.burst(this.hero.x, b.y, '#ffd54f', 14);
          } else {
            this.speedBoost = SPEED_BOOST_FRAMES;
            this.burst(this.hero.x, b.y, '#76ff03', 18);
            this.opts.onSoundEvent?.('speedBrick');
            this.events$.next({ kind: 'speedBrick' });
          }
          if (b.label !== 'speed') {
            this.events$.next({ kind: 'bonus' });
            this.opts.onSoundEvent?.('bonus');
          }
        }
      }
    }

    // landing transition — show combo text if we fell past multiple boards
    if (this.wasInAir && anyCollision) {
      if (this.stepsSinceLanding >= 2) {
        const n = this.stepsSinceLanding;
        const isCombo = this.comboTimer > 0;
        this.spawnFloatText(`+${n}`, W/2, this.H/2, 56, '#ffd54f');
        if (isCombo) {
          this.spawnFloatText('Wooow!', W/2, this.H/2 - 70, 44, '#ff3058');
        }
        this.comboTimer = 150;
        // combo multi + event
        this.comboMulti.update(m => Math.min(m + n, COMBO_MULTI_CAP));
        this.comboMultiTimer = COMBO_WINDOW_FRAMES;
        this.comboMultiFraction.set(1);
        this.events$.next({ kind: 'combo', steps: n, wooow: isCombo });
        this.opts.onSoundEvent?.('combo');
        if (isCombo) {
          this.wooowCount++;
          if (this.wooowCount === 3) {
            this.spawnFloatText('PERFECT!', W/2, this.H/2 - 140, 72, '#ff2d55');
            this.events$.next({ kind: 'perfectRun' });
            this.opts.onSoundEvent?.('perfectRun');
          }
        }
      }
      this.stepsSinceLanding = 0;
    }
    this.wasInAir = !anyCollision;
    if (this.comboTimer > 0) this.comboTimer--;

    // collisions props
    for (const p of this.props) {
      if (collideProp(this.hero, p)) {
        (p as any)._dead = true;
        if (p.kind === 'coin')   { const value = this.comboMulti(); this.coins.update(c => c + value); this.burst(p.x,p.y,'#ffd54f',8);
          this.spawnFloatText(`+${value}`, p.x, p.y, 28, '#ffd54f');
          this.events$.next({ kind: 'coin', value }); this.opts.onSoundEvent?.('coin'); }
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

    // laser (thin beam at laserY)
    if (this.hero.y - this.hero.r < this.laserY + 2) {
      if (this.hero.shield > 0) {
        this.hero.shield = 0;
        this.hero.vy = 2;
        this.hero.y  = this.laserY + 4 + this.hero.r + 2;
        this.burst(this.hero.x, this.hero.y, '#4fe3c1', 20);
        this.events$.next({ kind: 'savedByShield' });
      } else {
        this.kill();
      }
    }

    // float texts
    for (const t of this.floatTexts) { t.y += t.vy; t.life--; }
    this.floatTexts = this.floatTexts.filter(t => t.life > 0);

    this.scrollSpeed += 0.00045;
  }

  private render() {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, this.H);
    bg.addColorStop(0, '#070a18'); bg.addColorStop(1, '#140826');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, this.H);

    // starfield (lazy init on first frame — H is known then)
    if (this.stars.length === 0) {
      for (let i = 0; i < 80; i++) {
        this.stars.push({
          x: Math.random() * W,
          y: Math.random() * this.H,
          r: Math.random() * 1.3 + 0.3,
          a: 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    for (const st of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(this.tFrame * 0.04 + st.phase);
      ctx.fillStyle = `rgba(255,255,255,${st.a * tw})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }

    // diagonal dust streaks (down-left drift)
    if (this.dust.length < 8 && Math.random() < 0.08) {
      this.dust.push({
        x: Math.random() * W + 20,
        y: -10,
        vx: -0.6 - Math.random() * 0.4,
        vy: 1.8 + Math.random() * 1.2,
        len: 10 + Math.random() * 20,
        a: 0.25 + Math.random() * 0.35,
      });
    }
    for (const d of this.dust) {
      d.x += d.vx; d.y += d.vy;
      ctx.strokeStyle = `rgba(170,200,255,${d.a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.vx * d.len, d.y - d.vy * d.len);
      ctx.stroke();
    }
    this.dust = this.dust.filter(d => d.y < this.H + 20 && d.x > -20);

    // laser — thin glowing red beam
    ctx.save();
    ctx.shadowColor = '#ff2d55';
    ctx.shadowBlur = 18;
    // outer halo
    ctx.fillStyle = 'rgba(255,45,85,0.35)';
    ctx.fillRect(0, this.laserY - 2, W, 6);
    // bright core
    ctx.fillStyle = '#ff2d55';
    ctx.fillRect(0, this.laserY, W, 2);
    // hot white inner line
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffeef2';
    ctx.fillRect(0, this.laserY, W, 1);
    ctx.restore();
    // boards — pill-shaped neon bars
    const boardColor = BOARD_COLORS[Math.floor(this.score() / 100) % BOARD_COLORS.length];
    const rad = BOARD_H / 2;
    ctx.save();
    ctx.shadowColor = boardColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = boardColor;
    for (const b of this.boards) {
      const rightX = b.gapX + b.gapW;
      const rightW = W - rightX;
      if (b.gapX >= 2) {
        ctx.beginPath(); ctx.roundRect(0, b.y, b.gapX, BOARD_H, rad); ctx.fill();
      }
      if (rightW >= 2) {
        ctx.beginPath(); ctx.roundRect(rightX, b.y, rightW, BOARD_H, rad); ctx.fill();
      }
    }
    // inner bright highlight (no shadow) so pills read as emissive
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const b of this.boards) {
      const rightX = b.gapX + b.gapW;
      const rightW = W - rightX;
      if (b.gapX >= 6) ctx.fillRect(3, b.y + 1, b.gapX - 6, 1);
      if (rightW >= 6) ctx.fillRect(rightX + 3, b.y + 1, rightW - 6, 1);
    }
    ctx.restore();
    // labels on top of bars
    for (const b of this.boards) {
      if (b.label && !b.consumed) {
        const cx = (b.gapX > W/2) ? b.gapX/2 : b.gapX + b.gapW + (W - b.gapX - b.gapW)/2;
        const isSpeed = b.label === 'speed';
        ctx.fillStyle = isSpeed ? '#76ff03' : '#ffd54f';
        ctx.fillRect(cx - 14, b.y - 14, 28, 14);
        ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(isSpeed ? '»»' : b.label, cx, b.y - 3);
      }
    }

    // props
    for (const p of this.props) {
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.kind === 'coin') {
        ctx.save();
        ctx.shadowColor = '#ffd54f';
        ctx.shadowBlur = 10;
        // outer diamond
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.moveTo(0, -p.r); ctx.lineTo(p.r*0.75, 0);
        ctx.lineTo(0, p.r); ctx.lineTo(-p.r*0.75, 0);
        ctx.closePath(); ctx.fill();
        // bright inner facet
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.moveTo(0, -p.r*0.5); ctx.lineTo(p.r*0.35, 0);
        ctx.lineTo(0, p.r*0.5); ctx.lineTo(-p.r*0.35, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
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

    // flame trail — stretches along the ball's motion direction
    const h = this.hero;
    ctx.save();
    ctx.shadowColor = '#ff7a00';
    ctx.shadowBlur = 10;
    const stretch = Math.min(1, Math.abs(h.vx) * 0.15);
    const angle = Math.atan2(h.vy, h.vx);
    // skip the last trail point — it's the current ball position
    const tailEnd = Math.max(0, h.trail.length - 1);
    for (let i = 0; i < tailEnd; i++) {
      const t = h.trail[i];
      const a = i / tailEnd;
      const r = h.r * (0.18 + a * 0.5);
      const rx = r * (1 + stretch * 0.9);
      const ry = r * (1 - stretch * 0.2);
      let col: string;
      if (a < 0.4) col = `rgba(255,45,0,${a * 0.55})`;
      else if (a < 0.75) col = `rgba(255,140,30,${a * 0.75})`;
      else col = `rgba(255,230,120,${a * 0.9})`;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(t.x, t.y, rx, ry, angle, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

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
    // ball — radial-gradient sphere with highlight, outline, inner shadow
    const skin = getSkin(h.skinId);
    const s = this.score();
    let base: string;
    if (skin.effect === 'rainbow') {
      const hue = (this.tFrame * 2) % 360;
      base = `hsl(${hue}, 95%, 55%)`;
    } else if (skin.effect === 'fire') {
      base = skin.color;
    } else {
      base = s < 100
        ? skin.color
        : COLOR_CYCLE[(Math.floor(s / 100) - 1) % COLOR_CYCLE.length];
    }
    if (skin.effect === 'fire') {
      // flame aura behind ball
      for (let i = 0; i < 4; i++) {
        const r = h.r + 3 + i * 2 + Math.sin(this.tFrame * 0.4 + i) * 1.5;
        const a = 0.35 - i * 0.08;
        ctx.fillStyle = i % 2 === 0 ? `rgba(255,110,30,${a})` : `rgba(255,210,60,${a})`;
        ctx.beginPath(); ctx.arc(h.x, h.y + i * 0.6, r, 0, Math.PI * 2); ctx.fill();
      }
      // spark particles
      if (this.tFrame % 2 === 0) {
        this.particles.push({
          x: h.x + (Math.random() - 0.5) * h.r * 1.2,
          y: h.y + h.r * 0.3 + Math.random() * 3,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1.2 + Math.random() * 1.4,
          life: 18,
          color: Math.random() < 0.5 ? '#ff6a00' : '#ffd54f',
        });
      }
    }
    // flat 2D disc with neon glow
    ctx.save();
    ctx.shadowColor = base;
    ctx.shadowBlur = 14;
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // particles
    for (const q of this.particles) {
      ctx.fillStyle = q.color;
      ctx.globalAlpha = Math.max(0, q.life / 30);
      ctx.fillRect(q.x, q.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // floating bonus labels
    for (const t of this.floatTexts) {
      const prog = 1 - t.life / t.max;
      const scale = prog < 0.2 ? 0.5 + prog * 2.5 : 1 + Math.sin(prog * Math.PI) * 0.1;
      ctx.save();
      ctx.globalAlpha = t.life > 30 ? 1 : t.life / 30;
      ctx.translate(t.x, t.y);
      ctx.scale(scale, scale);
      ctx.font = `bold ${t.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // combo meter (top-right, under score)
    const multi = this.comboMulti();
    const frac = this.comboMultiFraction();
    if (multi > 1 && frac > 0) {
      const barW = 70, barH = 6, barX = W - 80, barY = 50;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ff8a00';
      ctx.fillRect(barX, barY, barW * frac, barH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`×${multi}`, W - 8, barY + barH + 14);
      ctx.textAlign = 'start';
    }
  }
}
