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
  label: '×2' | '+5' | 'speed' | null;
  consumed: boolean;
  passedHero?: boolean;
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
