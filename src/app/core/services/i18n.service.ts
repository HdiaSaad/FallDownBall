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
