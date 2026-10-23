export type MissionType =
  | 'score_single'
  | 'coins_single'
  | 'runs_day'
  | 'combos_day'
  | 'powerups_day'
  | 'survive_single';

export interface MissionTemplate {
  type: MissionType;
  targets: number[];        // random pick among these
  reward: number;
  nameKey: string;          // template with {n}
  icon: string;             // emoji
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { type: 'score_single',  targets: [200, 400, 800], reward: 40, nameKey: 'mission.score_single',  icon: '🎯' },
  { type: 'coins_single',  targets: [30, 50, 80],    reward: 40, nameKey: 'mission.coins_single',  icon: '💰' },
  { type: 'runs_day',      targets: [3, 5, 10],      reward: 40, nameKey: 'mission.runs_day',      icon: '🎮' },
  { type: 'combos_day',    targets: [3, 5, 10],      reward: 40, nameKey: 'mission.combos_day',    icon: '⚡' },
  { type: 'powerups_day',  targets: [3, 5, 10],      reward: 40, nameKey: 'mission.powerups_day',  icon: '🛡️' },
  { type: 'survive_single',targets: [60, 90, 120],   reward: 40, nameKey: 'mission.survive_single',icon: '⏱️' },
];

export interface Mission {
  id: string;
  type: MissionType;
  target: number;
  progress: number;
  claimed: boolean;
  reward: number;
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function rollDailyMissions(templates: MissionTemplate[] = MISSION_TEMPLATES, rand: () => number = Math.random): Mission[] {
  const pool = [...templates];
  const picked: MissionTemplate[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map((t, i) => ({
    id: `${todayKey()}-${t.type}-${i}`,
    type: t.type,
    target: t.targets[Math.floor(rand() * t.targets.length)],
    progress: 0,
    claimed: false,
    reward: t.reward,
  }));
}
