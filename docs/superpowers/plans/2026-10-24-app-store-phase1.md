# App Store Phase 1 — Build Infra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a compliance-ready SkyFallBall `.ipa` v1.0.0 build 1 that passes Apple's technical review: privacy manifest present, release-mode AdMob, correct ATT wording and timing, SKAdNetwork IDs installed, encryption export flag set, versions bumped.

**Architecture:** Pure config/manifest work plus one small code refactor in `ads.service.ts` (release-mode AdMob + ATT timing). No new dependencies, no new Capacitor plugins, no gameplay changes. All changes land on a feature branch and ship through the existing Codemagic `ios-unsigned` workflow.

**Tech Stack:** Angular 22, Ionic 7, Capacitor 8 iOS, `@capacitor-community/admob@^8.2.1`, Xcode project format `objectVersion = 60`, Codemagic cloud build, Sideloadly sideload.

## Global Constraints

- **iOS deployment target:** 15.0 (matches `IPHONEOS_DEPLOYMENT_TARGET` already set in `project.pbxproj`). Do not change.
- **Bundle ID:** `com.saad.skyfallball`. Do not change.
- **AdMob App ID:** `ca-app-pub-1958817675761413~8609085851`. Do not change.
- **Version floor:** v1.0.0 build 1. `MARKETING_VERSION = 1.0.0`, `CURRENT_PROJECT_VERSION = 1`, `package.json` `"version": "1.0.0"`.
- **No new dependencies:** no `npm install`, no new Capacitor plugins, no new CocoaPods. If a dependency gap is discovered, STOP and ask the human — do not add silently.
- **No scope creep:** do not touch icon assets, splash, screenshots, privacy policy URL, App Store Connect metadata, gameplay code, or styling. Those belong to Phase 2+.
- **Codemagic workflow:** `ios-unsigned`, app ID `6ad94fc92fa7ab3e2163992f`, API token stored by the human (do not log or commit).
- **Edits over Xcode UI:** this project builds on Windows + Codemagic cloud. All `project.pbxproj` and `Info.plist` edits are made with text tooling — no local Xcode run. Verify every edit with `plutil -lint` (Info.plist, PrivacyInfo.xcprivacy) or targeted grep (pbxproj).

---

### Task 1: Info.plist — ATT wording, encryption flag, app category

**Files:**
- Modify: `ios/App/App/Info.plist`

**Interfaces:**
- Consumes: nothing from earlier tasks (first task).
- Produces: three static keys in Info.plist that later tasks and App Review inspect: `NSUserTrackingUsageDescription` (updated), `ITSAppUsesNonExemptEncryption` (new), `LSApplicationCategoryType` (new).

**Current state** (lines 66-69 of `Info.plist`):
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-1958817675761413~8609085851</string>
<key>NSUserTrackingUsageDescription</key>
<string>This app uses tracking to show you relevant ads.</string>
```
Keys to add do not currently exist in the file.

- [ ] **Step 1: Rewrite the ATT prompt wording**

Replace the existing `NSUserTrackingUsageDescription` value exactly:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>Your data will be used to show personalized ads that help keep SkyFallBall free.</string>
```

The wording is prescriptive. Do not paraphrase. Apple reviewers reject promotional ("show you better ads!") or vague ("improve your experience") copy.

- [ ] **Step 2: Add the encryption export compliance flag**

Insert immediately after the `NSUserTrackingUsageDescription` block, before `</dict>`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Rationale: SkyFallBall uses only HTTPS standard transport (exempt from US export regulations). Without this key, every App Store Connect upload re-prompts for the compliance questionnaire.

- [ ] **Step 3: Add the app category**

Insert immediately after the `ITSAppUsesNonExemptEncryption` block, before `</dict>`:

```xml
<key>LSApplicationCategoryType</key>
<string>public.app-category.games</string>
```

- [ ] **Step 4: Validate the plist**

Run from the repo root:
```bash
plutil -lint ios/App/App/Info.plist
```
Expected: `ios/App/App/Info.plist: OK`.

If `plutil` is unavailable (Windows without Xcode CLT), use a Python one-liner instead:
```bash
python -c "import plistlib; plistlib.load(open('ios/App/App/Info.plist','rb')); print('OK')"
```
Expected output: `OK`. Any `ExpatError` or `InvalidFileException` means the XML is malformed — fix before continuing.

- [ ] **Step 5: Verify the three keys with grep**

```bash
grep -c "ITSAppUsesNonExemptEncryption" ios/App/App/Info.plist
grep -c "LSApplicationCategoryType" ios/App/App/Info.plist
grep -o "Your data will be used to show personalized ads that help keep SkyFallBall free." ios/App/App/Info.plist
```
Expected: `1`, `1`, and the full sentence echoed back once.

- [ ] **Step 6: Commit**

```bash
git add ios/App/App/Info.plist
git commit -m "feat(ios): ATT wording, encryption flag, app category for App Store"
```

---

### Task 2: Info.plist — SKAdNetworkItems

**Files:**
- Modify: `ios/App/App/Info.plist`

**Interfaces:**
- Consumes: Task 1's `Info.plist` baseline — do not revert its keys.
- Produces: `SKAdNetworkItems` array in `Info.plist` (consumed by iOS post-ATT ad-attribution system).

**Why this is a separate task:** the SKAN list is a large verbatim blob (~60 entries). Keeping it separate lets a reviewer approve/reject the ID list independently of the small static-key changes in Task 1.

- [ ] **Step 1: Add the SKAdNetworkItems array**

Insert immediately after the `LSApplicationCategoryType` block from Task 1, before `</dict>`:

```xml
<key>SKAdNetworkItems</key>
<array>
    <dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>4fzdc2evr5.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>2fnua5tdw4.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>ydx93a7ass.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>p78axxw29g.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>v72qych5uu.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>ludvb6z3bs.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>cp8zw746q7.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>3sh42y64q3.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>c6k4g5qg8m.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>s39g8k73mm.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>3qy4746246.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>hs6bdukanm.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>mlmmfzh3r3.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>v4nxqhlyqp.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>wzmmz9fp6w.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>su67r6k2v3.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>yclnxrl5pm.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>7ug5zh24hu.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>gta9lk7p23.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>vutu7akeur.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>y5ghdn5j9k.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>v9wttpbfk9.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>n38lu8286q.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>47vhws6wlr.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>kbd757ywx3.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>9t245vhmpl.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>a2p9lx4jpn.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>22mmun2rn5.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>4468km3ulz.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>2u9pt9hc89.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>8s468mfl3y.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>klf5c3l5u5.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>ppxm28t8ap.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>ecpz2srf59.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>uw77j35x4d.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>pwa73g5rt2.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>578prtvx9j.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>4dzt52r2t5.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>e5fvkxwrpn.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>8c4e2ghe7u.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>zq492l623r.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>3rd42ekr43.skadnetwork</string></dict>
    <dict><key>SKAdNetworkIdentifier</key><string>3qcr597p9d.skadnetwork</string></dict>
</array>
```

The list above is the canonical Google-recommended AdMob SKAN set that has been stable in Google's publisher documentation for 2+ years. Before committing, open Google's current AdMob SKAN documentation page (https://developers.google.com/admob/ios/privacy) and verify no new identifiers have been added since. If Google's current list contains identifiers not in the block above, append them (same `<dict><key>SKAdNetworkIdentifier</key><string>...</string></dict>` pattern). If the page lists identifiers to retire, keep them anyway — iOS ignores unknown ones, and leaving them in costs nothing.

- [ ] **Step 2: Validate the plist**

```bash
plutil -lint ios/App/App/Info.plist
```
Expected: `OK`. Fallback (if no `plutil`): the Python one-liner from Task 1 Step 4.

- [ ] **Step 3: Count the SKAN entries**

```bash
grep -c "SKAdNetworkIdentifier" ios/App/App/Info.plist
```
Expected: `44` from the canonical block, or `44 + N` where N is the count of additions you pulled from Google's current docs page. If the count is less than 44, you removed something — stop and check.

- [ ] **Step 4: Commit**

```bash
git add ios/App/App/Info.plist
git commit -m "feat(ios): add SKAdNetworkItems for AdMob post-ATT attribution"
```

---

### Task 3: Create PrivacyInfo.xcprivacy manifest

**Files:**
- Create: `ios/App/App/PrivacyInfo.xcprivacy`

**Interfaces:**
- Consumes: nothing from earlier tasks (file content is self-contained).
- Produces: the manifest file at `ios/App/App/PrivacyInfo.xcprivacy`. Task 4 wires it into the Xcode target.

**Why this is a separate task from Task 4:** file creation is pure XML content; `project.pbxproj` surgery with UUID generation is error-prone and benefits from a focused reviewer gate.

- [ ] **Step 1: Create the manifest file**

Write exactly this content to `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyTracking</key>
    <true/>
    <key>NSPrivacyTrackingDomains</key>
    <array>
        <string>googleads.g.doubleclick.net</string>
        <string>pagead2.googlesyndication.com</string>
        <string>googleadservices.com</string>
        <string>g.doubleclick.net</string>
    </array>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeDeviceID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <true/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeAdvertisingData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <true/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeProductInteraction</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <true/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising</string>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

**Reason codes explained** (do not alter):
- `CA92.1` — "Declare this reason to access user defaults to read and write information that is only accessible to the app itself" — matches Capacitor Preferences (which SkyFallBall uses for coins, settings, mission state).
- `NSPrivacyTracking: true` — AdMob tracks via IDFA when ATT is granted.
- No other required-reason API categories (file timestamps, boot time, disk space, active keyboards) apply — Task 7 audits this.

- [ ] **Step 2: Validate the manifest**

```bash
plutil -lint ios/App/App/PrivacyInfo.xcprivacy
```
Expected: `OK`. Fallback: the Python one-liner from Task 1 Step 4.

- [ ] **Step 3: Spot-check the key presence**

```bash
grep -c "NSPrivacyTracking" ios/App/App/PrivacyInfo.xcprivacy
grep -c "CA92.1" ios/App/App/PrivacyInfo.xcprivacy
```
Expected: `>= 1` and `1` respectively.

- [ ] **Step 4: Commit**

```bash
git add ios/App/App/PrivacyInfo.xcprivacy
git commit -m "feat(ios): add PrivacyInfo.xcprivacy manifest for App Store"
```

---

### Task 4: Wire PrivacyInfo.xcprivacy into the Xcode target

**Files:**
- Modify: `ios/App/App.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: Task 3's file at `ios/App/App/PrivacyInfo.xcprivacy`.
- Produces: four edits to `project.pbxproj` that cause iOS to bundle the manifest into the `.app` payload. Without this task, Task 3's file is not shipped.

**Context:** Xcode normally writes these entries automatically via drag-and-drop, but this project builds on Windows + Codemagic — no Xcode UI run. Edits are made directly.

**UUIDs to introduce** (24-character uppercase hex, hand-crafted so they are unique in the existing file). Grep the pbxproj first to confirm neither clashes:

- `PRIVACY001AAAAAAAAAAA001` — the `PBXBuildFile` entry
- `PRIVACY002AAAAAAAAAAA002` — the `PBXFileReference` entry

Both UUIDs are intentionally non-random with a `PRIVACY` prefix so they are easy to find on later audits. The format matches the uppercase 24-hex-char identifiers Xcode uses; the `PRIVACY` prefix letters are all valid hex uppercase letters (`A`, `B`, `C`, `D`, `E`, `F`). Wait — `P`, `R`, `I`, `V`, `Y` are NOT hex. Use these instead:

- `AAAAAAAAAAAAAAAAAAAAAAA1` — PBXBuildFile UUID (23 A's + `1`)
- `AAAAAAAAAAAAAAAAAAAAAAA2` — PBXFileReference UUID (23 A's + `2`)

These are 24-char uppercase hex, trivially unique against the existing UUIDs in the pbxproj (which all start with digits or `5`, `9`, `D`, `2F`, `4D`).

- [ ] **Step 1: Confirm the two UUIDs don't collide**

```bash
grep -c "AAAAAAAAAAAAAAAAAAAAAAA1\|AAAAAAAAAAAAAAAAAAAAAAA2" ios/App/App.xcodeproj/project.pbxproj
```
Expected: `0`. If non-zero, the UUIDs already exist — pick different ones (change the trailing digit) and re-check.

- [ ] **Step 2: Add the PBXBuildFile entry**

Locate the `/* Begin PBXBuildFile section */` block (around line 9). Immediately after the last existing `PBXBuildFile` line (`9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */ = ...;` on line 18), insert:

```
		AAAAAAAAAAAAAAAAAAAAAAA1 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = AAAAAAAAAAAAAAAAAAAAAAA2 /* PrivacyInfo.xcprivacy */; };
```

(Match the leading tab character of the surrounding `PBXBuildFile` lines.)

- [ ] **Step 3: Add the PBXFileReference entry**

Locate the `/* Begin PBXFileReference section */` block (around line 21). Immediately after line 32 (`958DCC722DB07C7200EA8C5F /* debug.xcconfig */ = {isa = PBXFileReference; ...};`), insert:

```
		AAAAAAAAAAAAAAAAAAAAAAA2 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };
```

- [ ] **Step 4: Add the file to the App group's children**

Locate the `504EC3061FED79650016851F /* App */ = { isa = PBXGroup; children = (...)` block (around line 64). Inside the `children` array, immediately after the line `504EC3131FED79650016851F /* Info.plist */,` (line 73), add:

```
				AAAAAAAAAAAAAAAAAAAAAAA2 /* PrivacyInfo.xcprivacy */,
```

- [ ] **Step 5: Add the file to the Resources build phase**

Locate the `/* Begin PBXResourcesBuildPhase section */` block (around line 140). Inside the `files = (...)` array of the `504EC3021FED79650016851F /* Resources */` phase (lines 144-151), immediately after the last existing entry (`2FAD9763203C412B000D30F8 /* config.xml in Resources */,` on line 150), add:

```
				AAAAAAAAAAAAAAAAAAAAAAA1 /* PrivacyInfo.xcprivacy in Resources */,
```

- [ ] **Step 6: Verify all four edits with grep**

```bash
grep -c "AAAAAAAAAAAAAAAAAAAAAAA1" ios/App/App.xcodeproj/project.pbxproj
grep -c "AAAAAAAAAAAAAAAAAAAAAAA2" ios/App/App.xcodeproj/project.pbxproj
grep -c "PrivacyInfo.xcprivacy" ios/App/App.xcodeproj/project.pbxproj
```
Expected: `2`, `3`, `4`. If any count is lower, an edit is missing.

- [ ] **Step 7: Confirm pbxproj is still syntactically valid**

Open the file in the editor and spot-check:
- No unmatched `{`, `(`, or `[`.
- The surrounding comment markers `/* Begin ... */` and `/* End ... */` still match.
- The last line of the file is still a single `}` on its own line.

If `plutil` is available, run:
```bash
plutil -lint ios/App/App.xcodeproj/project.pbxproj
```
Expected: `OK`. (pbxproj is a nextstep-style plist; `plutil` validates it.)

- [ ] **Step 8: Commit**

```bash
git add ios/App/App.xcodeproj/project.pbxproj
git commit -m "feat(ios): add PrivacyInfo.xcprivacy to App target Resources"
```

---

### Task 5: Version bump — 1.0.0 build 1

**Files:**
- Modify: `ios/App/App.xcodeproj/project.pbxproj`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `MARKETING_VERSION = 1.0.0` and `CURRENT_PROJECT_VERSION = 1` in both the Debug and Release build configurations of the App target, and `"version": "1.0.0"` in `package.json`. `Info.plist`'s `CFBundleShortVersionString = $(MARKETING_VERSION)` and `CFBundleVersion = $(CURRENT_PROJECT_VERSION)` substitutions pick these up — no plist edit needed.

**Current state** (verified in `project.pbxproj`):
- Line 303, 325: `CURRENT_PROJECT_VERSION = 1;` — already correct for both Debug and Release. Keep as-is.
- Line 310, 332: `MARKETING_VERSION = 1.0;` — must change to `1.0.0`.
- `package.json`: `"version": "0.0.1"` — must change to `"1.0.0"`.

- [ ] **Step 1: Update MARKETING_VERSION in project.pbxproj (Debug + Release)**

In `ios/App/App.xcodeproj/project.pbxproj`, replace both occurrences of:
```
MARKETING_VERSION = 1.0;
```
with:
```
MARKETING_VERSION = 1.0.0;
```

Both lines are inside the two App-target `XCBuildConfiguration` blocks (`504EC3171FED79650016851F /* Debug */` and `504EC3181FED79650016851F /* Release */`, lines 297-340). Change both. Do not change the `CURRENT_PROJECT_VERSION = 1;` lines — they are already correct.

- [ ] **Step 2: Verify the pbxproj change**

```bash
grep -c "MARKETING_VERSION = 1.0.0;" ios/App/App.xcodeproj/project.pbxproj
grep -c "MARKETING_VERSION = 1.0;" ios/App/App.xcodeproj/project.pbxproj
grep -c "CURRENT_PROJECT_VERSION = 1;" ios/App/App.xcodeproj/project.pbxproj
```
Expected: `2`, `0`, `2`. If `MARKETING_VERSION = 1.0;` is still non-zero, you missed a replacement.

- [ ] **Step 3: Update package.json**

In `package.json`, replace:
```json
"version": "0.0.1",
```
with:
```json
"version": "1.0.0",
```

- [ ] **Step 4: Verify package.json**

```bash
grep -c '"version": "1.0.0"' package.json
grep -c '"version": "0.0.1"' package.json
```
Expected: `1`, `0`.

- [ ] **Step 5: Commit**

```bash
git add package.json ios/App/App.xcodeproj/project.pbxproj
git commit -m "chore: bump version to 1.0.0 build 1 for App Store release"
```

---

### Task 6: AdMob release config + ATT prompt timing

**Files:**
- Modify: `src/app/core/services/ads.service.ts`
- Modify: `src/app/pages/game-over/game-over.page.ts` (OR the game-over handling path — see Step 2)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `AdsService.requestAttIfNeeded()` public method (returns `Promise<void>`); `AdsService.init()` no longer calls ATT during startup; the game-over flow calls `requestAttIfNeeded()` once after the first completed game.

**Current state** (`src/app/core/services/ads.service.ts`):
- Line 17: `if (!Capacitor.isNativePlatform()) return;` ✓ keep
- Line 20: `await AdMob.initialize({ testingDevices: [] } as any);` — `testingDevices: []` is an empty array (fine); no `initializeForTesting` field is set (fine — defaults to false). Change: remove the `testingDevices` field to match the spec's "no `testingDevices: [...]` array in shipped code" rule.
- Lines 22-26: `AdMob.trackingAuthorizationStatus()` + conditional `requestTrackingAuthorization()` — this fires at app launch. Must move to post-first-game.
- Line 37: `isTesting: true,` in `showBanner` — flip to `false`.
- Line 53: `isTesting: true` in `showInterstitial` — flip to `false`.
- Line 62: `isTesting: true` in `showRewarded` — flip to `false`.
- Ad unit IDs come from `environment.admob.{banner,interstitial,rewarded}` — Step 1 includes a verification step to confirm they are production IDs, not Google's demo IDs (which start with `ca-app-pub-3940256099942544/`).

- [ ] **Step 1: Verify production ad unit IDs**

```bash
grep -nE "banner|interstitial|rewarded" src/environments/environment.ts src/environments/environment.prod.ts
```

For every ad unit ID shown:
- Must NOT start with `ca-app-pub-3940256099942544/` (that prefix is Google's demo-ID pool — Apple reviewers will reject the app for showing demo ads in production).
- Should start with `ca-app-pub-1958817675761413/` (SkyFallBall's own AdMob publisher prefix, same root as `GADApplicationIdentifier`).

If any demo ID is found, STOP and ask the human for the production ad unit ID from the AdMob console — do not fabricate.

- [ ] **Step 2: Locate the first-game-over call site**

Search for where the game transitions to the game-over screen:
```bash
grep -rn "showInterstitial\|game-over\|gameOver\|onGameOver" src/app --include="*.ts" | head -20
```

Expected hit: `src/app/pages/game-over/game-over.page.ts` or `src/app/pages/game/game.page.ts` (whichever page/service already calls `ads.showInterstitial()`). This is where to insert the ATT trigger — immediately before (or alongside) the interstitial call, so ATT fires on the first completed game.

Record the file path and the method name in your notes before continuing (the exact file may differ from a prior session's state — trust the grep result).

- [ ] **Step 3: Rewrite ads.service.ts**

Replace the entire file content with:

```ts
import { Injectable } from '@angular/core';
import {
  AdMob, AdMobBannerSize, BannerAdOptions, BannerAdPosition, BannerAdSize,
  AdOptions, RewardAdOptions, AdMobRewardItem
} from '@capacitor-community/admob';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private isIPad = false;
  private gameOverCount = 0;
  private attRequested = false;

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const info = await Device.getInfo();
    this.isIPad = info.model.toLowerCase().includes('ipad');
    await AdMob.initialize({});
    this.initialized = true;
  }

  async requestAttIfNeeded(): Promise<void> {
    if (!this.initialized || this.attRequested) return;
    this.attRequested = true;
    try {
      const tracking = await AdMob.trackingAuthorizationStatus();
      if (tracking.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }
    } catch (e) { console.warn('ATT request failed', e); }
  }

  async showBanner(): Promise<void> {
    if (!this.initialized) return;
    const opts: BannerAdOptions = {
      adId: environment.admob.banner,
      adSize: this.isIPad ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 36,
      isTesting: false,
    };
    try { await AdMob.showBanner(opts); console.log('[ads] banner shown'); }
    catch (e) { console.warn('showBanner failed', e); }
  }

  async hideBanner(): Promise<void> {
    if (!this.initialized) return;
    try { await AdMob.hideBanner(); } catch {}
  }

  async showInterstitial(): Promise<void> {
    if (!this.initialized) return;
    this.gameOverCount = (this.gameOverCount + 1) % 3;
    if (this.gameOverCount !== 0) return;
    try {
      const opts: AdOptions = { adId: environment.admob.interstitial, isTesting: false };
      await AdMob.prepareInterstitial(opts);
      await AdMob.showInterstitial();
    } catch (e) { console.warn('showInterstitial failed', e); }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      const opts: RewardAdOptions = { adId: environment.admob.rewarded, isTesting: false };
      await Promise.race([
        AdMob.prepareRewardVideoAd(opts),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 10000)),
      ]);
      const item: AdMobRewardItem = await AdMob.showRewardVideoAd();
      return !!item;
    } catch (e) {
      console.warn('showRewarded failed/timeout', e);
      return false;
    }
  }
}
```

Changes from the prior version:
1. `AdMob.initialize({ testingDevices: [] } as any)` → `AdMob.initialize({})` — spec requires no `testingDevices` array in shipped code.
2. ATT request block moved out of `init()` into new public `requestAttIfNeeded()` method, guarded by one-shot `attRequested` flag.
3. All three `isTesting: true` → `isTesting: false`.

- [ ] **Step 4: Wire the ATT request into the first-game-over call site**

Open the file identified in Step 2. Find the method that handles game-over (likely injects `AdsService` and calls `showInterstitial()`). Add a call to `requestAttIfNeeded()` immediately before (or in parallel with) the interstitial call:

```ts
// Example — adapt to the actual method's structure:
await this.ads.requestAttIfNeeded();
await this.ads.showInterstitial();
```

The one-shot `attRequested` flag inside `AdsService` ensures only the first game-over triggers the native ATT alert. Subsequent games are no-ops.

If the game-over handler is already async, this is a drop-in insertion. If not, wrap it in `(async () => { ... })()` or make the handler async — follow the surrounding code style in the file.

- [ ] **Step 5: Browser-first smoke test**

Per the project's standing rule (saad's `feedback_browser_first.md`): verify in the browser before building.

Start the dev server:
```bash
npm start
```

In the browser (http://localhost:8100):
1. Open DevTools console. Load the home page.
2. Play one quick game, trigger game-over.
3. Expected console behavior: no uncaught errors, no `showInterstitial failed` or `ATT request failed` warnings (both AdMob and ATT APIs are no-ops on the web platform because `Capacitor.isNativePlatform()` returns false).
4. Expected UI behavior: unchanged — no visible difference from before.

Kill the dev server (`Ctrl+C`) once verified.

- [ ] **Step 6: TypeScript compile check**

```bash
npx tsc --noEmit
```
Expected: no errors. If `Property 'requestAttIfNeeded' does not exist` surfaces at the call site, Step 4 was skipped or applied to the wrong file.

- [ ] **Step 7: Verify the three isTesting flags**

```bash
grep -c "isTesting: true" src/app/core/services/ads.service.ts
grep -c "isTesting: false" src/app/core/services/ads.service.ts
grep -c "testingDevices" src/app/core/services/ads.service.ts
```
Expected: `0`, `3`, `0`.

- [ ] **Step 8: Commit**

```bash
git add src/app/core/services/ads.service.ts <game-over-file-from-step-2>
git commit -m "feat(ads): release-mode AdMob + ATT prompt after first game"
```

---

### Task 7: Non-API-usage audit

**Files:**
- No file edits. This task is a verification pass. The result is recorded in the task's commit message so the `PrivacyInfo.xcprivacy` manifest from Task 3 can be defended during App Review.

**Interfaces:**
- Consumes: Task 3's `PrivacyInfo.xcprivacy` (we are confirming its `NSPrivacyAccessedAPITypes` is correct and complete).
- Produces: a commit (empty or `--allow-empty`) whose message is the audit log. No source changes expected.

**Purpose:** confirm that `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` is the ONLY required-reason API category SkyFallBall uses. If the audit uncovers additional categories (file timestamps, boot time, disk space, active keyboards), STOP and update Task 3's manifest before continuing — a mismatch between declared and actual usage is a rejection reason.

- [ ] **Step 1: Search for file-timestamp API usage (NSPrivacyAccessedAPICategoryFileTimestamp)**

```bash
grep -rn "creationTime\|modificationTime\|birthtime\|fs\.stat\|Filesystem\.stat\|getUri\|getInfo" src/app --include="*.ts"
```

Review every hit:
- `Capacitor.Filesystem.stat()` returns file timestamps → requires category `FileTimestamp` with reason code (`C617.1`, `3B52.1`, or `0A2A.1`).
- Node-style `fs.stat` or `fs.statSync` → same requirement.
- `Device.getInfo()` (from `@capacitor/device`) is on the allowed list and does NOT require a reason.

Record each hit's file:line and verdict in a scratch note:
```
<file>:<line>  <api>  <decision — "allowed" or "needs declaration">
```

Expected result: no `Filesystem.stat` or `fs.stat` calls. `Device.getInfo()` is allowed. If a `Filesystem.stat` call is found, STOP and update Task 3's `PrivacyInfo.xcprivacy` to add the FileTimestamp category before committing this task.

- [ ] **Step 2: Search for system-boot-time API usage (NSPrivacyAccessedAPICategorySystemBootTime)**

```bash
grep -rn "bootTime\|uptime\|CLOCK_UPTIME\|mach_absolute_time" src/app --include="*.ts"
```

Expected: no hits. Angular/Ionic apps don't typically touch boot time.

- [ ] **Step 3: Search for disk-space API usage (NSPrivacyAccessedAPICategoryDiskSpace)**

```bash
grep -rn "freeSpace\|availableSpace\|diskSpace\|getFreeDiskSpace\|getUsableSpace" src/app --include="*.ts"
```

Expected: no hits.

- [ ] **Step 4: Search for active-keyboards API usage (NSPrivacyAccessedAPICategoryActiveKeyboards)**

```bash
grep -rn "activeInputModes\|UITextInputMode\|keyboards" src/app --include="*.ts"
```

Expected: no hits (Ionic uses standard HTML inputs; no custom keyboard API access).

- [ ] **Step 5: Confirm UserDefaults coverage**

```bash
grep -rn "Preferences\|Capacitor.Preferences\|@capacitor/preferences\|localStorage" src/app --include="*.ts" | head -20
```

Expected: multiple hits (`SettingsService`, `WalletService`, `MissionsService`, `AchievementService`, etc.). All read/write app-owned keys only (nothing cross-app). These are correctly covered by `CA92.1` in Task 3's manifest.

- [ ] **Step 6: Commit the audit log**

Create an empty commit whose message documents the audit outcome:

```bash
git commit --allow-empty -m "chore(ios): privacy manifest API-usage audit

Required-reason API categories reviewed per Apple's May 2024 rules:

- UserDefaults (NSPrivacyAccessedAPICategoryUserDefaults, CA92.1):
  USED. Covered by PrivacyInfo.xcprivacy. Hits: Capacitor Preferences in
  SettingsService, WalletService, MissionsService, AchievementService,
  TutorialService, GiftService, I18nService (app-owned keys only).

- FileTimestamp: NOT USED. No fs.stat / Filesystem.stat calls.
- SystemBootTime: NOT USED. No bootTime / uptime / mach_absolute_time.
- DiskSpace: NOT USED. No freeSpace / availableSpace queries.
- ActiveKeyboards: NOT USED. Standard HTML inputs only.

PrivacyInfo.xcprivacy declaration is correct and complete."
```

If any category OTHER than UserDefaults turned up positive in Steps 1-4, do NOT commit this message — go back to Task 3 and update the manifest first.

---

### Task 8: Codemagic rebuild + Sideloadly + 10-item validation

**Files:**
- No file edits. This task triggers the Codemagic cloud build, installs the resulting `.ipa` on the iPhone 17 via Sideloadly, and runs the 10-item validation protocol from the spec. The task "passes" when every checklist item passes.

**Interfaces:**
- Consumes: everything from Tasks 1-7 — the feature branch at HEAD must contain all preceding commits.
- Produces: one validated `.ipa` installed and running on the device. The implicit output is "Phase 1 complete, ready for Phase 2."

**Pre-flight checks** before triggering the build:

- [ ] **Step 1: Confirm the branch state**

```bash
git status
git log --oneline main..HEAD
```

Expected:
- Working tree clean (nothing uncommitted).
- At least 7 commits ahead of main (one per Task 1-7, though some tasks may have multiple commits).

If the tree is dirty or commits are missing, go fix before continuing.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin HEAD
```

Codemagic pulls from the pushed branch, not your local state.

- [ ] **Step 3: Trigger the Codemagic build**

Use the project's standard Codemagic trigger (API or UI, whichever the human prefers). The workflow is `ios-unsigned`, appId `6ad94fc92fa7ab3e2163992f`. The build produces `App.ipa` as an artifact.

If using the API with `curl`:
```bash
curl -X POST \
  -H "x-auth-token: $CODEMAGIC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appId":"6ad94fc92fa7ab3e2163992f","workflowId":"ios-unsigned","branch":"<your-branch-name>"}' \
  https://api.codemagic.io/builds
```

(`$CODEMAGIC_TOKEN` is the API token the human owns; do not commit it anywhere.)

Expected: HTTP 200 with a build id. Note the build URL — it is where logs and artifacts land.

- [ ] **Step 4: Wait for the build to finish and download the IPA**

Watch the Codemagic UI (or poll `GET /builds/<id>`) until status is `finished`. Expected duration: 8-15 minutes.

If the build FAILS, read the Codemagic logs:
- Xcode compile errors → check for pbxproj syntax issues from Task 4
- Code-sign errors → not expected on `ios-unsigned`; if seen, STOP and ask the human
- Missing file errors (`PrivacyInfo.xcprivacy not found`) → Task 4 step was skipped or wrong path

Fix root cause, commit, push, re-trigger. Do not patch over symptoms.

Download `App.ipa` from the build's artifact list.

- [ ] **Step 5: Install on iPhone 17 via Sideloadly**

The human runs Sideloadly on their Mac/Windows machine with the iPhone plugged in. Steps:
1. Open Sideloadly.
2. Drag `App.ipa` into the Sideloadly window.
3. Pick the plugged-in iPhone 17 as the target.
4. Click Start, enter Apple ID password when prompted.
5. On the device: Settings → General → VPN & Device Management → trust the signer.
6. Launch the app from the home screen.

If install fails with "unable to install" errors, the usual causes are bundle ID mismatch (expect `com.saad.skyfallball`) or expired cert — flag to the human, do not retry blindly.

- [ ] **Step 6: Run the 10-item validation protocol**

Each item from the spec (`docs/superpowers/specs/2026-10-23-app-store-phase1-build-infra-design.md` section "Validation Protocol"). Mark each pass/fail:

1. **Launch:** splash → home with no crash, no freeze.
2. **ATT prompt:** after the first completed game, the native iOS ATT alert appears. The description text must read exactly: **"Your data will be used to show personalized ads that help keep SkyFallBall free."** No other wording is acceptable.
3. **AdMob prod ads:** real content served, not Google's yellow "Test Ad" overlay. Banner appears on home (if the game shows a banner there), interstitial appears after some game-overs (the service shows one every 3rd game-over — play 3+ to trigger). Rewarded ad plays when the game-over revive button is tapped.
4. **Full gameplay cycle:** combos trigger haptics + toast; achievement toasts appear sequentially (not batched); missions update their progress; coins bank into the wallet.
5. **Share:** game-over Share button opens iOS system share sheet.
6. **Haptics:** tactile feedback on combo and pickup events.
7. **Settings persistence:** flip sound and haptic toggles → force-quit the app from the app switcher → relaunch → toggles still at the chosen state.
8. **i18n round-trip:** Settings → change language FR → EN → FR. All strings on home, game, settings, missions, and achievements screens must switch. No raw translation keys visible (e.g., `missions.title` leaking through = fail).
9. **Tutorial:** on a FRESH install (delete the app, re-sideload, launch), the single-step tutorial overlay appears on first Play. Settings → "Replay tutorial" resets the done-flag; next Play re-shows it.
10. **No console errors:** Safari (on Mac) → Develop menu → <iPhone name> → `App` web view. Play through one full cycle. The console must have no warnings and no errors.

- [ ] **Step 7: On any failed item**

Treat as a Phase 1 blocker. Steps:
1. Capture the symptom (screenshot, console log).
2. Diagnose root cause — do not patch the symptom.
3. Fix in a new commit on the same branch.
4. Push, re-trigger Codemagic, re-sideload, re-run the checklist FROM ITEM 1. Do not resume mid-checklist — a fix can break an earlier item.

The spec is explicit: **"no 'we'll handle it later' bypass."**

- [ ] **Step 8: Record the pass**

Once all 10 items pass, commit a final tag or an empty commit documenting the Phase 1 completion:

```bash
git commit --allow-empty -m "chore: Phase 1 validation passed on build <N> for v1.0.0"
git tag -a v1.0.0-phase1 -m "App Store Phase 1 compliance validated on iPhone 17"
git push --tags
```

Phase 1 is complete. Hand off to the human for Phase 2 (icon 1024, splash, screenshots).

---

## Post-plan: what Phase 1 does NOT ship

Reminder of scope boundaries (from the spec's Global Constraints) — if any of these come up mid-execution, STOP and ask the human; do not expand scope:

- Icon 1024×1024 for App Store Connect — Phase 2.
- Launch screen artwork beyond what exists — Phase 2.
- Screenshots (6.7", 6.5", 5.5", iPad) — Phase 2.
- Privacy policy URL + hosted page — Phase 3.
- Description, keywords, support URL copy — Phase 3.
- App Store Connect data nutrition labels entry — Phase 4.
- Age rating questionnaire — Phase 4.
- TestFlight invite flow — Phase 5.
- Build upload + submit to review — Phase 5.
- Any gameplay change, styling tweak, new feature, dependency bump.
