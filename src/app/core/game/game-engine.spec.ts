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
    engine = new GameEngine(cv, { skinId: 0, sound: false, height: 640 });
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

  it('emits gameOver event when kill() is called', () =>
    new Promise<void>(resolve => {
      engine.events$.subscribe(ev => {
        if (ev.kind === 'gameOver') {
          expect(ev.score).toBeGreaterThanOrEqual(0);
          resolve();
        }
      });
      (engine as any).kill();
    })
  );

  it('caps combo multi at COMBO_MULTI_CAP (10)', () => {
    // Simulate 6 landings of +2 each → should cap at 10
    for (let i = 0; i < 6; i++) {
      (engine as any).comboMulti.update((m: number) => Math.min(m + 2, 10));
    }
    expect(engine.comboMulti()).toBe(10);
  });

  it('resets combo state on reset()', () => {
    (engine as any).comboMulti.set(5);
    (engine as any).comboMultiTimer = 100;
    (engine as any).wooowCount = 2;
    engine.reset();
    expect(engine.comboMulti()).toBe(1);
    expect(engine.comboMultiFraction()).toBe(0);
    expect((engine as any).wooowCount).toBe(0);
  });
});
