export type AchievementTrigger =
  | { kind: 'score_run'; min: number }
  | { kind: 'coins_run'; min: number }
  | { kind: 'coins_lifetime'; min: number }
  | { kind: 'shield_saved_lifetime'; min: number }
  | { kind: 'first_wooow' }
  | { kind: 'combo_steps'; min: number }
  | { kind: 'first_run_ended' }
  | { kind: 'all_skins_unlocked'; totalSkins: number }
  | { kind: 'daily_streak'; min: number };

export interface AchievementDef {
  id: string;
  nameKey: string;
  descKey: string;
  reward: number;
  trigger: AchievementTrigger;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood',    nameKey: 'achievement.first_blood.name',    descKey: 'achievement.first_blood.desc',    reward: 50, trigger: { kind: 'first_run_ended' } },
  { id: 'score_100',      nameKey: 'achievement.score_100.name',      descKey: 'achievement.score_100.desc',      reward: 50, trigger: { kind: 'score_run', min: 100 } },
  { id: 'score_500',      nameKey: 'achievement.score_500.name',      descKey: 'achievement.score_500.desc',      reward: 50, trigger: { kind: 'score_run', min: 500 } },
  { id: 'score_1000',     nameKey: 'achievement.score_1000.name',     descKey: 'achievement.score_1000.desc',     reward: 50, trigger: { kind: 'score_run', min: 1000 } },
  { id: 'score_2000',     nameKey: 'achievement.score_2000.name',     descKey: 'achievement.score_2000.desc',     reward: 50, trigger: { kind: 'score_run', min: 2000 } },
  { id: 'coins_100',      nameKey: 'achievement.coins_100.name',      descKey: 'achievement.coins_100.desc',      reward: 50, trigger: { kind: 'coins_run', min: 100 } },
  { id: 'coins_500',      nameKey: 'achievement.coins_500.name',      descKey: 'achievement.coins_500.desc',      reward: 50, trigger: { kind: 'coins_lifetime', min: 500 } },
  { id: 'shield_saved',   nameKey: 'achievement.shield_saved.name',   descKey: 'achievement.shield_saved.desc',   reward: 50, trigger: { kind: 'shield_saved_lifetime', min: 3 } },
  { id: 'combo_wooow',    nameKey: 'achievement.combo_wooow.name',    descKey: 'achievement.combo_wooow.desc',    reward: 50, trigger: { kind: 'first_wooow' } },
  { id: 'combo_5x',       nameKey: 'achievement.combo_5x.name',       descKey: 'achievement.combo_5x.desc',       reward: 50, trigger: { kind: 'combo_steps', min: 5 } },
  { id: 'all_skins',      nameKey: 'achievement.all_skins.name',      descKey: 'achievement.all_skins.desc',      reward: 50, trigger: { kind: 'all_skins_unlocked', totalSkins: 7 } },
  { id: 'daily_streak_7', nameKey: 'achievement.daily_streak_7.name', descKey: 'achievement.daily_streak_7.desc', reward: 50, trigger: { kind: 'daily_streak', min: 7 } },
];
