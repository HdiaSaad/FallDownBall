# FallDownBall — Design Spec

> Clone Ionic hybride (iOS) de l'APK Android `com.wiiza.falldown` (FallDown! Deluxe).
> Reverse-engineeré depuis l'APK v1.3.7 : clé XXTEA extraite du binaire natif
> (`d4b28f4a-7d79-4e`), `.jsc` déchiffrés, prefabs scènes mappés 1-à-1.

**Date** : 2026-10-21
**Auteur** : brainstorming session (Saad + Claude)
**Statut** : validé, prêt pour implementation planning

---

## 1. Portée & objectifs

Reproduire **la totalité** des scènes du jeu original (scope "C") :
Home, Game, GameOver, Settings, Customize (skins balle + fonds), Gift (prize wheel quotidien).

**Non-objectifs** :
- Pas de leaderboard en ligne (Game Center hors scope v1)
- Pas d'achats in-app (IAP) — monétisation = AdMob only
- Pas d'Android (reporté explicitement)

**Critères de succès** :
- APK/IPA installable sur iPhone 6s+ et iPad Air 2+ (iOS 13+)
- Mécanique Falldown fidèle au comportement observé (balle tombe, plateformes scrollent, laser mortel, powerups shield/magnet, revive unique par partie)
- Shop fonctionnel : coins → unlock skin → équipement persistant
- Prize wheel quotidien avec timer 24h persisté

---

## 2. Stack technique

| Couche | Choix | Version | Raison |
|---|---|---|---|
| Framework UI | Ionic | 7 | Nav mobile native + composants iOS stylés |
| Framework JS | Angular | 20 standalone | Services singletons = fit parfait pour state partagé |
| Wrapper natif | Capacitor | 6 | Successeur Cordova, DX moderne, bon support iOS |
| Moteur jeu | Canvas 2D vanilla | — | ~500 lignes TS, zéro dépendance (vs Phaser 1.3 MB) |
| Monétisation | `@capacitor-community/admob` | dernière | Plugin stable, test IDs Google officiels |
| Persistance | `@capacitor/preferences` | dernière | Clé/valeur sync, UserDefaults natif iOS |
| Haptique | `@capacitor/haptics` | dernière | Vibrations opt-in via Settings |

**Deployment target** : iOS 13.0 (couvre ~99% des iPhones et iPads actifs en 2026).
**Device family** : iPhone (1) + iPad (2).

---

## 3. Arborescence projet

```
FallDownBall/
├── src/app/
│   ├── pages/
│   │   ├── home/              HomePage      (ex. HomePageScene)
│   │   ├── game/              GamePage      (ex. GameScene + HUD)
│   │   ├── game-over/         GameOverPage  (ex. GameOverScene)
│   │   ├── settings/          SettingsPage  (ex. SettingScene)
│   │   ├── customize/         CustomizePage (ex. CustomizeScene)
│   │   └── gift/              GiftPage      (ex. GiftScene)
│   ├── core/
│   │   ├── game/
│   │   │   ├── entities.ts        Types + classes Hero/Board/Prop/Particle
│   │   │   ├── physics.ts         Fonctions pures collision + gravité (testables)
│   │   │   └── game-engine.ts     Boucle principale, rendu, input
│   │   └── services/
│   │       ├── wallet.service.ts   coins, best score, skins unlocked/équipés
│   │       ├── settings.service.ts son, musique, vibration, controlMode
│   │       ├── ads.service.ts      wrapper AdMob (banner + interstitial + rewarded)
│   │       └── gift.service.ts     timer 24h prize wheel
│   ├── app.routes.ts
│   └── app.config.ts        APP_INITIALIZER (load services)
├── src/assets/
│   ├── icons/              assets locaux (skins, powerups, UI)
│   └── sounds/             click.mp3, coin.mp3, death.mp3, etc.
├── ios/                    généré par `npx cap add ios`, buildé sur Mac
├── capacitor.config.ts
├── package.json
└── README-SPEC.md          ce fichier
```

---

## 4. Pages & routing

| Route | Page | Rôle | Prefab source (APK) |
|---|---|---|---|
| `/` | HomePage | Logo, Play, 4 icônes (settings/customize/gift/leaderboard), affichage coins + best | `HomePageScene` (0ad48m148dK5JJ1h9VEWXDL) |
| `/game` | GamePage | Canvas plein écran, HUD (score, coins, pause), overlay pause (resume/replay/home + save-me) | `GameScene` (8d395p3zpNAWaVvfFZNkNmg) + HUD (b7baaLWyrRPya5xiB9bbawU) |
| `/game-over` | GameOverPage | Score, best, newRecord flag, coins gagnés cette partie, Replay/Home, zone save-me (rewarded ad) | `GameOverScene` (bde5f3yOJZEq6kpJPpTpHWb) |
| `/settings` | SettingsPage | Toggles son, musique, vibration, controlMode (touch/tilt), back | `SettingScene` (0364biyKFlCGod28YcC9q1I) |
| `/customize` | CustomizePage | Grille skins balle (5 pour v1) + grille fonds (3 pour v1), prix en coins, bouton équiper | `CustomizeScene` (f9ebdxPE5RLsbEEkvXXo5xY) |
| `/gift` | GiftPage | Prize wheel 8 secteurs (50/100/50/200/50/100/500/100), timer 24h, "free gift" via rewarded ad | `GiftScene` (70864LadHlNSLYlFJDPtL6I) |

**Routing** : lazy via `loadComponent` (Angular 20 standalone), transition iOS swipe-back auto.

**User flows principaux** :
1. **Partie** : `/` → `/game` → mort → `/game-over` → *Replay* `/game` ou *Home* `/`
2. **Save-me** : `/game-over` → "Watch Ad" → `AdsService.showRewarded()` succès → `/game` avec hero relancé (1 revive max/partie)
3. **Achat skin** : `/` → `/customize` → tap skin verrouillé → si `coins >= price` : débit + unlock + équiper, sinon toast
4. **Gift** : `/` → `/gift` → si `canClaim` : spin wheel, sinon affiche timer restant. "Free gift" rewarded ad reset timer immédiat.

---

## 5. Services (Angular signals, `providedIn: 'root'`)

### 5.1 WalletService

```ts
coins:          signal<number>
best:           signal<number>
unlockedSkins:  signal<Set<number>>      // skin 0 toujours free
unlockedBgs:    signal<Set<number>>
equippedSkin:   signal<number>
equippedBg:     signal<number>

load(): Promise<void>             // depuis Preferences 'fdb_wallet'
save(): Promise<void>             // debounced 500ms
addCoins(n), spendCoins(n): boolean
submitScore(s): { newRecord: boolean }
buySkin(id, price): boolean       // false si coins insuffisants
equipSkin(id), equipBg(id)
```

### 5.2 SettingsService

```ts
sound: signal<boolean>  (défaut true)
music: signal<boolean>  (défaut true)
vibration: signal<boolean>  (défaut true)
controlMode: signal<'touch'|'tilt'>  (défaut 'touch')

load(), save()
```

Un `effect()` dans `SoundService` interne écoute `sound` pour mute/unmute l'`AudioContext`.

### 5.3 AdsService

```ts
async init(): Promise<void>
  // AdMob.initialize({ initializeForTesting: true, testingDevices: [...] })
  // Si iOS >= 14 : AdMob.requestTrackingAuthorization() (ATT dialog)
  // Si iOS 13 : skip (ATT n'existe pas), pub non-personnalisée automatiquement
async showBanner(): Promise<void>       // position BOTTOM_CENTER
async hideBanner(): Promise<void>
async showInterstitial(): Promise<void> // appelée toutes les 3 game-overs (compteur modulo stocké en mémoire, remis à 0 au boot)
async showRewarded(): Promise<boolean>  // true si pub vue en entier, false sinon (timeout 10s)
```

**Test IDs iOS Google (environment.ts)** :
- App ID : `ca-app-pub-3940256099942544~1458002511`
- Banner : `ca-app-pub-3940256099942544/2934735716`
- Interstitial : `ca-app-pub-3940256099942544/4411468910`
- Rewarded : `ca-app-pub-3940256099942544/1712485313`

**Banner iPad** : `BannerAdSize.LARGE_BANNER` (320×100), détection via `Device.getInfo().model.includes('iPad')`.

### 5.4 GiftService

```ts
lastClaim: signal<number>              // epoch ms
canClaim: computed<boolean>            // Date.now() - lastClaim >= 24h
msUntilNextClaim: computed<number>
async spinWheel(): Promise<number>     // crédite WalletService + reset timer
async claimFreeGift(): Promise<number> // rewarded ad → gift immédiat
```

Prize table : `[50, 100, 50, 200, 50, 100, 500, 100]` (poids déséquilibré).

### 5.5 Boot sequence (`APP_INITIALIZER`)

1. `SettingsService.load()`
2. `WalletService.load()`
3. `GiftService.load()`
4. Si `Capacitor.isNativePlatform()` : `AdsService.init()` + `showBanner()` (hors `/game`)

---

## 6. Moteur de jeu Canvas 2D

### 6.1 Fichiers (`core/game/`)

| Fichier | Responsabilité | Dépendances |
|---|---|---|
| `entities.ts` | Types/classes Hero, Board, Prop, Particle | aucune |
| `physics.ts` | Fonctions pures : `collideBoard`, `applyGravity`, `applyMagnet` | entities |
| `game-engine.ts` | Classe orchestratrice : boucle rAF, rendu, input | entities, physics |

**Isolation** : `GameEngine` reçoit un `HTMLCanvasElement` + un `SettingsSnapshot` + `skinId`. Il ignore Angular. Communique via signals exposés + un `Subject` d'events.

### 6.2 Entités (fidèles aux prefabs du vrai APK)

| Entity | Champs | Source APK |
|---|---|---|
| **Hero** | x, y, r=11, vx, vy, shield, magnet, trail: Point[], skinId | `ItemHero` (4dfbai+djR...) : node, ballImg, ballShild, ballMagnet, itemCollider |
| **Board** | y, gapX, gapW=72, label?: '×2'\|'+5', consumed: boolean | `ItemBoard` (ed521Gz99x...) : node, boardImg, boardCollider, boardTxt |
| **Prop** | x, y, r=9, kind: 'coin'\|'shield'\|'magnet' | `ItemProps` (0af3dXqU69...) : node, propsImg, propsCollider |
| **Particle** | x, y, vx, vy, life, color | `ParticleCoin/Explosion/Dangerous/Win/Bg` |

Trail (motion streak) : `hero.trail[]` liste de 14 derniers points, rendue avec alpha dégressif — reproduit `cc.MotionStreak` du prefab `itemTail` (27f71PWzC9...).

### 6.3 Boucle principale (`tick`)

```
rAF →
 1. scroll monde       boards.y -= scrollSpeed ; laserY += 0.09
 2. recycle            remove boards hors écran, spawn en bas, score++
 3. input → hero.vx    clavier arrows OU touch left/right OU tilt (si controlMode='tilt')
 4. gravité            hero.vy = min(vy + G, 8.5)         G = 0.36
 5. intégration        hero.x,y += vx,vy  (x clampé [r, W-r])
 6. swept collision    vs boards : prev-bottom <= board.y <= now-bottom ET !inGap
 7. collisions circles vs props → coin/shield/magnet pickup
 8. magnet pull        attire coins dans 110 px
 9. powerup ticks      shield--, magnet--  (durée 5s = 300 frames)
10. laser check        si y-r < laserY+18 : shield absorb OU save-me OU gameOver$
11. difficulté         scrollSpeed += 0.00045
12. particles update   life--
13. render frame
```

### 6.4 Mécaniques spécifiques

- **Save-me unique** : `saveUsed = false` au start, flipé après revive. Correspond à `saveMeNode` observé dans HUD (b7baaLWyrR...).
- **Collision model** : le vrai jeu utilise Box2D (`cc.PhysicsCircleCollider` + `cc.PhysicsBoxCollider` + `cc.PhysicsPolygonCollider` observés). Clone = swept AABB maison — comportement visuellement identique pour cette mécanique simple, zéro dépendance.
- **Mode tilt** : via `@capacitor/motion` ou `DeviceOrientationEvent` web. iOS 13+ exige `DeviceOrientationEvent.requestPermission()` sur premier geste.

### 6.5 Interface moteur ↔ page

```ts
export class GameEngine {
  readonly score   = signal(0);
  readonly coins   = signal(0);
  readonly state   = signal<'playing'|'paused'|'over'>('playing');
  readonly events$ = new Subject<GameEvent>();  // 'coin','shield','magnet','savedByShield','gameOver'

  constructor(canvas: HTMLCanvasElement, settings: SettingsSnapshot, skinId: number) {}
  start(), pause(), resume(), reset(), destroy()
  revive()                             // appelé après rewarded ad success
  setInput(left: boolean, right: boolean)
  setTilt(gamma: number)               // -90..90, mapped vers hero.vx
}
```

`GamePage` instancie, câble inputs (ion-gesture + keydown), route `events$` vers `WalletService` + `AdsService`.

### 6.6 Testabilité

- `physics.ts` : fonctions pures, **tests Jasmine** sans DOM.
- `game-engine.ts` : contrat testé (events émis sur conditions), rendu non testé.
- Services : tests avec mock `@capacitor/preferences`.

---

## 7. Rendu & compatibilité multi-écrans

### 7.1 Canvas scaling

- **Logical size figée** : 360 × 640 (identique sur tous les devices → mécanique de jeu identique)
- **Physical size** : `canvas.width = 360 * devicePixelRatio` (crisp sur Retina)
- **CSS size** : `max-width: 480px; max-height: 854px; margin: auto` (letterbox centré sur iPad, pas d'étirement grotesque)
- **Safe area** : HUD respecte `env(safe-area-inset-top)` + boutons `env(safe-area-inset-bottom)` (notch iPhone X+ + home indicator)

### 7.2 Orientation

- **iPhone** : portrait only (`UISupportedInterfaceOrientations` = Portrait)
- **iPad** : portrait + paysage (`UISupportedInterfaceOrientations~ipad` = tous sauf UpsideDown)
- Canvas se recentre via CSS `flex`, pas de rotation du logical layout

### 7.3 Haptique

- Mort : `ImpactStyle.Heavy`
- Coin pickup : `ImpactStyle.Light`
- Achat skin : `NotificationType.Success`
- Toggle via `SettingsService.vibration`

---

## 8. Build iOS via SSH Mac

**Infra** : Mac Saad accessible à `mac@192.168.1.17` (clé `~/.ssh/claude_mac`, config SSH alias `mac`).

**Workflow** (script `scripts/build-ios.sh` orchestré depuis Windows via `ssh_exec`) :

```bash
# côté Windows (build web)
npm run build         # ionic build → www/

# transfert vers Mac
rsync -az --exclude=node_modules --exclude=ios/App/Pods ./ mac:~/FallDownBall/

# côté Mac via SSH
ssh mac bash -lc '
  cd ~/FallDownBall &&
  npm ci &&
  npx cap sync ios &&
  cd ios/App &&
  pod install &&
  xcodebuild -workspace App.xcworkspace -scheme App \
             -configuration Debug -sdk iphonesimulator \
             -derivedDataPath build/
'

# déploiement simulateur
ssh mac 'xcrun simctl boot "iPhone 15" ; xcrun simctl install booted <path>.app'
```

Signing device réel : config manuelle Xcode 1 fois (Apple ID Saad), ensuite rebuild via SSH OK.

---

## 9. Gestion d'erreurs

| Situation | Comportement |
|---|---|
| `Preferences.get()` échoue / clé absente | Fallback valeurs par défaut, log console |
| `AudioContext` bloqué (iOS exige geste) | Init au premier `touchstart` sur `/game` |
| `DeviceOrientation.requestPermission()` refusé | Fallback silencieux sur mode touch, désactive l'option tilt dans Settings |
| Rewarded ad timeout 10s / fail | `showRewarded()` retourne `false`, bouton revive désactivé pour la partie |
| Interstitial fail | Silencieux, enchaîne direct sur `/game-over` |
| Network offline | AdMob gère son retry interne, pas de dialog bloquant |

Règle générale : **pas de modal d'erreur bloquant**. UX passe toujours.

---

## 10. Tests

### 10.1 Unit tests (Jasmine, défaut Ionic Angular)

- `physics.spec.ts` :
  - `collideBoard` : balle dans gap → false ; balle sur plateau → true ; prev au-dessus, now en-dessous → true
  - `applyGravity` : clamp vitesse terminale 8.5
  - `applyMagnet` : coin dans 110px attiré
- `wallet.service.spec.ts` :
  - add/spend/buy/equip avec Preferences mocké
  - `submitScore` renvoie `newRecord=true` sur meilleur
- `gift.service.spec.ts` :
  - `canClaim` : false si < 24h, true sinon
  - `spinWheel` : crédit cohérent avec prize table

### 10.2 Smoke manuel (simulateur iOS via SSH)

Checklist :
- [ ] Home → Play → mort → revive refuse → game over → Replay fonctionne
- [ ] Pause milieu de partie → Resume reprend scroll
- [ ] Settings : son off → `AudioContext` muted (vérif via console)
- [ ] Customize : skin verrouillé + coins insuffisants → toast ; coins suffisants → unlock + équipement persisté
- [ ] Gift : premier claim OK, deuxième < 24h bloqué avec timer affiché
- [ ] Rotation iPad portrait ↔ paysage → canvas se recentre sans glitch
- [ ] AdMob test banner s'affiche en bas de `/` et `/game-over`, caché sur `/game`

**Pas de tests e2e** (Cypress) à ce stade — ROI faible vu la scope.

---

## 11. Annexe : preuves reverse-engineering

### Clé XXTEA

Localisée dans `AppDelegate::applicationDidFinishLaunching()` à l'offset `0xab31f8` de `libcocos2djs.so` (ARM64) :

```asm
0xab31f8  adrp x9, 0x6d8000
0xab31fc  add  x9, x9, 0xf09        ; → 0x6d8f09 (16 chars suivants)
0xab3208  mov  w8, 0x20              ; size byte = 32 = len(16)<<1 (SSO)
0xab3214  stur q0, [sp, 0x21]        ; copie 16 bytes du pointeur
0xab321c  bl   0x1a73650             ; jsb_set_xxtea_key(std::string&)
```

Dump de `0x6d8f09` dans la .rodata :
```
d4b28f4a-7d79-4e
```

→ **Clé XXTEA 16 bytes = `d4b28f4a-7d79-4e`** (préfixe UUID coupé à 16 chars).

### .jsc déchiffrés

Via XXTEA standard Cocos2d (algo réf dans `/tmp/xxtea_dec.py`) + `zlib.decompress`, tous les `.jsc` déchiffrent proprement :

| Fichier | Taille cipher | Taille plain | Contenu |
|---|---|---|---|
| `src/settings.8ac84.jsc` | 320 B | 430 B | `window._CCSettings = {...}` |
| `src/cocos2d-jsb.90281.jsc` | 421 KB | 1.87 MB | Engine Cocos2d-JS 2.4 complet |
| `src/physics.dbe2a.jsc` | 54 KB | 238 KB | Module Box2D |
| `assets/falldown/index.e9c23.jsc` | 320 B | 563 B | Stub browserify Cocos |

### Prefabs scènes (depuis `config.e9c23.json`)

20 scènes/prefabs identifiés dans le bundle `falldown` :
`GiftScene`, `ParticleWin`, `FalldownEntry`, `HomePageScene`, `ItemBall`,
`ParticleExplosion`, `ParticleBg`, `ItemBg`, `ItemHero`, `GameOverScene`,
`ParticleDangerous`, `ParticleCoin`, `SettingScene`, `ItemProps`, `GameScene`,
`ItemBoard`, `itemTail`, `CustomizeScene`.

Champs par composant (extraits du pack déchiffré `import/03/03799a3a0.fe236.json`) :
- `ItemHero` → `ballImg, ballShild, ballMagnet, itemCollider` → confirme shield + magnet powerups
- `ItemBoard` → `boardImg, boardCollider, boardTxt` → confirme texte sur plateforme (×2 / +5)
- `GameScene HUD` → `scoreLabel, coinLabel, pauseLayer, resumeBtn, replayBtn, homeBtn, saveMeNode` → confirme save-me et flow pause
- `GameOverScene` → `scoreLabel, bestScoreLabel, newRecordImg, overBestNode, giftTimeLabel, giftFreeLabel` → confirme gift timer visible depuis game over

### AdMob (depuis AndroidManifest.xml extrait)

- **App ID production** (NE PAS réutiliser) : `ca-app-pub-5843156813002906~3484973672`
- Permissions : `AD_ID`, `ACCESS_ADSERVICES_AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION`, `ACCESS_ADSERVICES_TOPICS`
- 4 formats observés dans `AdMobHelper.java` (jadx) : banner, interstitial, rewarded, rewarded-interstitial

### Pont JS ↔ natif

`JSReflection.java` (jadx) :
```java
Cocos2dxJavascriptJavaBridge.evalString("JSReflections.onAdLoaded('" + str + "')");
```
Démontre l'architecture bidirectionnelle (natif AdMob callbacks → JS game logic).
