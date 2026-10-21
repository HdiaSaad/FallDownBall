# FallDownBall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a faithful Ionic/Angular/Capacitor iOS clone of the reverse-engineered Android game `com.wiiza.falldown`, with 6 pages (Home, Game, GameOver, Settings, Customize, Gift), a vanilla Canvas 2D game engine, and real AdMob integration using Google test IDs.

**Architecture:** Ionic 7 + Angular 20 standalone components with lazy routes. State in signal-based singletons (`providedIn: 'root'`), persisted via `@capacitor/preferences`. Game logic lives in `src/app/core/game/` as a framework-agnostic TypeScript class fed a canvas by `GamePage`. Monetization through `@capacitor-community/admob` with Google iOS test IDs during development. Build via Capacitor sync + Xcode on a remote Mac over SSH.

**Tech Stack:** Ionic 7, Angular 20, Capacitor 6, TypeScript 5.4+, Jasmine/Karma, `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/device`, `@capacitor/motion`, `@capacitor-community/admob`.

## Global Constraints

- **Target folder:** `C:\Users\Ultrapc\Desktop\FallDownBall\` (empty at start)
- **Deployment target:** iOS 13.0 (`IPHONEOS_DEPLOYMENT_TARGET = 13.0`)
- **Device family:** iPhone + iPad (`TARGETED_DEVICE_FAMILY = 1,2`)
- **Orientation:** iPhone portrait-only; iPad portrait + landscape (no UpsideDown)
- **Logical canvas size:** 360 × 640 (figée pour mécanique identique quel que soit l'écran)
- **CSS canvas size:** `max-width: 480px; max-height: 854px; margin: auto` (letterbox on iPad)
- **XXTEA key (evidence only, not reused):** `d4b28f4a-7d79-4e` — do not reuse in production assets
- **AdMob test IDs (iOS, Google official):**
  - App ID: `ca-app-pub-3940256099942544~1458002511`
  - Banner: `ca-app-pub-3940256099942544/2934735716`
  - Interstitial: `ca-app-pub-3940256099942544/4411468910`
  - Rewarded: `ca-app-pub-3940256099942544/1712485313`
- **Prize wheel table:** `[50, 100, 50, 200, 50, 100, 500, 100]` (8 sectors, index = sector)
- **Powerup duration:** 5s = 300 frames @ 60 fps (`shield`, `magnet`)
- **Gravity:** `G = 0.36`, terminal velocity `8.5`, horizontal speed `MOVE = 4.2`
- **Board gap width:** `GAP_W = 72` px, board height `BOARD_H = 7`
- **Scroll difficulty:** base `scrollSpeed = 1.1`, per-frame increment `+= 0.00045`
- **Interstitial frequency:** every 3rd game-over (modulo counter, memory-only)
- **Rewarded ad timeout:** 10 seconds; on timeout return `false` and disable revive for the rest of the game
- **Build infra:** iOS builds happen on remote Mac (SSH alias `mac`, user `user`, host `192.168.1.17`, key `~/.ssh/claude_mac`). All `cap sync ios`, `pod install`, `xcodebuild` run via `ssh_exec`.
- **TDD rule:** physics module and services ship with Jasmine tests written **before** implementation. UI pages are smoke-tested manually on iOS Simulator.
- **Commit style:** Conventional Commits (`feat:`, `test:`, `chore:`, `fix:`, `docs:`), one task = one or more atomic commits (per step).

---

## File Structure

```
FallDownBall/
├── README-SPEC.md                              (already exists)
├── docs/superpowers/plans/2026-10-21-falldownball.md   (this plan)
├── package.json                                (Task 1)
├── angular.json                                (Task 1)
├── tsconfig.json                               (Task 1)
├── capacitor.config.ts                         (Task 1 — bare / Task 2 — ios opts)
├── ionic.config.json                           (Task 1)
├── karma.conf.js                               (Task 3)
├── scripts/
│   └── build-ios.sh                            (Task 16)
├── src/
│   ├── main.ts                                 (Task 1)
│   ├── index.html                              (Task 1)
│   ├── global.scss / theme/variables.scss      (Task 1)
│   ├── environments/environment.ts             (Task 2 — AdMob IDs)
│   └── app/
│       ├── app.component.ts                    (Task 1)
│       ├── app.routes.ts                       (Task 9)
│       ├── app.config.ts                       (Task 9)
│       ├── core/
│       │   ├── game/
│       │   │   ├── entities.ts                 (Task 3)
│       │   │   ├── physics.ts                  (Task 4)
│       │   │   ├── physics.spec.ts             (Task 4)
│       │   │   ├── game-engine.ts              (Task 5)
│       │   │   └── game-engine.spec.ts         (Task 5)
│       │   └── services/
│       │       ├── settings.service.ts         (Task 6)
│       │       ├── settings.service.spec.ts    (Task 6)
│       │       ├── wallet.service.ts           (Task 7)
│       │       ├── wallet.service.spec.ts      (Task 7)
│       │       ├── ads.service.ts              (Task 8)
│       │       ├── gift.service.ts             (Task 9)
│       │       └── gift.service.spec.ts        (Task 9)
│       └── pages/
│           ├── home/home.page.{ts,html,scss}            (Task 10)
│           ├── game/game.page.{ts,html,scss}            (Task 11)
│           ├── game-over/game-over.page.{ts,html,scss}  (Task 12)
│           ├── settings/settings.page.{ts,html,scss}    (Task 13)
│           ├── customize/customize.page.{ts,html,scss}  (Task 14)
│           └── gift/gift.page.{ts,html,scss}            (Task 15)
└── ios/   (generated by cap add ios in Task 2, synced to Mac in Task 16)
```

Each file has one responsibility. `entities.ts` holds only types/dataclasses, `physics.ts` only pure functions (easy to test), `game-engine.ts` only orchestration (needs canvas). Services use Angular signals, no RxJS. Pages are thin controllers that bind signals to templates.

---

## Task 1: Scaffold Ionic Angular project + git

**Files:**
- Create: `package.json`, `angular.json`, `tsconfig.json`, `ionic.config.json`, `capacitor.config.ts`, `src/main.ts`, `src/index.html`, `src/global.scss`, `src/theme/variables.scss`, `src/app/app.component.ts`
- Create: `.gitignore`, initial commit

**Interfaces:**
- Consumes: nothing (empty folder)
- Produces: a project that runs `ionic serve` and shows a blank Ionic shell

- [ ] **Step 1: Scaffold Ionic Angular project**

Run from `C:\Users\Ultrapc\Desktop\`:
```bash
ionic start FallDownBall blank --type=angular --capacitor --no-git --no-link --confirm
```

Expected: `FallDownBall/` populated with `src/`, `package.json`, Capacitor already added, Angular 20 standalone components.

- [ ] **Step 2: Verify dev server boots**

```bash
cd FallDownBall
npm run start   # or: ionic serve
```

Expected: dev server at `http://localhost:4200` shows Ionic blank screen. Kill with Ctrl+C.

- [ ] **Step 3: Set app id and name in capacitor.config.ts**

Edit `capacitor.config.ts` to:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saad.falldownball',
  appName: 'FallDownBall',
  webDir: 'www',
  server: { androidScheme: 'https' }
};

export default config;
```

- [ ] **Step 4: Init git, write .gitignore, first commit**

```bash
git init
cat > .gitignore << 'EOF'
node_modules/
www/
dist/
.angular/
ios/App/Pods/
ios/App/build/
ios/DerivedData/
.DS_Store
*.log
EOF

git add -A
git commit -m "chore: scaffold Ionic Angular 20 + Capacitor 6"
```

- [ ] **Step 5: Verify git log**

```bash
git log --oneline
```

Expected: one commit `chore: scaffold Ionic Angular 20 + Capacitor 6`.

---

## Task 2: Add iOS platform + install Capacitor plugins

**Files:**
- Create: `ios/` (generated), `src/environments/environment.ts`
- Modify: `capacitor.config.ts` (iOS-specific options), `package.json` (plugins)

**Interfaces:**
- Consumes: Task 1 scaffold
- Produces: `ios/App/App.xcworkspace` + 5 plugins installed; env file with AdMob test IDs ready to import.

- [ ] **Step 1: Install Capacitor plugins**

```bash
npm i @capacitor/ios@6 \
      @capacitor/preferences \
      @capacitor/haptics \
      @capacitor/device \
      @capacitor/motion \
      @capacitor-community/admob
```

- [ ] **Step 2: Add iOS platform**

```bash
npx cap add ios
```

Expected: `ios/App/App.xcworkspace` and `ios/App/App.xcodeproj` generated. May fail if CocoaPods is not installed locally — if so, skip pod install here; Task 16 runs `pod install` on the Mac anyway.

- [ ] **Step 3: Configure iOS deployment target + device family in capacitor.config.ts**

Update `capacitor.config.ts`:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saad.falldownball',
  appName: 'FallDownBall',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    scheme: 'FallDownBall'
  }
};

export default config;
```

- [ ] **Step 4: Create environment.ts with AdMob test IDs**

Create `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  admob: {
    appId:         'ca-app-pub-3940256099942544~1458002511',
    banner:        'ca-app-pub-3940256099942544/2934735716',
    interstitial:  'ca-app-pub-3940256099942544/4411468910',
    rewarded:      'ca-app-pub-3940256099942544/1712485313',
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add iOS platform + Capacitor plugins (preferences, haptics, device, motion, admob)"
```

---

## Task 3: Game entities module (pure data types)

**Files:**
- Create: `src/app/core/game/entities.ts`
- Test: `src/app/core/game/entities.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - Types: `Point`, `Hero`, `Board`, `Prop`, `Particle`, `PropKind`
  - Factory functions: `createHero(x: number, y: number, skinId: number): Hero`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/game/entities.spec.ts`:
```ts
import { createHero } from './entities';

describe('entities', () => {
  it('createHero initializes with defaults', () => {
    const h = createHero(100, 50, 2);
    expect(h.x).toBe(100);
    expect(h.y).toBe(50);
    expect(h.r).toBe(11);
    expect(h.vx).toBe(0);
    expect(h.vy).toBe(0);
    expect(h.shield).toBe(0);
    expect(h.magnet).toBe(0);
    expect(h.skinId).toBe(2);
    expect(h.trail).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --watch=false
```

Expected: FAIL with "Cannot find module './entities'" or similar.

- [ ] **Step 3: Implement entities.ts**

Create `src/app/core/game/entities.ts`:
```ts
export interface Point { x: number; y: number; }

export type PropKind = 'coin' | 'shield' | 'magnet';

export interface Hero {
  x: number; y: number; r: number;
  vx: number; vy: number;
  shield: number;   // remaining frames
  magnet: number;   // remaining frames
  skinId: number;
  trail: Point[];
}

export interface Board {
  y: number;
  gapX: number;
  gapW: number;
  label: '×2' | '+5' | null;
  consumed: boolean;
}

export interface Prop {
  x: number; y: number; r: number;
  kind: PropKind;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
}

export function createHero(x: number, y: number, skinId: number): Hero {
  return { x, y, r: 11, vx: 0, vy: 0, shield: 0, magnet: 0, skinId, trail: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --watch=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/game/entities.ts src/app/core/game/entities.spec.ts
git commit -m "feat(game): add entity types and hero factory"
```

---

## Task 4: Physics module (pure functions, TDD)

**Files:**
- Create: `src/app/core/game/physics.ts`
- Test: `src/app/core/game/physics.spec.ts`

**Interfaces:**
- Consumes: `Hero`, `Board`, `Prop` from `entities.ts`
- Produces:
  - `applyGravity(hero: Hero, G: number, terminal: number): void` — mutates `hero.vy`
  - `clampX(hero: Hero, worldW: number): void` — mutates `hero.x`
  - `collideBoard(hero: Hero, board: Board): boolean` — true if hero landed on this board (not in gap, prev-bottom above, now-bottom at/below)
  - `applyMagnet(hero: Hero, props: Prop[], range: number, pull: number): void` — mutates coin positions toward hero when magnet active
  - `collideProp(hero: Hero, prop: Prop): boolean` — simple circle-circle intersection

- [ ] **Step 1: Write all failing tests**

Create `src/app/core/game/physics.spec.ts`:
```ts
import { createHero } from './entities';
import type { Board, Prop } from './entities';
import {
  applyGravity, clampX, collideBoard, collideProp, applyMagnet
} from './physics';

describe('physics', () => {
  describe('applyGravity', () => {
    it('increments vy by G', () => {
      const h = createHero(0, 0, 0); h.vy = 1;
      applyGravity(h, 0.36, 8.5);
      expect(h.vy).toBeCloseTo(1.36);
    });

    it('caps vy at terminal velocity', () => {
      const h = createHero(0, 0, 0); h.vy = 9;
      applyGravity(h, 0.36, 8.5);
      expect(h.vy).toBe(8.5);
    });
  });

  describe('clampX', () => {
    it('clamps to [r, W-r]', () => {
      const h = createHero(-5, 0, 0);
      clampX(h, 360);
      expect(h.x).toBe(h.r);

      h.x = 400;
      clampX(h, 360);
      expect(h.x).toBe(360 - h.r);
    });
  });

  describe('collideBoard', () => {
    const board: Board = { y: 100, gapX: 50, gapW: 72, label: null, consumed: false };

    it('returns true when hero crosses board and is NOT in gap', () => {
      const h = createHero(10, 95, 0);  // hero to the left of gap
      h.vy = 10; // moved down 10 this frame → prev-bottom = 85+11-10 = 86 ≤ 100 and now-bottom = 95+11 = 106 ≥ 100
      expect(collideBoard(h, board)).toBe(true);
    });

    it('returns false when hero is in gap', () => {
      const h = createHero(80, 95, 0); // x=80 is inside gap [50..122]
      h.vy = 10;
      expect(collideBoard(h, board)).toBe(false);
    });

    it('returns false when hero is below board already', () => {
      const h = createHero(10, 120, 0);
      h.vy = 1; // prev-bottom = 119+11-1 = 129 > 100 → no cross
      expect(collideBoard(h, board)).toBe(false);
    });
  });

  describe('collideProp', () => {
    it('returns true when circles overlap', () => {
      const h = createHero(100, 100, 0);
      const p: Prop = { x: 105, y: 100, r: 9, kind: 'coin' };
      expect(collideProp(h, p)).toBe(true);
    });

    it('returns false when circles are apart', () => {
      const h = createHero(0, 0, 0);
      const p: Prop = { x: 100, y: 100, r: 9, kind: 'coin' };
      expect(collideProp(h, p)).toBe(false);
    });
  });

  describe('applyMagnet', () => {
    it('pulls coins within range toward hero', () => {
      const h = createHero(100, 100, 0);
      const coin: Prop = { x: 150, y: 100, r: 9, kind: 'coin' };
      const shield: Prop = { x: 150, y: 100, r: 9, kind: 'shield' };
      applyMagnet(h, [coin, shield], 110, 2);
      expect(coin.x).toBeLessThan(150); // moved toward hero
      expect(shield.x).toBe(150);       // unaffected
    });

    it('ignores coins outside range', () => {
      const h = createHero(0, 0, 0);
      const far: Prop = { x: 500, y: 500, r: 9, kind: 'coin' };
      applyMagnet(h, [far], 110, 2);
      expect(far.x).toBe(500);
    });
  });
});
```

- [ ] **Step 2: Run tests, verify all fail**

```bash
npm test -- --watch=false
```

Expected: 8 failures, all citing `physics.ts` not found.

- [ ] **Step 3: Implement physics.ts**

Create `src/app/core/game/physics.ts`:
```ts
import type { Hero, Board, Prop } from './entities';

export function applyGravity(hero: Hero, G: number, terminal: number): void {
  hero.vy = Math.min(hero.vy + G, terminal);
}

export function clampX(hero: Hero, worldW: number): void {
  hero.x = Math.max(hero.r, Math.min(worldW - hero.r, hero.x));
}

export function collideBoard(hero: Hero, board: Board): boolean {
  const prevBottom = hero.y - hero.vy + hero.r;
  const nowBottom  = hero.y + hero.r;
  const inGap = hero.x > board.gapX && hero.x < board.gapX + board.gapW;
  return !inGap && prevBottom <= board.y && nowBottom >= board.y;
}

export function collideProp(hero: Hero, prop: Prop): boolean {
  const dx = prop.x - hero.x;
  const dy = prop.y - hero.y;
  const rr = (prop.r + hero.r);
  return dx*dx + dy*dy < rr*rr;
}

export function applyMagnet(hero: Hero, props: Prop[], range: number, pull: number): void {
  for (const p of props) {
    if (p.kind !== 'coin') continue;
    const dx = hero.x - p.x;
    const dy = hero.y - p.y;
    const d  = Math.hypot(dx, dy);
    if (d > 0 && d < range) {
      p.x += (dx / d) * pull;
      p.y += (dy / d) * pull;
    }
  }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
npm test -- --watch=false
```

Expected: 8 passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/game/physics.ts src/app/core/game/physics.spec.ts
git commit -m "feat(game): add physics module with TDD coverage"
```

---

## Task 5: GameEngine orchestration class

**Files:**
- Create: `src/app/core/game/game-engine.ts`
- Test: `src/app/core/game/game-engine.spec.ts`

**Interfaces:**
- Consumes: `physics.ts`, `entities.ts`, Angular `signal` and `Subject` from `rxjs`
- Produces:
  - Class `GameEngine` with constructor `(canvas: HTMLCanvasElement, opts: GameEngineOpts)`
  - `GameEngineOpts = { skinId: number; sound: boolean; onSoundEvent?: (name: 'coin'|'shield'|'magnet'|'bonus'|'death'|'revive') => void }`
  - Public signals: `score = signal<number>(0)`, `coins = signal<number>(0)`, `state = signal<'playing'|'paused'|'over'>('playing')`
  - Public `events$: Subject<GameEvent>` where `GameEvent = { kind: 'gameOver', score: number, coins: number } | { kind: 'coin'|'shield'|'magnet'|'bonus' }`
  - Methods: `start()`, `pause()`, `resume()`, `reset()`, `destroy()`, `revive()`, `setInput(left: boolean, right: boolean)`, `setTilt(gamma: number)`

- [ ] **Step 1: Write test for engine contract**

Create `src/app/core/game/game-engine.spec.ts`:
```ts
import { GameEngine } from './game-engine';

function mockCanvas(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 360; cv.height = 640;
  return cv;
}

describe('GameEngine', () => {
  let cv: HTMLCanvasElement;
  let engine: GameEngine;

  beforeEach(() => {
    cv = mockCanvas();
    engine = new GameEngine(cv, { skinId: 0, sound: false });
  });

  afterEach(() => engine.destroy());

  it('starts in playing state with zero score/coins', () => {
    expect(engine.state()).toBe('playing');
    expect(engine.score()).toBe(0);
    expect(engine.coins()).toBe(0);
  });

  it('pause() moves state to paused', () => {
    engine.pause();
    expect(engine.state()).toBe('paused');
  });

  it('resume() returns to playing', () => {
    engine.pause();
    engine.resume();
    expect(engine.state()).toBe('playing');
  });

  it('reset() clears score and sets state=playing', () => {
    (engine as any).score.set(10);
    engine.reset();
    expect(engine.score()).toBe(0);
    expect(engine.state()).toBe('playing');
  });

  it('setInput updates internal flags', () => {
    engine.setInput(true, false);
    expect((engine as any).keys.l).toBe(true);
    expect((engine as any).keys.r).toBe(false);
  });

  it('emits gameOver event when kill() is called', (done) => {
    engine.events$.subscribe(ev => {
      if (ev.kind === 'gameOver') {
        expect(ev.score).toBeGreaterThanOrEqual(0);
        done();
      }
    });
    (engine as any).kill();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --watch=false
```

Expected: All 6 tests fail — module not found.

- [ ] **Step 3: Implement game-engine.ts**

Create `src/app/core/game/game-engine.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test -- --watch=false
```

Expected: all 14 tests across entities + physics + engine pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/game/game-engine.ts src/app/core/game/game-engine.spec.ts
git commit -m "feat(game): add GameEngine orchestration with contract tests"
```

---

## Task 6: SettingsService

**Files:**
- Create: `src/app/core/services/settings.service.ts`
- Test: `src/app/core/services/settings.service.spec.ts`

**Interfaces:**
- Consumes: `@capacitor/preferences`
- Produces:
  - Class `SettingsService` with signals `sound`, `music`, `vibration`, `controlMode`
  - Methods `load(): Promise<void>`, `save(): Promise<void>`

- [ ] **Step 1: Write failing test**

Create `src/app/core/services/settings.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
    spyOn(Preferences, 'get').and.resolveTo({ value: null });
    spyOn(Preferences, 'set').and.resolveTo();
  });

  it('defaults to sound=true, music=true, vibration=true, controlMode=touch', () => {
    expect(service.sound()).toBe(true);
    expect(service.music()).toBe(true);
    expect(service.vibration()).toBe(true);
    expect(service.controlMode()).toBe('touch');
  });

  it('load() restores from Preferences', async () => {
    (Preferences.get as jasmine.Spy).and.resolveTo({
      value: JSON.stringify({ sound: false, music: true, vibration: false, controlMode: 'tilt' })
    });
    await service.load();
    expect(service.sound()).toBe(false);
    expect(service.vibration()).toBe(false);
    expect(service.controlMode()).toBe('tilt');
  });

  it('save() writes JSON to Preferences', async () => {
    service.sound.set(false);
    await service.save();
    expect(Preferences.set).toHaveBeenCalledWith(jasmine.objectContaining({
      key: 'fdb_settings'
    }));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- --watch=false
```

Expected: FAIL — service not found.

- [ ] **Step 3: Implement SettingsService**

Create `src/app/core/services/settings.service.ts`:
```ts
import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'fdb_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly sound       = signal(true);
  readonly music       = signal(true);
  readonly vibration   = signal(true);
  readonly controlMode = signal<'touch'|'tilt'>('touch');

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const data = JSON.parse(value);
      if (typeof data.sound === 'boolean')     this.sound.set(data.sound);
      if (typeof data.music === 'boolean')     this.music.set(data.music);
      if (typeof data.vibration === 'boolean') this.vibration.set(data.vibration);
      if (data.controlMode === 'touch' || data.controlMode === 'tilt')
        this.controlMode.set(data.controlMode);
    } catch (e) { console.warn('SettingsService.load failed, using defaults', e); }
  }

  async save(): Promise<void> {
    const data = {
      sound: this.sound(), music: this.music(),
      vibration: this.vibration(), controlMode: this.controlMode()
    };
    await Preferences.set({ key: KEY, value: JSON.stringify(data) });
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npm test -- --watch=false
```

Expected: 3 new passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/settings.service.ts src/app/core/services/settings.service.spec.ts
git commit -m "feat(services): add SettingsService with Preferences persistence"
```

---

## Task 7: WalletService

**Files:**
- Create: `src/app/core/services/wallet.service.ts`
- Test: `src/app/core/services/wallet.service.spec.ts`

**Interfaces:**
- Consumes: `@capacitor/preferences`
- Produces:
  - Signals: `coins`, `best`, `unlockedSkins`, `unlockedBgs`, `equippedSkin`, `equippedBg`
  - Methods: `load()`, `save()`, `addCoins(n)`, `spendCoins(n): boolean`, `submitScore(s): { newRecord: boolean }`, `buySkin(id, price): boolean`, `buyBg(id, price): boolean`, `equipSkin(id)`, `equipBg(id)`

- [ ] **Step 1: Write failing tests**

Create `src/app/core/services/wallet.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletService);
    spyOn(Preferences, 'get').and.resolveTo({ value: null });
    spyOn(Preferences, 'set').and.resolveTo();
  });

  it('defaults: coins=0, best=0, skin 0 unlocked + equipped', () => {
    expect(service.coins()).toBe(0);
    expect(service.best()).toBe(0);
    expect(service.unlockedSkins().has(0)).toBe(true);
    expect(service.equippedSkin()).toBe(0);
  });

  it('addCoins increments', () => {
    service.addCoins(50);
    expect(service.coins()).toBe(50);
  });

  it('spendCoins returns false if insufficient', () => {
    expect(service.spendCoins(10)).toBe(false);
    expect(service.coins()).toBe(0);
  });

  it('spendCoins returns true and debits when sufficient', () => {
    service.addCoins(100);
    expect(service.spendCoins(30)).toBe(true);
    expect(service.coins()).toBe(70);
  });

  it('submitScore returns newRecord=true on higher score', () => {
    const r = service.submitScore(42);
    expect(r.newRecord).toBe(true);
    expect(service.best()).toBe(42);
  });

  it('submitScore returns newRecord=false on lower score', () => {
    service.submitScore(100);
    const r = service.submitScore(50);
    expect(r.newRecord).toBe(false);
    expect(service.best()).toBe(100);
  });

  it('buySkin unlocks and debits when affordable', () => {
    service.addCoins(200);
    expect(service.buySkin(1, 100)).toBe(true);
    expect(service.unlockedSkins().has(1)).toBe(true);
    expect(service.coins()).toBe(100);
  });

  it('buySkin fails when unaffordable, no debit', () => {
    expect(service.buySkin(1, 100)).toBe(false);
    expect(service.unlockedSkins().has(1)).toBe(false);
    expect(service.coins()).toBe(0);
  });

  it('equipSkin only equips if unlocked', () => {
    service.equipSkin(5);  // not unlocked
    expect(service.equippedSkin()).toBe(0);
    service.addCoins(100); service.buySkin(5, 100);
    service.equipSkin(5);
    expect(service.equippedSkin()).toBe(5);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- --watch=false
```

Expected: FAIL — service not found.

- [ ] **Step 3: Implement WalletService**

Create `src/app/core/services/wallet.service.ts`:
```ts
import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'fdb_wallet';

@Injectable({ providedIn: 'root' })
export class WalletService {
  readonly coins = signal(0);
  readonly best  = signal(0);
  readonly unlockedSkins = signal<Set<number>>(new Set([0]));
  readonly unlockedBgs   = signal<Set<number>>(new Set([0]));
  readonly equippedSkin  = signal(0);
  readonly equippedBg    = signal(0);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const d = JSON.parse(value);
      if (typeof d.coins === 'number') this.coins.set(d.coins);
      if (typeof d.best  === 'number') this.best.set(d.best);
      if (Array.isArray(d.unlockedSkins)) this.unlockedSkins.set(new Set(d.unlockedSkins));
      if (Array.isArray(d.unlockedBgs))   this.unlockedBgs.set(new Set(d.unlockedBgs));
      if (typeof d.equippedSkin === 'number') this.equippedSkin.set(d.equippedSkin);
      if (typeof d.equippedBg   === 'number') this.equippedBg.set(d.equippedBg);
    } catch (e) { console.warn('WalletService.load failed', e); }
  }

  async save(): Promise<void> {
    const data = {
      coins: this.coins(), best: this.best(),
      unlockedSkins: [...this.unlockedSkins()], unlockedBgs: [...this.unlockedBgs()],
      equippedSkin: this.equippedSkin(), equippedBg: this.equippedBg(),
    };
    await Preferences.set({ key: KEY, value: JSON.stringify(data) });
  }

  addCoins(n: number)  { this.coins.update(c => c + n); this.save(); }
  spendCoins(n: number): boolean {
    if (this.coins() < n) return false;
    this.coins.update(c => c - n);
    this.save();
    return true;
  }
  submitScore(s: number): { newRecord: boolean } {
    const newRecord = s > this.best();
    if (newRecord) { this.best.set(s); this.save(); }
    return { newRecord };
  }
  buySkin(id: number, price: number): boolean {
    if (!this.spendCoins(price)) return false;
    const set = new Set(this.unlockedSkins()); set.add(id); this.unlockedSkins.set(set);
    this.save();
    return true;
  }
  buyBg(id: number, price: number): boolean {
    if (!this.spendCoins(price)) return false;
    const set = new Set(this.unlockedBgs()); set.add(id); this.unlockedBgs.set(set);
    this.save();
    return true;
  }
  equipSkin(id: number) { if (this.unlockedSkins().has(id)) { this.equippedSkin.set(id); this.save(); } }
  equipBg(id: number)   { if (this.unlockedBgs().has(id))   { this.equippedBg.set(id);   this.save(); } }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
npm test -- --watch=false
```

Expected: 9 new passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/wallet.service.ts src/app/core/services/wallet.service.spec.ts
git commit -m "feat(services): add WalletService with coins/skins/best score persistence"
```

---

## Task 8: AdsService (AdMob wrapper)

**Files:**
- Create: `src/app/core/services/ads.service.ts`

**Interfaces:**
- Consumes: `@capacitor-community/admob`, `@capacitor/device`, `environment.ts`
- Produces:
  - Methods: `init()`, `showBanner()`, `hideBanner()`, `showInterstitial()`, `showRewarded(): Promise<boolean>`
  - Internal counter for interstitial frequency (every 3rd game-over)

- [ ] **Step 1: Implement AdsService**

Create `src/app/core/services/ads.service.ts`:
```ts
import { Injectable } from '@angular/core';
import {
  AdMob, AdMobBannerSize, BannerAdOptions, BannerAdPosition, BannerAdSize,
  AdOptions, RewardAdOptions, AdMobRewardItem
} from '@capacitor-community/admob';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private isIPad = false;
  private gameOverCount = 0;

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const info = await Device.getInfo();
    this.isIPad = info.model.toLowerCase().includes('ipad');
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: [],
      initializeForTesting: true,
    });
    this.initialized = true;
  }

  async showBanner(): Promise<void> {
    if (!this.initialized) return;
    const opts: BannerAdOptions = {
      adId: environment.admob.banner,
      adSize: this.isIPad ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true,
    };
    try { await AdMob.showBanner(opts); }
    catch (e) { console.warn('showBanner failed', e); }
  }

  async hideBanner(): Promise<void> {
    if (!this.initialized) return;
    try { await AdMob.hideBanner(); } catch {}
  }

  async showInterstitial(): Promise<void> {
    if (!this.initialized) return;
    this.gameOverCount = (this.gameOverCount + 1) % 3;
    if (this.gameOverCount !== 0) return;
    try {
      const opts: AdOptions = { adId: environment.admob.interstitial, isTesting: true };
      await AdMob.prepareInterstitial(opts);
      await AdMob.showInterstitial();
    } catch (e) { console.warn('showInterstitial failed', e); }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      const opts: RewardAdOptions = { adId: environment.admob.rewarded, isTesting: true };
      await Promise.race([
        AdMob.prepareRewardVideoAd(opts),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 10000)),
      ]);
      const item: AdMobRewardItem = await AdMob.showRewardVideoAd();
      return !!item;
    } catch (e) {
      console.warn('showRewarded failed/timeout', e);
      return false;
    }
  }
}
```

- [ ] **Step 2: Verify build still compiles**

```bash
npm run build
```

Expected: build succeeds (no AdMob tests since plugin is native-only; smoke tested on simulator in Task 17).

- [ ] **Step 3: Commit**

```bash
git add src/app/core/services/ads.service.ts
git commit -m "feat(services): add AdsService wrapper (banner, interstitial, rewarded)"
```

---

## Task 9: GiftService + routes + APP_INITIALIZER

**Files:**
- Create: `src/app/core/services/gift.service.ts`, `src/app/core/services/gift.service.spec.ts`
- Modify: `src/app/app.routes.ts`, `src/app/app.config.ts`, `src/app/app.component.ts`

**Interfaces:**
- Consumes: `WalletService`, `AdsService`, `@capacitor/preferences`
- Produces:
  - `GiftService`: signals `lastClaim`, computed `canClaim`, `msUntilNextClaim`; methods `load()`, `save()`, `spinWheel()`, `claimFreeGift()`
  - App routes: `/`, `/game`, `/game-over`, `/settings`, `/customize`, `/gift`
  - APP_INITIALIZER that calls `SettingsService.load()`, `WalletService.load()`, `GiftService.load()`, then `AdsService.init()` if native

- [ ] **Step 1: Write failing GiftService tests**

Create `src/app/core/services/gift.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { GiftService } from './gift.service';
import { WalletService } from './wallet.service';

describe('GiftService', () => {
  let service: GiftService;
  let wallet: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    wallet  = TestBed.inject(WalletService);
    service = TestBed.inject(GiftService);
    spyOn(Preferences, 'get').and.resolveTo({ value: null });
    spyOn(Preferences, 'set').and.resolveTo();
  });

  it('canClaim is true by default (no previous claim)', () => {
    expect(service.canClaim()).toBe(true);
  });

  it('canClaim is false if lastClaim is within 24h', () => {
    service.lastClaim.set(Date.now() - 3_600_000); // 1h ago
    expect(service.canClaim()).toBe(false);
  });

  it('canClaim is true if lastClaim is older than 24h', () => {
    service.lastClaim.set(Date.now() - 25 * 3_600_000);
    expect(service.canClaim()).toBe(true);
  });

  it('spinWheel credits a prize from the table and sets lastClaim', async () => {
    const before = wallet.coins();
    const prize = await service.spinWheel();
    expect([50, 100, 200, 500]).toContain(prize);
    expect(wallet.coins()).toBe(before + prize);
    expect(service.canClaim()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- --watch=false
```

- [ ] **Step 3: Implement GiftService**

Create `src/app/core/services/gift.service.ts`:
```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { WalletService } from './wallet.service';
import { AdsService } from './ads.service';

const KEY = 'fdb_gift';
const DAY_MS = 24 * 3_600_000;
export const PRIZE_TABLE = [50, 100, 50, 200, 50, 100, 500, 100];

@Injectable({ providedIn: 'root' })
export class GiftService {
  readonly lastClaim = signal<number>(0);
  readonly canClaim = computed(() => Date.now() - this.lastClaim() >= DAY_MS);
  readonly msUntilNextClaim = computed(() =>
    Math.max(0, DAY_MS - (Date.now() - this.lastClaim())));

  private wallet = inject(WalletService);
  private ads    = inject(AdsService);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return;
      const d = JSON.parse(value);
      if (typeof d.lastClaim === 'number') this.lastClaim.set(d.lastClaim);
    } catch (e) { console.warn('GiftService.load failed', e); }
  }

  async save(): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify({ lastClaim: this.lastClaim() }) });
  }

  async spinWheel(): Promise<number> {
    const idx = Math.floor(Math.random() * PRIZE_TABLE.length);
    const prize = PRIZE_TABLE[idx];
    this.wallet.addCoins(prize);
    this.lastClaim.set(Date.now());
    await this.save();
    return prize;
  }

  async claimFreeGift(): Promise<number> {
    const ok = await this.ads.showRewarded();
    if (!ok) return 0;
    return this.spinWheel();
  }
}
```

- [ ] **Step 4: Create app.routes.ts**

Create `src/app/app.routes.ts`:
```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '',          loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'game',      loadComponent: () => import('./pages/game/game.page').then(m => m.GamePage) },
  { path: 'game-over', loadComponent: () => import('./pages/game-over/game-over.page').then(m => m.GameOverPage) },
  { path: 'settings',  loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'customize', loadComponent: () => import('./pages/customize/customize.page').then(m => m.CustomizePage) },
  { path: 'gift',      loadComponent: () => import('./pages/gift/gift.page').then(m => m.GiftPage) },
];
```

- [ ] **Step 5: Create APP_INITIALIZER in app.config.ts**

Edit `src/app/app.config.ts` (or create it if missing) :
```ts
import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { routes } from './app.routes';
import { SettingsService } from './core/services/settings.service';
import { WalletService } from './core/services/wallet.service';
import { GiftService } from './core/services/gift.service';
import { AdsService } from './core/services/ads.service';

export function initAll() {
  return async () => {
    const settings = inject(SettingsService);
    const wallet   = inject(WalletService);
    const gift     = inject(GiftService);
    const ads      = inject(AdsService);
    await Promise.all([settings.load(), wallet.load(), gift.load()]);
    if (Capacitor.isNativePlatform()) await ads.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideIonicAngular({ mode: 'ios' }),
    { provide: APP_INITIALIZER, useFactory: initAll, multi: true },
  ],
};
```

- [ ] **Step 6: Run tests, verify pass**

```bash
npm test -- --watch=false
```

Expected: 4 new passes (GiftService) + all previous still pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(services): add GiftService + wire routes and APP_INITIALIZER"
```

---

## Task 10: HomePage

**Files:**
- Create: `src/app/pages/home/home.page.ts`, `home.page.html`, `home.page.scss`

**Interfaces:**
- Consumes: `WalletService`, `AdsService`
- Produces: route `/`. Shows logo, coins, best, Play button, 4 icon buttons.

- [ ] **Step 1: Create home.page.ts**

Create `src/app/pages/home/home.page.ts`:
```ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline } from 'ionicons/icons';
import { WalletService } from 'src/app/core/services/wallet.service';
import { AdsService } from 'src/app/core/services/ads.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, RouterLink],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  wallet = inject(WalletService);
  private ads = inject(AdsService);
  private router = inject(Router);
  constructor() {
    addIcons({ settingsOutline, giftOutline, shirtOutline, trophyOutline, playOutline });
  }
  ngOnInit() { this.ads.showBanner(); }
  ngOnDestroy() { this.ads.hideBanner(); }
  play() { this.router.navigateByUrl('/game'); }
}
```

- [ ] **Step 2: Create home.page.html**

Create `src/app/pages/home/home.page.html`:
```html
<ion-content class="home-content" [fullscreen]="true">
  <div class="home-wrap">
    <h1 class="logo">FallDown<span>Ball</span></h1>
    <div class="stats">
      <div class="stat">
        <span class="label">Coins</span>
        <span class="value">{{ wallet.coins() }}</span>
      </div>
      <div class="stat">
        <span class="label">Best</span>
        <span class="value">{{ wallet.best() }}</span>
      </div>
    </div>
    <ion-button expand="block" size="large" class="play-btn" (click)="play()">
      <ion-icon slot="start" name="play-outline"></ion-icon> Play
    </ion-button>
    <div class="icon-row">
      <ion-button fill="clear" shape="round" routerLink="/settings"><ion-icon name="settings-outline"></ion-icon></ion-button>
      <ion-button fill="clear" shape="round" routerLink="/customize"><ion-icon name="shirt-outline"></ion-icon></ion-button>
      <ion-button fill="clear" shape="round" routerLink="/gift"><ion-icon name="gift-outline"></ion-icon></ion-button>
      <ion-button fill="clear" shape="round" disabled><ion-icon name="trophy-outline"></ion-icon></ion-button>
    </div>
  </div>
</ion-content>
```

- [ ] **Step 3: Create home.page.scss**

Create `src/app/pages/home/home.page.scss`:
```scss
.home-content { --background: linear-gradient(#0a0f1c, #1a1030); }
.home-wrap {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100%; padding: env(safe-area-inset-top) 24px env(safe-area-inset-bottom);
  gap: 32px;
}
.logo { color: #fff; font-size: 48px; margin: 0; }
.logo span { color: #4fc3f7; }
.stats { display: flex; gap: 24px; }
.stat { display: flex; flex-direction: column; align-items: center; color: #eee; }
.stat .label { font-size: 12px; opacity: .6; }
.stat .value { font-size: 24px; font-weight: 700; }
.play-btn { width: 220px; --background: #ffd54f; --color: #000; font-weight: 700; }
.icon-row { display: flex; gap: 16px; }
.icon-row ion-icon { color: #fff; font-size: 28px; }
```

- [ ] **Step 4: Smoke run**

```bash
npm run start
```

Open `http://localhost:4200/`. Expect : logo, coins=0 best=0, Play button and 4 icons. Clicking Play tries to navigate (will fail until GamePage exists — OK). Kill with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pages): add HomePage with coins/best display and nav"
```

---

## Task 11: GamePage (integrates GameEngine)

**Files:**
- Create: `src/app/pages/game/game.page.ts`, `game.page.html`, `game.page.scss`

**Interfaces:**
- Consumes: `GameEngine`, `WalletService`, `SettingsService`, `Haptics` plugin
- Produces: route `/game`. Canvas + HUD (score/coins/pause) + pause overlay. On game-over emits navigation to `/game-over` carrying the result.

- [ ] **Step 1: Create game.page.ts**

Create `src/app/pages/game/game.page.ts`:
```ts
import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pauseOutline, playOutline, homeOutline, refreshOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GameEngine } from 'src/app/core/game/game-engine';
import { WalletService } from 'src/app/core/services/wallet.service';
import { SettingsService } from 'src/app/core/services/settings.service';
import { AdsService } from 'src/app/core/services/ads.service';

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
```

- [ ] **Step 2: Create game.page.html**

Create `src/app/pages/game/game.page.html`:
```html
<ion-content [fullscreen]="true" class="game-content">
  <div class="hud">
    <span>Score <b>{{ engine?.score() ?? 0 }}</b></span>
    <span>Coins <b>{{ engine?.coins() ?? 0 }}</b></span>
    <ion-button fill="clear" (click)="togglePause()">
      <ion-icon slot="icon-only" [name]="paused() ? 'play-outline' : 'pause-outline'"></ion-icon>
    </ion-button>
  </div>
  <canvas #cv class="game-canvas"></canvas>
  @if (paused()) {
    <div class="pause-overlay">
      <h2>PAUSE</h2>
      <ion-button (click)="togglePause()"><ion-icon slot="start" name="play-outline"></ion-icon>Resume</ion-button>
      <ion-button (click)="replay()"><ion-icon slot="start" name="refresh-outline"></ion-icon>Replay</ion-button>
      <ion-button fill="outline" (click)="home()"><ion-icon slot="start" name="home-outline"></ion-icon>Home</ion-button>
    </div>
  }
</ion-content>
```

- [ ] **Step 3: Create game.page.scss**

Create `src/app/pages/game/game.page.scss`:
```scss
.game-content { --background: #000; }
.hud {
  position: absolute; top: env(safe-area-inset-top); left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; z-index: 10; color: #fff; text-shadow: 0 1px 2px #000;
}
.hud ion-button { --color: #fff; }
.game-canvas {
  display: block; margin: auto;
  width: 100%; max-width: 480px;
  height: 100%; max-height: 854px;
  touch-action: none;
}
.pause-overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  justify-content: center; align-items: center; gap: 16px;
  background: rgba(0,0,0,0.6); z-index: 20; color: #fff;
}
.pause-overlay h2 { font-size: 36px; margin: 0; }
```

- [ ] **Step 4: Smoke run**

```bash
npm run start
```

Open `http://localhost:4200/game`. Expect : canvas showing game, HUD score/coins top, Pause button, playable with arrow keys. On death the browser alert about state navigation (OK, GameOverPage exists in next task).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pages): add GamePage with canvas + HUD + pause overlay"
```

---

## Task 12: GameOverPage

**Files:**
- Create: `src/app/pages/game-over/game-over.page.ts`, `game-over.page.html`, `game-over.page.scss`

**Interfaces:**
- Consumes: `router.getCurrentNavigation()?.extras.state` → `{ score, coins, newRecord }`, `WalletService`, `AdsService`
- Produces: route `/game-over`. Replay/Home buttons + Save-me (rewarded ad) button that routes back to `/game` with revive flag.

- [ ] **Step 1: Create game-over.page.ts**

Create `src/app/pages/game-over/game-over.page.ts`:
```ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline, homeOutline, videocamOutline } from 'ionicons/icons';
import { WalletService } from 'src/app/core/services/wallet.service';
import { AdsService } from 'src/app/core/services/ads.service';

@Component({
  selector: 'app-game-over',
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
  templateUrl: './game-over.page.html',
  styleUrls: ['./game-over.page.scss'],
})
export class GameOverPage implements OnInit {
  wallet = inject(WalletService);
  private ads = inject(AdsService);
  private router = inject(Router);
  score = 0; coins = 0; newRecord = false;
  reviveAvailable = true;
  reviving = false;

  constructor() { addIcons({ refreshOutline, homeOutline, videocamOutline }); }

  ngOnInit() {
    const st = history.state as any;
    this.score     = st?.score ?? 0;
    this.coins     = st?.coins ?? 0;
    this.newRecord = !!st?.newRecord;
    this.ads.showBanner();
  }

  replay() { this.router.navigateByUrl('/game'); }
  home()   { this.ads.hideBanner(); this.router.navigateByUrl('/'); }

  async revive() {
    this.reviving = true;
    const ok = await this.ads.showRewarded();
    this.reviving = false;
    if (ok) {
      this.reviveAvailable = false;
      this.ads.hideBanner();
      this.router.navigate(['/game'], { state: { revive: true } });
    }
  }
}
```

- [ ] **Step 2: Create game-over.page.html**

Create `src/app/pages/game-over/game-over.page.html`:
```html
<ion-content [fullscreen]="true" class="over-content">
  <div class="over-wrap">
    @if (newRecord) { <div class="record">★ NEW RECORD ★</div> }
    <h1>Game Over</h1>
    <div class="stats">
      <div><span>Score</span><b>{{ score }}</b></div>
      <div><span>Best</span><b>{{ wallet.best() }}</b></div>
      <div><span>Coins</span><b>+{{ coins }} ({{ wallet.coins() }})</b></div>
    </div>
    @if (reviveAvailable) {
      <ion-button class="revive-btn" (click)="revive()" [disabled]="reviving">
        <ion-icon slot="start" name="videocam-outline"></ion-icon>
        Watch Ad to Continue
      </ion-button>
    }
    <ion-button expand="block" (click)="replay()">
      <ion-icon slot="start" name="refresh-outline"></ion-icon> Replay
    </ion-button>
    <ion-button expand="block" fill="outline" (click)="home()">
      <ion-icon slot="start" name="home-outline"></ion-icon> Home
    </ion-button>
  </div>
</ion-content>
```

- [ ] **Step 3: Create game-over.page.scss**

Create `src/app/pages/game-over/game-over.page.scss`:
```scss
.over-content { --background: linear-gradient(#1a0a1c, #0a0f1c); }
.over-wrap {
  display: flex; flex-direction: column; justify-content: center;
  min-height: 100%; padding: env(safe-area-inset-top) 24px env(safe-area-inset-bottom);
  gap: 16px; color: #fff;
}
.record { color: #ffd54f; font-weight: 700; text-align: center; animation: pulse 1s infinite alternate; }
h1 { text-align: center; margin: 0; font-size: 36px; }
.stats { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.stats div { display: flex; gap: 8px; font-size: 18px; }
.stats span { opacity: .7; width: 60px; text-align: right; }
.revive-btn { --background: #ff6e6e; --color: #fff; font-weight: 700; }
@keyframes pulse { to { opacity: .5; } }
```

- [ ] **Step 4: Also handle revive on GamePage**

Modify `src/app/pages/game/game.page.ts` method `ionViewDidEnter`, add at the end:
```ts
const st = history.state as any;
if (st?.revive) this.engine.revive();
```

- [ ] **Step 5: Smoke run**

```bash
npm run start
```

Open browser, play until death. Expect : navigation to `/game-over`, stats shown, Replay reruns. "Watch Ad" in browser logs failure (plugin native-only) — OK.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(pages): add GameOverPage with revive flow"
```

---

## Task 13: SettingsPage

**Files:**
- Create: `src/app/pages/settings/settings.page.ts`, `settings.page.html`, `settings.page.scss`

**Interfaces:**
- Consumes: `SettingsService`, `IonToggle`, `IonBackButton`, `IonHeader`
- Produces: route `/settings`. 4 toggles bound to signals, saved on change.

- [ ] **Step 1: Create settings.page.ts**

Create `src/app/pages/settings/settings.page.ts`:
```ts
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonList, IonItem, IonLabel, IonToggle, IonRadioGroup, IonRadio
} from '@ionic/angular/standalone';
import { SettingsService } from 'src/app/core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton,
            IonButtons, IonList, IonItem, IonLabel, IonToggle, IonRadioGroup, IonRadio],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  settings = inject(SettingsService);

  async update<K extends 'sound'|'music'|'vibration'|'controlMode'>(key: K, value: any) {
    (this.settings[key] as any).set(value);
    await this.settings.save();
  }
}
```

- [ ] **Step 2: Create settings.page.html**

Create `src/app/pages/settings/settings.page.html`:
```html
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/"></ion-back-button></ion-buttons>
    <ion-title>Settings</ion-title>
  </ion-toolbar>
</ion-header>
<ion-content [fullscreen]="true">
  <ion-list inset="true">
    <ion-item>
      <ion-label>Sound</ion-label>
      <ion-toggle slot="end" [checked]="settings.sound()"
                  (ionChange)="update('sound', $event.detail.checked)"></ion-toggle>
    </ion-item>
    <ion-item>
      <ion-label>Music</ion-label>
      <ion-toggle slot="end" [checked]="settings.music()"
                  (ionChange)="update('music', $event.detail.checked)"></ion-toggle>
    </ion-item>
    <ion-item>
      <ion-label>Vibration</ion-label>
      <ion-toggle slot="end" [checked]="settings.vibration()"
                  (ionChange)="update('vibration', $event.detail.checked)"></ion-toggle>
    </ion-item>
  </ion-list>
  <ion-list inset="true">
    <ion-radio-group [value]="settings.controlMode()"
                     (ionChange)="update('controlMode', $event.detail.value)">
      <ion-item><ion-radio value="touch">Touch controls</ion-radio></ion-item>
      <ion-item><ion-radio value="tilt">Tilt controls</ion-radio></ion-item>
    </ion-radio-group>
  </ion-list>
</ion-content>
```

- [ ] **Step 3: Create settings.page.scss**

Create `src/app/pages/settings/settings.page.scss`:
```scss
ion-content { --background: #0f0f1a; }
```

- [ ] **Step 4: Smoke run**

```bash
npm run start
```

Open `http://localhost:4200/settings`. Toggle each option, refresh page, expect values to persist (via Preferences in web = IndexedDB).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pages): add SettingsPage with persisted toggles"
```

---

## Task 14: CustomizePage

**Files:**
- Create: `src/app/pages/customize/customize.page.ts`, `customize.page.html`, `customize.page.scss`

**Interfaces:**
- Consumes: `WalletService`, Ionic `IonToast` (via `toastController`)
- Produces: route `/customize`. Two sections (skins, backgrounds) with 5 and 3 items. Each item shows price if locked, "Equip" if owned.

- [ ] **Step 1: Create customize.page.ts**

Create `src/app/pages/customize/customize.page.ts`:
```ts
import { Component, inject } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonButton, IonSegment, IonSegmentButton, IonLabel, IonIcon, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, checkmarkCircle } from 'ionicons/icons';
import { WalletService } from 'src/app/core/services/wallet.service';

const SKINS = [
  { id: 0, color: '#ffd54f', price: 0 },
  { id: 1, color: '#ff6e6e', price: 100 },
  { id: 2, color: '#4fe3c1', price: 200 },
  { id: 3, color: '#b388ff', price: 300 },
  { id: 4, color: '#ffa94d', price: 500 },
];
const BGS = [
  { id: 0, name: 'Night',   gradient: 'linear-gradient(#0a0f1c, #1a1030)', price: 0 },
  { id: 1, name: 'Sunset',  gradient: 'linear-gradient(#2b1055, #ff4e50)', price: 150 },
  { id: 2, name: 'Ocean',   gradient: 'linear-gradient(#001f3f, #0074D9)', price: 250 },
];

@Component({
  selector: 'app-customize',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
            IonButton, IonSegment, IonSegmentButton, IonLabel, IonIcon],
  templateUrl: './customize.page.html',
  styleUrls: ['./customize.page.scss'],
})
export class CustomizePage {
  wallet = inject(WalletService);
  private toastCtrl = inject(ToastController);
  tab: 'skin' | 'bg' = 'skin';
  skins = SKINS;
  bgs = BGS;

  constructor() { addIcons({ lockClosedOutline, checkmarkCircle }); }

  async tapSkin(s: typeof SKINS[number]) {
    const unlocked = this.wallet.unlockedSkins().has(s.id);
    if (unlocked) { this.wallet.equipSkin(s.id); return; }
    if (!this.wallet.buySkin(s.id, s.price)) {
      const t = await this.toastCtrl.create({ message: 'Not enough coins', duration: 1500, color: 'warning' });
      await t.present();
      return;
    }
    this.wallet.equipSkin(s.id);
  }

  async tapBg(b: typeof BGS[number]) {
    const unlocked = this.wallet.unlockedBgs().has(b.id);
    if (unlocked) { this.wallet.equipBg(b.id); return; }
    if (!this.wallet.buyBg(b.id, b.price)) {
      const t = await this.toastCtrl.create({ message: 'Not enough coins', duration: 1500, color: 'warning' });
      await t.present();
      return;
    }
    this.wallet.equipBg(b.id);
  }
}
```

- [ ] **Step 2: Create customize.page.html**

Create `src/app/pages/customize/customize.page.html`:
```html
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/"></ion-back-button></ion-buttons>
    <ion-title>Shop ({{ wallet.coins() }} coins)</ion-title>
  </ion-toolbar>
</ion-header>
<ion-content [fullscreen]="true">
  <ion-segment [value]="tab" (ionChange)="tab = $any($event.detail.value)">
    <ion-segment-button value="skin"><ion-label>Balls</ion-label></ion-segment-button>
    <ion-segment-button value="bg"><ion-label>Backgrounds</ion-label></ion-segment-button>
  </ion-segment>

  @if (tab === 'skin') {
    <div class="grid">
      @for (s of skins; track s.id) {
        <button class="tile" (click)="tapSkin(s)">
          <div class="ball" [style.background]="s.color"></div>
          @if (wallet.unlockedSkins().has(s.id)) {
            @if (wallet.equippedSkin() === s.id) {
              <span class="eq"><ion-icon name="checkmark-circle"></ion-icon> Equipped</span>
            } @else { <span class="eq">Equip</span> }
          } @else {
            <span class="price"><ion-icon name="lock-closed-outline"></ion-icon> {{ s.price }}</span>
          }
        </button>
      }
    </div>
  } @else {
    <div class="grid">
      @for (b of bgs; track b.id) {
        <button class="tile" (click)="tapBg(b)">
          <div class="bg" [style.background]="b.gradient"></div>
          <strong>{{ b.name }}</strong>
          @if (wallet.unlockedBgs().has(b.id)) {
            @if (wallet.equippedBg() === b.id) {
              <span class="eq"><ion-icon name="checkmark-circle"></ion-icon> Equipped</span>
            } @else { <span class="eq">Equip</span> }
          } @else {
            <span class="price"><ion-icon name="lock-closed-outline"></ion-icon> {{ b.price }}</span>
          }
        </button>
      }
    </div>
  }
</ion-content>
```

- [ ] **Step 3: Create customize.page.scss**

Create `src/app/pages/customize/customize.page.scss`:
```scss
ion-content { --background: #0f0f1a; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px; }
.tile {
  background: #1a1d26; border: none; border-radius: 12px; padding: 16px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: #eee; cursor: pointer;
}
.ball { width: 48px; height: 48px; border-radius: 50%; }
.bg   { width: 100%; height: 48px; border-radius: 6px; }
.price { color: #ffd54f; font-size: 14px; display: flex; align-items: center; gap: 4px; }
.eq    { color: #4fe3c1; font-size: 14px; display: flex; align-items: center; gap: 4px; }
```

- [ ] **Step 4: Smoke run**

```bash
npm run start
```

Open `http://localhost:4200/customize`. Default state: ball 0 equipped, bg 0 equipped, others locked. Add coins via browser console (`angular.wallet.addCoins(500)` won't work directly — use Settings UI test flow in Task 17). For now expect UI renders correctly, click on locked ball → toast "Not enough coins".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pages): add CustomizePage with skin/bg shop"
```

---

## Task 15: GiftPage (prize wheel)

**Files:**
- Create: `src/app/pages/gift/gift.page.ts`, `gift.page.html`, `gift.page.scss`

**Interfaces:**
- Consumes: `GiftService`, `WalletService`, `AdsService`, prize table `PRIZE_TABLE`
- Produces: route `/gift`. Canvas-rendered 8-sector wheel, spin button, countdown, "free gift" via rewarded ad.

- [ ] **Step 1: Create gift.page.ts**

Create `src/app/pages/gift/gift.page.ts`:
```ts
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { videocamOutline, giftOutline } from 'ionicons/icons';
import { GiftService, PRIZE_TABLE } from 'src/app/core/services/gift.service';
import { WalletService } from 'src/app/core/services/wallet.service';

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
  prizes = PRIZE_TABLE;
  rotation = 0;
  spinning = signal(false);
  lastWon = signal<number|null>(null);
  countdown = signal('');
  private tickId = 0;

  constructor() { addIcons({ videocamOutline, giftOutline }); }

  ngOnInit() {
    this.drawWheel();
    this.updateCountdown();
    this.tickId = window.setInterval(() => this.updateCountdown(), 1000) as any;
  }
  ngOnDestroy() { clearInterval(this.tickId); }

  private updateCountdown() {
    const ms = this.gift.msUntilNextClaim();
    if (ms <= 0) { this.countdown.set('Available!'); return; }
    const h  = Math.floor(ms / 3_600_000);
    const m  = Math.floor((ms % 3_600_000) / 60_000);
    const s  = Math.floor((ms % 60_000) / 1_000);
    this.countdown.set(`${h}h ${m}m ${s}s`);
  }

  private drawWheel(angle = 0) {
    const cv = this.wheelRef.nativeElement;
    const ctx = cv.getContext('2d')!;
    const n = this.prizes.length;
    const r = Math.min(cv.width, cv.height) / 2;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width/2, cv.height/2);
    ctx.rotate(angle);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i+1) / n) * Math.PI * 2;
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
    // pointer at top
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cv.width/2 - 10, 0);
    ctx.lineTo(cv.width/2 + 10, 0);
    ctx.lineTo(cv.width/2, 20);
    ctx.closePath(); ctx.fill();
  }

  async spin() {
    if (!this.gift.canClaim() || this.spinning()) return;
    this.spinning.set(true);
    const prize = await this.gift.spinWheel();
    const idx = this.prizes.indexOf(prize);
    const target = -((idx + 0.5) / this.prizes.length) * Math.PI * 2 - Math.PI/2;
    const start = performance.now();
    const dur = 3000;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      this.rotation = eased * (target + Math.PI * 8); // 4 full turns
      this.drawWheel(this.rotation);
      if (t < 1) requestAnimationFrame(animate);
      else { this.spinning.set(false); this.lastWon.set(prize); }
    };
    requestAnimationFrame(animate);
  }

  async freeGift() {
    if (this.spinning()) return;
    this.spinning.set(true);
    const prize = await this.gift.claimFreeGift();
    this.spinning.set(false);
    if (prize > 0) this.lastWon.set(prize);
  }
}
```

- [ ] **Step 2: Create gift.page.html**

Create `src/app/pages/gift/gift.page.html`:
```html
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/"></ion-back-button></ion-buttons>
    <ion-title>Daily Gift</ion-title>
  </ion-toolbar>
</ion-header>
<ion-content [fullscreen]="true">
  <div class="gift-wrap">
    <canvas #wheel width="280" height="280" class="wheel"></canvas>
    <p class="countdown">Next spin in : <b>{{ countdown() }}</b></p>
    @if (lastWon() !== null) { <p class="won">You won {{ lastWon() }} coins! ✨</p> }
    <ion-button expand="block" (click)="spin()" [disabled]="!gift.canClaim() || spinning()">
      <ion-icon slot="start" name="gift-outline"></ion-icon> Daily spin
    </ion-button>
    <ion-button expand="block" fill="outline" (click)="freeGift()" [disabled]="spinning()">
      <ion-icon slot="start" name="videocam-outline"></ion-icon> Watch Ad for extra spin
    </ion-button>
  </div>
</ion-content>
```

- [ ] **Step 3: Create gift.page.scss**

Create `src/app/pages/gift/gift.page.scss`:
```scss
ion-content { --background: #0f0f1a; }
.gift-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px; color: #fff; }
.wheel { background: #1a1d26; border-radius: 50%; }
.countdown { opacity: .8; }
.won { color: #ffd54f; font-weight: 700; }
```

- [ ] **Step 4: Smoke run**

```bash
npm run start
```

Open `http://localhost:4200/gift`. Expect : wheel renders, spin animates, prize credited to wallet, countdown appears for 24h.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pages): add GiftPage with animated prize wheel"
```

---

## Task 16: iOS build pipeline (SSH to Mac)

**Files:**
- Create: `scripts/build-ios.sh`, `scripts/sync-to-mac.sh`
- Modify: `ios/App/App/Info.plist` (orientation, AdMob plist entries)

**Interfaces:**
- Consumes: SSH alias `mac` configured in `~/.ssh/config` (user already has it)
- Produces: command `bash scripts/build-ios.sh` from Windows that produces an iOS Simulator `.app` ready to boot.

- [ ] **Step 1: Write sync-to-mac.sh**

Create `scripts/sync-to-mac.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
LOCAL="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="FallDownBall"
rsync -az --delete \
      --exclude=node_modules/ \
      --exclude=www/ \
      --exclude=ios/App/Pods/ \
      --exclude=ios/App/build/ \
      --exclude=.angular/ \
      --exclude=.git/ \
      "$LOCAL/" "mac:~/${REMOTE}/"
```

- [ ] **Step 2: Write build-ios.sh**

Create `scripts/build-ios.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building web bundle (Windows)"
cd "$HERE/.."
npm run build

echo "==> Syncing to Mac"
bash "$HERE/sync-to-mac.sh"

echo "==> Capacitor sync + pod install + xcodebuild (Mac)"
ssh mac bash -lc '
  set -euo pipefail
  cd ~/FallDownBall
  [ -d node_modules ] || npm ci
  npx cap sync ios
  cd ios/App
  pod install
  xcodebuild \
    -workspace App.xcworkspace \
    -scheme App \
    -configuration Debug \
    -sdk iphonesimulator \
    -derivedDataPath build/ \
    build
  echo "==> Build output: ~/FallDownBall/ios/App/build/Build/Products/Debug-iphonesimulator/App.app"
'
```

- [ ] **Step 3: Edit Info.plist for orientations + AdMob**

Edit `ios/App/App/Info.plist`. Ensure these keys exist:
```xml
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
</array>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-3940256099942544~1458002511</string>
<key>NSUserTrackingUsageDescription</key>
<string>This app uses tracking to show you relevant ads.</string>
```

- [ ] **Step 4: Edit iOS deployment target in Podfile**

Edit `ios/App/Podfile` first non-comment line :
```ruby
platform :ios, '13.0'
```

- [ ] **Step 5: Make scripts executable**

```bash
chmod +x scripts/build-ios.sh scripts/sync-to-mac.sh
```

- [ ] **Step 6: Run the build**

From Windows (via SSH to Mac internally):
```bash
bash scripts/build-ios.sh
```

Expected: ends with "Build output: ~/FallDownBall/ios/App/build/Build/Products/Debug-iphonesimulator/App.app".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(ios): add build pipeline (sync + cap sync + pod install + xcodebuild) via SSH"
```

---

## Task 17: Simulator smoke test + launch script

**Files:**
- Create: `scripts/run-sim.sh`

**Interfaces:**
- Consumes: output of Task 16 (`App.app`)
- Produces: launch command for iOS Simulator on Mac

- [ ] **Step 1: Write run-sim.sh**

Create `scripts/run-sim.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
DEVICE="${1:-iPhone 15}"
APP_PATH="~/FallDownBall/ios/App/build/Build/Products/Debug-iphonesimulator/App.app"
BUNDLE_ID="com.saad.falldownball"
ssh mac bash -lc "
  xcrun simctl boot '${DEVICE}' 2>/dev/null || true
  open -a Simulator
  xcrun simctl install booted ${APP_PATH}
  xcrun simctl launch --console-pty booted ${BUNDLE_ID}
"
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x scripts/run-sim.sh
bash scripts/run-sim.sh "iPhone 15"
```

Expected: Simulator opens on Mac, app launches, HomePage visible.

- [ ] **Step 3: Manual smoke checklist (run on simulator)**

Verify all items pass :
- [ ] Home → logo + coins=0 + best=0 + Play + 4 icon buttons visible
- [ ] Play → canvas shows game, HUD score + coins visible
- [ ] Hero reacts to left/right (tap halves on simulator = click)
- [ ] Collect a coin → coins increment, visual coin burst
- [ ] Collect a shield → aura visible, hero can hit laser once without dying
- [ ] Collect a magnet → nearby coins pulled
- [ ] Die → navigation to `/game-over` with score, best, coins
- [ ] "Watch Ad" button → test rewarded ad shows, after close → `/game` with hero revived
- [ ] Replay works, Home works
- [ ] Settings page : toggle sound off, play again, verify no audio (if sound hook implemented)
- [ ] Customize page : with coins ≥ 100, buy a skin → equipped on next game
- [ ] Gift page : first spin credits coins, countdown appears, second spin disabled
- [ ] Rotate iPad simulator portrait → landscape : canvas recenters without stretching
- [ ] AdMob test banner visible on `/`, `/game-over`, `/customize`, `/gift`, hidden on `/game`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(scripts): add iOS Simulator launch script + smoke checklist"
```

---

## Self-Review

**1. Spec coverage check** (section → task) :
- §1 Scope "C" → Tasks 10-15 (6 pages) ✓
- §2 Stack (Ionic/Angular/Capacitor/Canvas/AdMob) → Task 1-2 ✓
- §3 Arborescence → File Structure above ✓
- §4 Pages & routes → Task 9 (routes) + 10-15 (pages) ✓
- §5.1 WalletService → Task 7 ✓
- §5.2 SettingsService → Task 6 ✓
- §5.3 AdsService + iOS test IDs → Task 8 ✓
- §5.4 GiftService + PRIZE_TABLE → Task 9 ✓
- §5.5 APP_INITIALIZER → Task 9 Step 5 ✓
- §6 Game engine (entities + physics + GameEngine) → Tasks 3, 4, 5 ✓
- §7 Rendu & multi-écrans (DPR + safe-area + orientation) → Task 11 Step 1 + Task 16 Step 3 ✓
- §8 Build iOS via SSH → Task 16 ✓
- §9 Error handling (Preferences fallback, AudioContext, rewarded timeout) → covered in services + ads ✓
- §10 Tests (unit for physics/wallet/gift, smoke manual) → Tasks 4, 7, 9, 17 ✓

**2. Placeholder scan** : no TBD/TODO/FIXME found. All code blocks contain real implementations. ✓

**3. Type consistency** :
- `collideBoard`, `collideProp`, `applyGravity`, `clampX`, `applyMagnet` — consistent names across Tasks 4 & 5 ✓
- `GameEvent` type matches between engine `events$` and GamePage subscription ✓
- `WalletService.buySkin(id, price): boolean` matches CustomizePage call ✓
- `GiftService.spinWheel(): Promise<number>` + `claimFreeGift(): Promise<number>` match GiftPage ✓
- `PRIZE_TABLE` exported from gift.service.ts, imported in GiftPage ✓
- `SKINS` array in game-engine.ts (5 colors) matches CustomizePage SKINS (5 ids) ✓

Plan complete.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-10-21-falldownball.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
