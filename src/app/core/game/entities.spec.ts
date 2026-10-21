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
