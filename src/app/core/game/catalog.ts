export type SkinEffect = 'none' | 'fire' | 'rainbow';

export interface SkinDef {
  id: number;
  nameKey: string;
  color: string;
  effect: SkinEffect;
  price: number;
  requiredScore: number;
}

export interface BgDef {
  id: number;
  nameKey: string;
  gradient: string;
  price: number;
  requiredScore: number;
}

export const SKINS: SkinDef[] = [
  { id: 0, nameKey: 'skin.classic', color: '#ffd54f', effect: 'none',    price: 0,    requiredScore: 0 },
  { id: 1, nameKey: 'skin.ruby',    color: '#ff5f6d', effect: 'none',    price: 100,  requiredScore: 0 },
  { id: 2, nameKey: 'skin.mint',    color: '#4fe3c1', effect: 'none',    price: 200,  requiredScore: 0 },
  { id: 3, nameKey: 'skin.violet',  color: '#b388ff', effect: 'none',    price: 300,  requiredScore: 0 },
  { id: 4, nameKey: 'skin.amber',   color: '#ffa94d', effect: 'none',    price: 400,  requiredScore: 0 },
  { id: 5, nameKey: 'skin.fire',    color: '#ff3d00', effect: 'fire',    price: 600,  requiredScore: 500 },
  { id: 6, nameKey: 'skin.rainbow', color: '#ff2d55', effect: 'rainbow', price: 1000, requiredScore: 1500 },
];

export const BGS: BgDef[] = [
  { id: 0, nameKey: 'bg.night',   gradient: 'linear-gradient(#0a0f1c, #1a1030)', price: 0,    requiredScore: 0 },
  { id: 1, nameKey: 'bg.sunset',  gradient: 'linear-gradient(#2b1055, #ff4e50)', price: 150,  requiredScore: 0 },
  { id: 2, nameKey: 'bg.ocean',   gradient: 'linear-gradient(#001f3f, #0074D9)', price: 250,  requiredScore: 0 },
  { id: 3, nameKey: 'bg.forest',  gradient: 'linear-gradient(#0b3d2e, #2e7d32)', price: 400,  requiredScore: 300 },
  { id: 4, nameKey: 'bg.lava',    gradient: 'linear-gradient(#1a0000, #ff3d00)', price: 600,  requiredScore: 800 },
  { id: 5, nameKey: 'bg.galaxy',  gradient: 'linear-gradient(#000428, #8e2de2)', price: 1000, requiredScore: 1500 },
];

export function getSkin(id: number): SkinDef {
  return SKINS[id] ?? SKINS[0];
}
