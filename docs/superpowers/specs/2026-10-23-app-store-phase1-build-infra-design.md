# App Store Phase 1 — Build Infra Design

**Date:** 2026-10-23
**Scope:** First of 5 phases toward App Store submission. This phase delivers a compliance-ready signed `.ipa` built by Codemagic, validated on iPhone 17 via Sideloadly.

---

## Goal

Prepare SkyFallBall for App Store review on the **technical compliance** axis: Apple's required privacy manifest, correct version metadata, release-mode AdMob configuration, ATT prompt wording, and a complete Info.plist audit. Output: one signed `.ipa` that passes App Review's automated and manual technical checks, with the gameplay regression validated on device.

**Non-goals (deferred to later phases):**
- Visual assets: icon 1024×1024, splash, screenshots (Phase 2)
- Legal copy: privacy policy URL, description, keywords, support URL (Phase 3)
- App Store Connect metadata entry: nutrition labels, age rating, pricing (Phase 4)
- Build upload, TestFlight, submit to review (Phase 5)
- Bundle size optimization, cold start perf (v1.1)

---

## Context

- **App:** SkyFallBall — Ionic 7 / Angular 22 / Capacitor 8 iOS game, bundle `com.saad.skyfallball`
- **Developer account:** Active, `hdia.paypal@gmail.com`
- **Current state:** Codemagic builds signed `.ipa` with ad-hoc profile; last build was sideloaded on iPhone 17 and gameplay works end-to-end. Build predates the v1 polish branch (commits `e9eba5c..4d7b204`) so a fresh build is required for v1.0.0.
- **Baseline version:** `0.0.1` in `package.json`; iOS project version unverified.
- **AdMob:** Production App ID `ca-app-pub-1958817675761413~8609085851` already set in `Info.plist`. `NSUserTrackingUsageDescription` present (wording to re-verify).

---

## Required Changes

### 1. PrivacyInfo.xcprivacy manifest

**Why:** Apple requires this manifest for all apps submitted since May 2024. Submissions without it are auto-rejected.

**Create:** `ios/App/App/PrivacyInfo.xcprivacy` (property list XML)

**Content shape:**

- **`NSPrivacyAccessedAPITypes`** — declare required-reason APIs used by our code
  - Entry 1: `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` (app functionality — Capacitor Preferences reads/writes keys owned by this app only)
  - No other required-reason API is used directly: no file timestamp, no system boot time, no disk space, no active keyboards

- **`NSPrivacyTracking: true`** — AdMob tracks via IDFA when ATT is granted

- **`NSPrivacyTrackingDomains`** — Google's official AdMob tracking domains:
  - `googleads.g.doubleclick.net`
  - `pagead2.googlesyndication.com`
  - `googleadservices.com`
  - `g.doubleclick.net`
  - (final list copied verbatim from Google's current AdMob privacy declarations page at implementation time)

- **`NSPrivacyCollectedDataTypes`** — what AdMob collects from our app (declared app-side, not relying on SDK's own manifest):
  - `NSPrivacyCollectedDataTypeDeviceID` — Linked: false, Tracking: true, Purposes: `[ThirdPartyAdvertising]`
  - `NSPrivacyCollectedDataTypeAdvertisingData` — Linked: false, Tracking: true, Purposes: `[ThirdPartyAdvertising]`
  - `NSPrivacyCollectedDataTypeProductInteraction` — Linked: false, Tracking: true, Purposes: `[ThirdPartyAdvertising, Analytics]`

**Xcode integration:** The file must appear in the `App` target's "Copy Bundle Resources" build phase. Preferred path: open `ios/App/App.xcworkspace` in Xcode, drag `PrivacyInfo.xcprivacy` into the `App` group, confirm "Copy items if needed" and "Add to target: App". Xcode writes the entry into `project.pbxproj` automatically. Direct pbxproj edit is possible but error-prone.

**Note on SDK manifest:** AdMob SDK ≥ 11.0 ships its own `PrivacyInfo.xcprivacy` inside the pod. We do **not** duplicate SDK declarations; the app-level manifest only declares what our code does. App Store Connect aggregates both at upload time.

### 2. Version bump

**Target:** `1.0.0`, build `1`.

**Two locations:**
- `package.json` → `"version": "1.0.0"` (cosmetic consistency)
- `ios/App/App.xcodeproj/project.pbxproj` → `MARKETING_VERSION = 1.0.0;` and `CURRENT_PROJECT_VERSION = 1;` for both `Debug` and `Release` build configurations. Info.plist's `CFBundleShortVersionString` and `CFBundleVersion` already reference these via `$(…)` substitution — no plist edit needed.

`capacitor.config.ts` has no version field; iOS handles it entirely via the Xcode project. Nothing to change there.

**Build number convention:** manual integer increment per Codemagic build submitted to App Store Connect. v1.0.0 release = build `1`; rebuild after fix = `2`. App Store Connect rejects re-upload with the same build number. Automation via Codemagic's `$BUILD_NUMBER` can be added in v1.1 if submissions multiply.

### 3. ATT & AdMob release configuration

**ATT prompt wording** (`Info.plist`, `NSUserTrackingUsageDescription`):

- Re-read current wording. Reviewer rejects promotional language ("show you better ads!") or vague copy ("improve your experience").
- Required pattern: explain *what* data is used *for*, user-facing.
- Approved template:
  > Your data will be used to show personalized ads that help keep SkyFallBall free.

**ATT prompt timing** (code audit, no API change expected):

- Prompt must fire **after** first gameplay, not at launch. Apple reviewers flag launch-time ATT as rejection reason.
- Code path: on first `game-over` → `AdMob.trackingAuthorizationStatus()` → if `notDetermined`, call `AdMob.requestTrackingAuthorization()`.
- If refused: AdMob must serve non-personalized ads (`npa=1` in request parameters).

**AdMob release config** (audit `src/app/core/services/ads.service.ts`):

- `AdMob.initialize({ initializeForTesting: false, ... })` or omit `initializeForTesting` entirely (defaults to false)
- No `testingDevices: [...]` array in shipped code
- All ad unit IDs are production units from the AdMob console, **not** Google's demo IDs (demo IDs start with `ca-app-pub-3940256099942544/`)
- Confirm `Info.plist` `GADApplicationIdentifier = ca-app-pub-1958817675761413~8609085851` matches AdMob console

**SKAdNetworkIdentifiers** (`Info.plist`):

- Add Google's official SKAdNetwork ID list (~60 entries) to `Info.plist` under `SKAdNetworkItems`.
- Without this list, ads serve but post-ATT attribution breaks → eCPM collapses.
- Source: Google's "SKAdNetwork identifiers" documentation page at implementation time.

**Encryption export compliance** (`Info.plist`):

- Add `ITSAppUsesNonExemptEncryption = false` as boolean key.
- SkyFallBall uses only HTTPS standard transport (exempt from export regulations).
- Without this key, every App Store Connect upload requires manual re-answer in the compliance questionnaire — tedious and error-prone.

### 4. Info.plist audit

Full key checklist. Add missing, remove any `NS*UsageDescription` key for features we don't actually use (Apple rejects declared-but-unused permissions).

**App identity:**
- `CFBundleDisplayName = SkyFallBall`
- `CFBundleIdentifier = com.saad.skyfallball` (inherited from target config, verify not overridden)
- `CFBundleShortVersionString = 1.0.0`
- `CFBundleVersion = 1`
- `LSApplicationCategoryType = public.app-category.games`

**Device & orientation** (already set, verify):
- `LSRequiresIPhoneOS = true`
- `UISupportedInterfaceOrientations` (iPhone) = portrait only
- `UISupportedInterfaceOrientations~ipad` = portrait + landscape (both orientations)

**Privacy declarations:**
- `NSUserTrackingUsageDescription` — present, wording per Section 3 above
- `GADApplicationIdentifier` — present
- `ITSAppUsesNonExemptEncryption = false` — to add
- `SKAdNetworkItems` → `SKAdNetworkIdentifiers` array — to add

**Launch:**
- `UILaunchStoryboardName = LaunchScreen` — verify file exists in project

**Remove if present:**
- Any `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibrary*UsageDescription`, `NSLocation*UsageDescription`, `NSContactsUsageDescription`, `NSMotionUsageDescription`, `NSBluetooth*UsageDescription`, `NSFaceIDUsageDescription`. SkyFallBall uses none of these.

### 5. Non-API-usage audit

Confirm no code path uses APIs that would require additional `NSPrivacyAccessedAPITypes` declarations beyond UserDefaults:

- Review all `src/app/core/services/*.service.ts` for calls to file system APIs with timestamps (`fs.stat`, Capacitor Filesystem with timestamp access)
- No usage of system boot time, disk space queries, or active keyboards
- Expected result: UserDefaults is the only required-reason API we touch. Document the audit in the implementation plan so the reviewer can verify.

---

## Validation Protocol

**Gate:** All code/config changes landed → Codemagic rebuild → Sideloadly install on iPhone 17 → run full checklist. **Every item must pass** before declaring Phase 1 done.

1. **Launch:** splash → home with no crash, no freeze
2. **ATT prompt:** after first completed game, native Apple ATT alert appears with the wording from Section 3
3. **AdMob prod ads:** banner on home, interstitial after game-over, served ads are real content (not Google's yellow "test ad" placeholder)
4. **Full gameplay cycle:** combos trigger, achievement toasts appear sequentially (not batched), missions progress, coins banked
5. **Share:** game-over Share button opens iOS system share sheet
6. **Haptics:** tactile feedback on combo and pickup events
7. **Settings persistence:** sound and haptic toggles survive app kill + relaunch
8. **i18n round-trip:** switch FR → EN → FR, all strings translate (home, game, settings, missions, achievements)
9. **Tutorial:** fresh install launches tutorial on first Play; "Replay tutorial" in settings resets and relaunches it
10. **No console errors:** Safari Web Inspector connected during gameplay shows no warnings or errors

**On fail:** fix root cause, rebuild Codemagic, re-sideload, re-run checklist from item 1. No "we'll handle it later" bypass.

---

## File Map

**Create:**
- `ios/App/App/PrivacyInfo.xcprivacy`

**Modify:**
- `ios/App/App/Info.plist` — add `ITSAppUsesNonExemptEncryption`, `SKAdNetworkItems`, `LSApplicationCategoryType`; verify + possibly rewrite `NSUserTrackingUsageDescription`. Version keys (`CFBundleShortVersionString`, `CFBundleVersion`) already use `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)` substitution — no edit needed in Info.plist.
- `ios/App/App.xcodeproj/project.pbxproj` — `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION` (Debug + Release)
- `package.json` — `version`
- `src/app/core/services/ads.service.ts` — audit; remove `initializeForTesting: true`, remove any `testingDevices`, confirm production ad unit IDs

**Verify (modify only if issues found):**
- `capacitor.config.ts`
- `src/app/core/services/settings.service.ts`, `wallet.service.ts`, `missions.service.ts`, `achievement.service.ts`, `tutorial.service.ts`, `gift.service.ts`, `i18n.service.ts` — confirm no non-UserDefaults required-reason APIs

**Build & test:**
- Codemagic rebuild (existing workflow)
- Sideloadly install on iPhone 17
- Run validation checklist from Section "Validation Protocol"

---

## Global Constraints

- **iOS target:** iOS 15.0+ (matches current Capacitor 8 floor)
- **Bundle ID:** `com.saad.skyfallball` — do not change
- **AdMob App ID:** `ca-app-pub-1958817675761413~8609085851` — do not change
- **Version floor:** v1.0.0 build 1
- **No new dependencies:** this phase is config and manifests only. No new npm packages, no new Capacitor plugins. If a plugin is missing, flag and ask — don't add silently.
- **No scope creep:** anything not listed above (icon, screenshots, privacy policy URL, description) belongs to a later phase. Do not touch.

---

## Deliverable

A commit (or small series) on a feature branch that lands all changes above, plus one Codemagic build whose `.ipa` has been sideloaded and verified on iPhone 17 per the validation checklist.

**Ready for Phase 2** when: Codemagic build v1.0.0 build 1 installs cleanly, every checklist item passes, no console errors.
