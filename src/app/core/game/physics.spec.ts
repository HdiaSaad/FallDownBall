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
