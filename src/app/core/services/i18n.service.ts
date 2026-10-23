import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type Locale = 'en' | 'fr';

const KEY = 'fdb_locale';

const T: Record<string, Record<Locale, string>> = {
  'common.coins':         { en: 'Coins',               fr: 'Pièces' },
  'common.best':          { en: 'Best',                fr: 'Record' },
  'common.score':         { en: 'Score',               fr: 'Score' },
  'common.replay':        { en: 'Replay',              fr: 'Rejouer' },
  'common.home':          { en: 'Home',                fr: 'Accueil' },
  'home.play':            { en: 'Play',                fr: 'Jouer' },
  'game.pause':           { en: 'PAUSE',               fr: 'PAUSE' },
  'game.resume':          { en: 'Resume',              fr: 'Reprendre' },
  'gameOver.title':       { en: 'Game Over',           fr: 'Partie terminée' },
  'gameOver.newRecord':   { en: '★ NEW RECORD ★',      fr: '★ NOUVEAU RECORD ★' },
  'gameOver.watchAd':     { en: 'Watch Ad to Continue',fr: 'Regarder une pub pour continuer' },
  'shop.title':           { en: 'Shop',                fr: 'Boutique' },
  'shop.balls':           { en: 'Balls',               fr: 'Balles' },
  'shop.backgrounds':     { en: 'Backgrounds',         fr: 'Fonds' },
  'shop.equipped':        { en: 'Equipped',            fr: 'Équipé' },
  'shop.equip':           { en: 'Equip',               fr: 'Équiper' },
  'shop.notEnough':       { en: 'Not enough coins',    fr: 'Pas assez de pièces' },
  'shop.needScore':       { en: 'Reach score {n} to unlock', fr: 'Atteignez {n} pour débloquer' },
  'skin.classic':         { en: 'Classic',             fr: 'Classique' },
  'skin.ruby':            { en: 'Ruby',                fr: 'Rubis' },
  'skin.mint':            { en: 'Mint',                fr: 'Menthe' },
  'skin.violet':          { en: 'Violet',              fr: 'Violet' },
  'skin.amber':           { en: 'Amber',               fr: 'Ambre' },
  'skin.fire':            { en: 'Fire',                fr: 'Feu' },
  'skin.rainbow':         { en: 'Rainbow',             fr: 'Arc-en-ciel' },
  'bg.night':             { en: 'Night',               fr: 'Nuit' },
  'bg.sunset':            { en: 'Sunset',              fr: 'Coucher de soleil' },
  'bg.ocean':             { en: 'Ocean',               fr: 'Océan' },
  'bg.forest':            { en: 'Forest',              fr: 'Forêt' },
  'bg.lava':              { en: 'Lava',                fr: 'Lave' },
  'bg.galaxy':            { en: 'Galaxy',              fr: 'Galaxie' },
  'gift.title':           { en: 'Daily Gift',          fr: 'Cadeau quotidien' },
  'gift.nextSpin':        { en: 'Next spin in',        fr: 'Prochain tour dans' },
  'gift.youWon':          { en: 'You won {n} coins! ✨', fr: 'Vous avez gagné {n} pièces ! ✨' },
  'gift.dailySpin':       { en: 'Daily spin',          fr: 'Tour quotidien' },
  'gift.watchAd':         { en: 'Watch Ad for extra spin', fr: 'Regarder une pub pour un tour bonus' },
  'gift.available':       { en: 'Available!',          fr: 'Disponible !' },
  'settings.title':       { en: 'Settings',            fr: 'Paramètres' },
  'settings.sound':       { en: 'Sound',               fr: 'Son' },
  'settings.music':       { en: 'Music',               fr: 'Musique' },
  'settings.vibration':   { en: 'Vibration',           fr: 'Vibration' },
  'settings.touch':       { en: 'Touch controls',      fr: 'Contrôles tactiles' },
  'settings.tilt':        { en: 'Tilt controls',       fr: 'Contrôles par inclinaison' },
  'settings.language':    { en: 'Language',            fr: 'Langue' },
  'settings.lang.en':     { en: 'English',             fr: 'Anglais' },
  'settings.lang.fr':     { en: 'French',              fr: 'Français' },
  'achievements.title':   { en: 'Achievements',        fr: 'Succès' },
  'achievement.unlocked':             { en: '🏆 {name} unlocked (+{reward} coins)',          fr: '🏆 {name} débloqué (+{reward} pièces)' },
  'achievement.first_blood.name':     { en: 'First Fall',                                    fr: 'Première chute' },
  'achievement.first_blood.desc':     { en: 'Finish your first game',                        fr: 'Terminer ta première partie' },
  'achievement.score_100.name':       { en: 'Starter',                                       fr: 'Débutant' },
  'achievement.score_100.desc':       { en: 'Reach a score of 100',                          fr: 'Atteindre un score de 100' },
  'achievement.score_500.name':       { en: 'Climber',                                       fr: 'Grimpeur' },
  'achievement.score_500.desc':       { en: 'Reach a score of 500',                          fr: 'Atteindre un score de 500' },
  'achievement.score_1000.name':      { en: 'Pro',                                           fr: 'Pro' },
  'achievement.score_1000.desc':      { en: 'Reach a score of 1000',                         fr: 'Atteindre un score de 1000' },
  'achievement.score_2000.name':      { en: 'Legend',                                        fr: 'Légende' },
  'achievement.score_2000.desc':      { en: 'Reach a score of 2000',                         fr: 'Atteindre un score de 2000' },
  'achievement.coins_100.name':       { en: 'Treasure Hunter',                               fr: 'Chasseur de trésor' },
  'achievement.coins_100.desc':       { en: '100 coins in a single run',                     fr: '100 pièces en une partie' },
  'achievement.coins_500.name':       { en: 'Rich',                                          fr: 'Riche' },
  'achievement.coins_500.desc':       { en: 'Earn 500 coins total',                          fr: 'Gagner 500 pièces au total' },
  'achievement.shield_saved.name':    { en: 'Guardian',                                      fr: 'Protégé' },
  'achievement.shield_saved.desc':    { en: 'Shield saved you 3 times',                      fr: 'Sauvé 3 fois par un bouclier' },
  'achievement.combo_wooow.name':     { en: 'Wooow!',                                        fr: 'Wooow !' },
  'achievement.combo_wooow.desc':     { en: 'Trigger your first Wooow',                      fr: 'Déclencher ton premier Wooow' },
  'achievement.combo_5x.name':        { en: 'Freefaller',                                    fr: 'Chute libre' },
  'achievement.combo_5x.desc':        { en: 'Fall through 5+ boards in one jump',            fr: "Traverser 5+ étages d'un coup" },
  'achievement.all_skins.name':       { en: 'Collector',                                     fr: 'Collectionneur' },
  'achievement.all_skins.desc':       { en: 'Unlock all 7 ball skins',                       fr: 'Débloquer les 7 skins de balle' },
  'achievement.daily_streak_7.name':  { en: 'Faithful',                                      fr: 'Fidèle' },
  'achievement.daily_streak_7.desc':  { en: 'Claim all missions 7 days in a row',            fr: 'Réclamer toutes les missions 7 jours de suite' },
  'mission.score_single':             { en: 'Score {n} in one run',                          fr: 'Faire {n} points en une partie' },
  'mission.coins_single':             { en: 'Collect {n} coins in a run',                    fr: 'Ramasser {n} pièces en une partie' },
  'mission.runs_day':                 { en: 'Play {n} runs today',                           fr: 'Jouer {n} parties aujourd\'hui' },
  'mission.combos_day':               { en: 'Trigger {n} combos today',                      fr: 'Déclencher {n} combos aujourd\'hui' },
  'mission.powerups_day':             { en: 'Pick up {n} powerups today',                    fr: 'Ramasser {n} bonus aujourd\'hui' },
  'mission.survive_single':           { en: 'Survive {n} seconds in a run',                  fr: 'Survivre {n} secondes en une partie' },
  'mission.claim':                    { en: 'Claim',                                         fr: 'Réclamer' },
  'mission.claimed':                  { en: 'Claimed',                                       fr: 'Réclamé' },
  'mission.rewardToast':              { en: '+{reward} coins',                               fr: '+{reward} pièces' },
  'mission.title':                    { en: 'Daily Missions',                                fr: 'Missions du jour' },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>('en');

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value === 'en' || value === 'fr') { this.locale.set(value); return; }
    } catch {}
    const dev = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
    this.locale.set(dev.startsWith('fr') ? 'fr' : 'en');
  }

  async setLocale(l: Locale): Promise<void> {
    this.locale.set(l);
    try { await Preferences.set({ key: KEY, value: l }); } catch {}
  }

  t(key: string, vars?: Record<string, string | number>): string {
    const entry = T[key];
    let s = entry ? entry[this.locale()] : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }
}
