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
