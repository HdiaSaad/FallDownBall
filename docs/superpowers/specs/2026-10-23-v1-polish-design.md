# SkyFallBall v1 Polish — Design Spec

**Date** : 2026-10-23
**Auteur** : brainstorming session (Saad + Claude)
**Statut** : validé, prêt pour implementation planning
**Portée** : 6 features de polish pré-App Store (achievements, combos avancés, missions quotidiennes, tutoriel FTUE, haptique riche, share score)

---

## 1. Contexte & objectifs

Le jeu SkyFallBall est fonctionnel : home, game (canvas, laser, powerups, boards, props), game-over + revive, settings (sound/music/vibration/tilt/langue EN+FR), customize (7 skins + 6 bgs avec score-locks), gift (daily wheel), AdMob (banner + interstitial + rewarded), BGM.

**Objectif v1 polish** : ajouter 6 features pour la rétention, la viralité et la qualité perçue avant soumission App Store. Pas de refonte, pas de nouveau mode de jeu. Tout partage la même monnaie unique : **pièces**.

**Non-objectifs** :
- Pas de leaderboard en ligne (Game Center reste hors scope v1).
- Pas d'IAP, pas de 2e monnaie, pas de système XP/niveau joueur.
- Pas de push notifs pour les missions daily.
- Pas de screenshot inclus dans Share (texte pur).
- Pas de badges "nouveau joueur" sur home — tutoriel vit uniquement dans la game.

**Critères de succès** :
- Achievements, missions et combo multi persistent entre sessions.
- Missions se refresh à minuit date locale, pas UTC.
- Tutoriel joué 1x au first launch, replayable depuis Settings.
- Share utilise le share sheet iOS natif, texte localisé EN/FR.
- Max 120 pièces/jour via missions, 100 pièces one-shot via Perfect Run.

---

## 2. Architecture — nouveaux services & modifications

| Service / Module | Rôle | Nouveau / Modifié |
|---|---|---|
| `AchievementService` | Track 12 achievements, émet unlocks | **Nouveau** |
| `MissionsService` | Génère 3 missions/jour, tracke progress, claim | **Nouveau** |
| `TutorialService` | État des 4 étapes du FTUE, flag done | **Nouveau** |
| `GameEngine` | Ajout combo multiplier, Perfect Run, flag tutorialMode | **Modifié** |
| `AudioService` | Dispatch haptique riche par event | **Modifié** |
| `WalletService` | `addCoins` reste la source — pas de modif | Inchangé |
| `HomePage` | Nouveau bouton 🏆 vers /achievements + section missions | **Modifié** |
| `GameOverPage` | Bouton Share | **Modifié** |
| `GamePage` | Overlay tutoriel + HUD combo meter | **Modifié** |
| `SettingsPage` | Lien "Replay tutorial" | **Modifié** |
| `i18n.service.ts` | ~50 nouvelles clés | **Modifié** |
| `/achievements` | Nouvelle page grid 2 colonnes | **Nouveau** |

**Persistance** : 3 nouvelles clés Preferences : `fdb_achievements`, `fdb_missions`, `fdb_tutorial_done`.

**Flux événementiel** :

```
GameEngine.events$ ──▶ GamePage subscribe
                       │
                       ├─▶ WalletService.addCoins(n × comboMulti)
                       │
                       ├─▶ MissionsService.recordEvent(kind, value)
                       │
                       ├─▶ AchievementService.checkTriggers(event)
                       │
                       ├─▶ AudioService.play(sound) + haptic pattern
                       │
                       └─▶ TutorialService.advanceStep(event)  [si tutorial active]
```

Chaque service observe le flux events existant, zéro nouveau canal.

---

## 3. Section 1 — Achievements

**12 achievements, 50 pièces chacun (max 600 pièces en liftime).**

| # | ID | Déclencheur | Reward |
|---|---|---|---|
| 1 | `first_blood` | Première partie terminée | 50 |
| 2 | `score_100` | Score ≥ 100 | 50 |
| 3 | `score_500` | Score ≥ 500 | 50 |
| 4 | `score_1000` | Score ≥ 1000 | 50 |
| 5 | `score_2000` | Score ≥ 2000 | 50 |
| 6 | `coins_100` | 100 pièces en une partie | 50 |
| 7 | `coins_500` | 500 pièces cumulées (lifetime) | 50 |
| 8 | `shield_saved` | Sauvé 3 fois par shield (lifetime) | 50 |
| 9 | `combo_wooow` | Premier "Wooow!" (lifetime) | 50 |
| 10 | `combo_5x` | Combo de 5+ étages en un fall | 50 |
| 11 | `all_skins` | Débloquer tous les skins (7) | 50 |
| 12 | `daily_streak_7` | Réclamer les 3 missions pendant 7 jours consécutifs | 50 |

**Modèle de données** :
```ts
interface AchievementState {
  [id: string]: { unlockedAt: number; progress: number };
}
```
Progress sert aux achievements "cumulés" (`coins_500`, `shield_saved`, `daily_streak_7`). Pas affiché visuellement en v1 (binaire).

**UI** : nouvelle page `/achievements` accessible via nouveau bouton 🏆 sur HomePage (à côté de 🛒). Grid 2 colonnes, chaque tile :
- Icône trophée (grise si verrouillé, dorée si débloqué)
- Nom traduit
- Description traduite
- Check ✓ vert si fait

**Toast d'unlock** : `🏆 Achievement débloqué : {name} (+50 pièces)` via Ionic Toast, duration 2s, couleur `success`.

**i18n** : 12 noms + 12 descriptions + 1 template toast = 25 clés × EN/FR.

---

## 4. Section 2 — Combos avancés

**État actuel** : `GameEngine` affiche "+N" quand la balle traverse 2+ étages d'un coup ; "Wooow!" si 2 combos consécutifs.

**Extension** :

### 4.1 Multiplicateur combo sur les pièces

- Chaque "+N" déclenche un multiplicateur `×N` sur les pièces ramassées pendant **4 secondes**.
- Nouveau combo pendant la fenêtre → multi += N, timer reset à 4s.
- Cap : `×10`. Au-delà, saturation.
- Fin de fenêtre → multi reset à 1, HUD disparaît.

### 4.2 HUD combo meter

- Position : haut-droite du canvas, sous le HUD score.
- Barre horizontale orange qui se vide de 4s → 0 en linéaire.
- Chiffre `×N` à droite de la barre.
- Fade in/out 200ms.
- Non interactif, purement visuel.

### 4.3 Perfect Run

- 3 "Wooow!" dans une même partie → floating text "PERFECT!" au centre, 1.5s + bonus one-shot `+100 pièces` via `wallet.addCoins(100)` + sound `'win'`.
- Trackable mais pas d'achievement dédié en v1.

### 4.4 Modifications GameEngine

Nouveau state local :
```ts
private comboMulti = 1;
private comboMultiTimer = 0;  // frames
private wooowCount = 0;
```

Dans la boucle update :
```ts
if (this.comboMultiTimer > 0) {
  this.comboMultiTimer--;
  if (this.comboMultiTimer === 0) this.comboMulti = 1;
}
```

Dans le landing-transition (où `+N` est déjà spawn) :
```ts
this.comboMulti = Math.min(this.comboMulti + n, 10);
this.comboMultiTimer = 240;  // 4s à 60fps
if (isCombo) {
  this.wooowCount++;
  if (this.wooowCount === 3) this.spawnPerfectRun();
}
```

Dans la logique coin pickup existante :
```ts
this.coins.update(c => c + this.comboMulti);
this.events$.next({ kind: 'coin' });  // le wallet reçoit déjà via la subscription
```

**Compatibilité** : les floating texts "+1" existants au coin pickup deviennent `+${multi}` quand multi > 1.

---

## 5. Section 3 — Daily Missions

### 5.1 Modèle

```ts
interface MissionsState {
  dayKey: string;  // 'YYYY-MM-DD' en date locale
  missions: Mission[];
  streak: number;  // nombre de jours consécutifs avec 3 missions claim
}

interface Mission {
  id: string;         // uuid local
  type: MissionType;  // enum
  target: number;
  progress: number;
  claimed: boolean;
}

type MissionType =
  | 'score_single'    // score ≥ target dans une partie
  | 'coins_single'    // target pièces en une partie
  | 'runs_day'        // target parties aujourd'hui
  | 'combos_day'      // target "+N" aujourd'hui
  | 'powerups_day'    // target powerups ramassés aujourd'hui
  | 'survive_single'; // survivre target secondes dans une partie
```

### 5.2 Refresh

À l'ouverture de l'app ou retour foreground, `MissionsService.load()` compare `state.dayKey` avec `new Date().toISOString().slice(0, 10)` (local). Si différent :
1. Si les 3 missions du jour précédent étaient toutes claim → `streak++`, sinon `streak = 0`.
2. Génère 3 nouvelles missions distinctes (3 types différents tirés aléatoirement parmi 6).
3. Pour chaque mission, pick aléatoire du target dans son triplet.
4. Sauvegarde immédiate.

### 5.3 Pool de missions

| Type | Targets (random pick) | Reward |
|---|---|---|
| `score_single` | 200, 400, 800 | 40 |
| `coins_single` | 30, 50, 80 | 40 |
| `runs_day` | 3, 5, 10 | 40 |
| `combos_day` | 3, 5, 10 | 40 |
| `powerups_day` | 3, 5, 10 | 40 |
| `survive_single` | 60, 90, 120 (secondes) | 40 |

**Max : 120 pièces/jour via missions.**

### 5.4 UI

Section sur HomePage, sous le header, au-dessus du bouton Play :
- 3 cards horizontales (scroll horizontal si overflow)
- Chaque card : icône emoji selon le type (🎯 / 💰 / 🎮 / ⚡ / 🛡️ / ⏱️) + texte localisé "Score ≥ 400 (0/400)" + bouton Claim
- Bouton Claim :
  - Gris disabled si `progress < target`
  - Doré pulsant si `progress >= target && !claimed`
  - Checkmark ✓ si `claimed`

Tap Claim → `wallet.addCoins(40)` + `claimed = true` + save + toast "+40 pièces".

### 5.5 Hooks d'event

`MissionsService.recordEvent({ kind, value })` appelé depuis :
- `GamePage.ngOnDestroy` ou `onGameOver` : `{ kind: 'run_end', score, coins, survivedSec }`
- `GameEngine.events$` subscribers déjà en place dans GamePage : `coin`, `shield`, `magnet`, `bonus`
- Combo spawner dans GameEngine : nouveau event `{ kind: 'combo', value: n }` ajouté à `GameEvent`

**Service match les types** et update `progress` sans dépasser `target`. Save après chaque update (debounce 500ms pour éviter spam).

### 5.6 i18n

6 templates (un par type) × EN/FR + 1 claim toast = 13 clés.

---

## 6. Section 4 — Tutorial / FTUE

### 6.1 Déclencheur

Au premier launch, après l'écran home, l'utilisateur appuie "Play" → `TutorialService.active()` est true (flag `fdb_tutorial_done` absent) → GamePage lance la séquence au lieu du game normal.

### 6.2 Séquence (4 étapes)

**Étape 1 — Contrôles**
- Overlay sombre semi-transparent sur canvas
- Flèches animées pointant gauche/droite au centre
- Texte : "Tap left to move left, tap right to move right"
- Compteur : attend 2 taps gauche + 2 taps droite réels sur le canvas → next

**Étape 2 — Étages & gaps**
- Game démarre, `tutorialMode = true` → `scrollSpeed × 0.5`, laser pause étendue (300 frames au lieu de 180)
- Texte en haut : "Fall through the gaps. Don't hit the red laser!"
- Compte 3 étages traversés par la balle → next

**Étape 3 — Les bonus**
- Spawn forcé d'un shield puis d'un magnet dans les 10 prochains étages (patch temporaire dans `spawnBoard`)
- Texte : "Collect blue shields and purple magnets for powers"
- Attend les 2 ramassages → next

**Étape 4 — Les bricks spéciales**
- Spawn forcé d'un ×2, +5, et speed dans les 15 prochains étages
- Texte : "Yellow bricks give bonus points. Green bricks boost speed"
- Attend 3 bricks ramassées → done

**Fin** : flag `fdb_tutorial_done = true`, `tutorialMode = false`, reset forced spawns, scrollSpeed normal → game continue en mode standard.

### 6.3 Skippable

Bouton "Skip tutorial" en haut-droite dès l'étape 1. Tap → toast confirm "Skip tutorial? You can replay it in Settings." + bouton "Skip" → flag set true, overlay dismiss, game continue normal.

### 6.4 Replay

Section bottom de SettingsPage : item cliquable "Replay tutorial" → reset `fdb_tutorial_done` + navigate `/game`.

### 6.5 Modifications

- Nouveau service `TutorialService` avec signal `step: 0..4` et flag `done`.
- `GameEngine.ts` : ajout opt `tutorialMode: boolean` + logique forced-spawn + slow-motion.
- `GamePage.html` : overlay conditionnel avec texte + flèches.
- `GameEngine.events$` : les listeners existants (coin, shield, etc.) suffisent pour l'avancement.

### 6.6 i18n

4 textes d'étape + bouton skip + confirm toast + settings label = 7 clés × EN/FR.

---

## 7. Section 5 — Haptique riche

### 7.1 Dispatcher

Étendre le callback `onSoundEvent` existant dans `AudioService` pour, après le son, émettre aussi un pattern haptique. Guard global : `if (!this.settings.vibration()) return`.

### 7.2 Patterns

| Event | Pattern |
|---|---|
| `coin` | `Haptics.selectionStart()` (plus discret que Light vu la fréquence) |
| `shield` | `Light` + `Light` (double tap, 100ms gap) |
| `magnet` | `Medium` × 1 |
| `bonus` | `Medium` + `Light` (80ms gap) |
| `speedBrick` | `Light` × 3 (60ms gap entre chaque) |
| `death` | `Heavy` + `Heavy` (150ms gap) |
| `savedByShield` | `Medium` × 1 |
| `wooow` | `Light` × 3 + `Medium` (crescendo, 50/50/100ms gaps) |
| `perfectRun` | pattern via `navigator.vibrate([30, 50, 30, 50, 100])` (Capacitor fallback) |

### 7.3 Implémentation

Nouveau event `speedBrick` ajouté à `SoundName` type dans `AudioService`. GameEngine émet ce nouveau event quand la balle touche une brique speed.

Chaque pattern est encapsulé dans une méthode `AudioService.haptic(name)` qui chaîne les appels via `setTimeout`. Les timeouts sont fire-and-forget — pas de cleanup nécessaire (durations très courtes).

iOS supporte parfaitement. Web = Capacitor Haptics devient no-op silencieux.

### 7.4 Pas de nouveau service

Dispatch reste dans `AudioService.onSoundEvent` pour éviter 2 points d'entrée.

---

## 8. Section 6 — Share Score

### 8.1 Plugin

Installer `@capacitor/share` (officiel Capacitor). `npm install @capacitor/share` + `npx cap sync ios`.

### 8.2 Points d'entrée

1. **GameOverPage** : bouton "Share" (icône `share-outline`) à côté de "Replay" et "Home". Partage le score de la partie.
2. **HomePage** : petit bouton icône `share-outline` sous l'affichage du Best score. Partage le record personnel.

### 8.3 Contenu

- **Texte EN** : `🎮 I scored {score} in SkyFallBall! Can you beat me? 👉 {storeUrl}`
- **Texte FR** : `🎮 J'ai fait {score} à SkyFallBall ! Peux-tu me battre ? 👉 {storeUrl}`
- **storeUrl** : placeholder vide en v1 avant soumission, remplacé par `https://apps.apple.com/app/id{APP_ID}` après publication.
- **Variante "Best"** : "my record of {score}" / "mon record de {score}".

### 8.4 Appel

```ts
import { Share } from '@capacitor/share';

await Share.share({
  title: 'SkyFallBall',
  text: this.i18n.t('share.text', { score, storeUrl: STORE_URL }),
  dialogTitle: this.i18n.t('share.dialog'),
});
```

Try/catch silencieux : si l'utilisateur annule, pas d'erreur user-facing.

### 8.5 i18n

`share.text`, `share.textBest`, `share.dialog`, `share.button` = 4 clés × EN/FR.

### 8.6 Pas de screenshot v1

Capturer le canvas et écrire un fichier temp = permissions + friction. Texte pur suffit pour v1. Noté pour v2.

---

## 9. Modèle de données consolidé

| Clé Preferences | Service | Shape |
|---|---|---|
| `fdb_wallet` | WalletService | `{ coins, best, unlockedSkins[], unlockedBgs[], equippedSkin, equippedBg }` (existant) |
| `fdb_settings` | SettingsService | `{ sound, music, vibration, controlMode }` (existant) |
| `fdb_locale` | I18nService | `'en' \| 'fr'` (existant) |
| `fdb_gift` | GiftService | state existant |
| `fdb_achievements` | AchievementService | `{ [id]: { unlockedAt, progress } }` |
| `fdb_missions` | MissionsService | `{ dayKey, missions: Mission[], streak }` |
| `fdb_tutorial_done` | TutorialService | `boolean` |

---

## 10. Impact sur l'architecture existante

**Fichiers nouveaux (7)** :
- `src/app/core/services/achievement.service.ts`
- `src/app/core/services/missions.service.ts`
- `src/app/core/services/tutorial.service.ts`
- `src/app/core/game/missions-catalog.ts` (pool + templates)
- `src/app/pages/achievements/achievements.page.ts|.html|.scss`

**Fichiers modifiés (~10)** :
- `src/app/core/game/game-engine.ts` : combo multi, Perfect Run, tutorialMode, event `speedBrick` + `combo`
- `src/app/core/game/entities.ts` : si nouveaux events dans GameEvent union
- `src/app/core/services/audio.service.ts` : haptics patterns
- `src/app/core/services/i18n.service.ts` : ~50 nouvelles clés
- `src/app/pages/home/home.page.ts|.html|.scss` : missions cards + bouton achievements + bouton share best
- `src/app/pages/game/game.page.ts|.html|.scss` : overlay tutorial + HUD combo meter
- `src/app/pages/game-over/game-over.page.ts|.html` : bouton Share
- `src/app/pages/settings/settings.page.ts|.html` : lien Replay tutorial
- `src/app/app.config.ts` : `APP_INITIALIZER` charge aussi `achievement.load()`, `missions.load()`, `tutorial.load()`
- `src/app/app.routes.ts` : route `/achievements`

---

## 11. Testing

Pas de nouveaux tests imposés par ce spec — l'implementation plan décidera.

Priorités de test raisonnables :
- `AchievementService` : trigger correct, pas de double unlock, persistance round-trip.
- `MissionsService` : refresh day change, generation 3 types distincts, claim exclusif.
- `GameEngine` : combo multi plafonne à 10, timer reset correct, Perfect Run à 3 Wooow exactement.
- `TutorialService` : avancement step correct, flag done persisté.

---

## 12. Hors scope v1 (noté pour v2)

- Game Center leaderboards
- Push notifications pour missions daily
- Screenshot inclus dans Share
- Barres de progression visibles pour achievements cumulés
- 2e monnaie (gemmes) / XP joueur
- Nouveaux power-ups (ralenti temps, double saut, etc.)
- Boss / étages à patterns spéciaux
- Daily challenge seedé (même course pour tous)
- Achievements catégorisés / filtres sur la page

---

## 13. Budget pièces consolidé

| Source | Max / jour | Max lifetime |
|---|---|---|
| Game normal | illimité | illimité |
| Gift wheel | ~75 (1 spin + 1 ad spin) | illimité |
| Missions daily | 120 (3 × 40) | illimité |
| Perfect Run | ~500 (si 5 parties avec PR) | illimité |
| Achievements | — | 600 (one-shot 12 × 50) |

Total daily sustainable : ~700 pièces/jour. Skins v1 vont jusqu'à 1000 (rainbow). Backgrounds jusqu'à 1000 (galaxy). Progression ~2 jours pour tout débloquer avec un bon niveau de jeu. Jouable sans grind forcé.

---

## 14. Prochaine étape

Implementation plan via `/writing-plans` skill. Le plan découpera en tâches ordonnées :
1. Services (achievement, missions, tutorial) + persistance
2. GameEngine modifications (combo multi, Perfect Run, events)
3. UI (home missions, achievements page, game-over share, tutorial overlay)
4. Haptics
5. i18n keys
6. Tests
