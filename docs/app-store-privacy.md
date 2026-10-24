# App Store Connect — Privacy & Age Rating Reference

Verbatim answers for App Store Connect forms. All data collection comes from the AdMob SDK — the app has no backend, no analytics, no login, no user accounts, no network calls to our own servers.

## App Privacy — "Does your app collect data?"

**Answer:** Yes (via AdMob SDK)

### Data types to declare

| Data type | Linked to user? | Used for tracking? | Purposes |
|---|---|---|---|
| Identifiers → Device ID | Yes | Yes | Third-Party Advertising |
| Usage Data → Product Interaction | No | Yes | Third-Party Advertising, Analytics |
| Diagnostics → Crash Data | No | No | App Functionality |
| Diagnostics → Performance Data | No | No | Analytics |
| Location → Coarse Location | Yes | Yes | Third-Party Advertising |

Reference: https://developers.google.com/admob/ios/privacy

### ATT

App already prompts via `NSUserTrackingUsageDescription` in Info.plist. Even if user denies ATT, keep "Used for tracking: Yes" on the rows above — tracking *can* occur when the user grants.

## IDFA Usage (Advertising Identifier)

**Answer:** Yes

Check:
- [x] Serve third-party advertisements within the app
- [x] I confirm this app follows the App Tracking Transparency framework

## Age Rating Questionnaire

All content categories = **None**:
- Cartoon or Fantasy Violence: None
- Realistic Violence: None
- Prolonged Graphic or Sadistic Realistic Violence: None
- Profanity or Crude Humor: None
- Mature/Suggestive Themes: None
- Horror/Fear Themes: None
- Medical/Treatment Information: None
- Alcohol, Tobacco, or Drug Use/References: None
- Simulated Gambling: None (daily spin = free reward, no wager)
- Sexual Content and Nudity: None
- Graphic Sexual Content and Nudity: None

Toggles:
- Unrestricted Web Access: **No**
- Gambling and Contests: **No**

**Expected rating: 4+**

## Export Compliance (Encryption)

Already set in `ios/App/App/Info.plist`:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Skips the yearly export-compliance prompt. App uses only standard HTTPS via platform/SDK — Apple's exemption applies.
