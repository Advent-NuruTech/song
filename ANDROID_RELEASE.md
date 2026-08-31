# Advent Pro Android release guide (version 2.0.0)

Last verified: August 27, 2026.

This project produces two Android artifacts:

- The `preview` profile creates an installable **APK** for direct testing.
- The `production` profile creates an **AAB** for Google Play. An AAB is not installed directly on a phone.

The application ID is `com.adventpro`; never change it after the first Play release. The public version is `2.0.0`. EAS stores the Android `versionCode` remotely and increments it for production builds because `eas.json` uses `appVersionSource: "remote"` and `autoIncrement: true`. The production cloud build uses the supported Node 22 runtime pinned in `eas.json`.

The app currently uses Expo SDK 54 and React Native 0.81. SDK 54 compiles and targets Android 16/API 36, which meets Google Play's API 36 requirement that applies to new mobile-app submissions and updates from August 31, 2026. Do not override the target SDK below 36.

Prepared 2.0.0 candidate: EAS build `0bd02ad7-ed14-4d29-bc3e-a0389c3185e1`, Android `versionCode` 6, local artifact `artifacts/Advent-Pro-2.0.0-build-6.aab`, SHA-256 `5CD28773EF42C3A0368B0AF8AE367A3CCCC86349F86B01D30B1F1A269062FF74`.

This replacement candidate keeps camera capture available while declaring physical camera hardware optional. It supersedes version code 5, which Play reported as unnecessarily excluding 402 camera-less device models.

## 1. Release scope for 2.0.0

Release testing and store text should cover the features that are actually in this build:

- Offline songs, studies, Bible versions, search, categories, and reading settings
- Verse of the day and scripture, hymn, and study sharing
- Home discovery with up to 20 videos and 20 studies, with Explore more links only after a section reaches 20 items
- Videos and Shorts through the embedded YouTube player
- Media and study views, likes, comments, sharing, reports, moderation, and discovery rankings
- Email/password accounts, display names, role-based administration, and account-deletion requests
- A local 6:00 AM Bible reminder plus signed-in remote alerts for new resources, replies, donation receipts, and verified app updates
- Light/dark themes, responsive Android layouts, and offline cached content

Suggested release-note summary:

> Adds on-demand song and study downloads, administrator-managed categories, videos and Shorts, richer study discovery and community interactions, improved sharing and Bible navigation, refreshed account controls, and updated privacy and release information.

## 2. One-time setup

1. Install Git and a Node version allowed by `package.json`: Node `20.19.x`, `22.x`, or `24.x`. Prefer the latest maintained LTS line supported by the project.
2. Open PowerShell in the repository root and install the locked dependencies:

   ```powershell
   npm ci
   npm --prefix admin-web ci
   ```

3. Sign in to the Expo account that owns project `10279f57-4ab4-42b7-a5bc-7bc53df7df1d`:

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   ```

4. Let EAS manage the Android signing keystore. Keep the same application ID, Expo project, upload key, and Play App Signing setup for every update.

### One-time Android push setup

Remote push notifications cannot be tested in Expo Go. Expo Go can still test the local 6:00 AM reminder; use this project's preview APK or a development/release build for server-sent notifications.

1. In Firebase, use the same Android app/package (`com.adventpro`) represented by the checked-in `google-services.json`.
2. Generate a Firebase service-account private key, then run `npx eas-cli@latest credentials --platform android` and upload it under **Google Service Account > Push Notifications (FCM V1)**. Never commit that private key. The checked-in `google-services.json` is public client configuration and is not the server credential.
3. In Expo/EAS, enable enhanced push security and copy its access token into the deployed Supabase secret `EXPO_ACCESS_TOKEN`.
4. Set a separate high-entropy `NOTIFICATION_CRON_SECRET`, deploy the notification functions, and schedule the authenticated `dispatch-notifications` request as documented in `supabase/functions/README.md`.
5. Build and install the preview APK with `npm run build:android:test`, sign in, enable notifications in Advent Pro settings, and allow Android's notification permission. Confirm a row is registered in `push_devices`, then test a real remote notification and its delivery receipt before production.

## 3. Pre-build release checks

Run these from the repository root:

```powershell
npm run validate:content
npm run test:media
npm run test:notifications
npm run lint
npx tsc --noEmit
npx expo-doctor
npm --prefix admin-web run build
```

All commands must finish without errors. Review warnings before proceeding.

Also verify the following manually:

1. `package.json`, `app.json`, the About screen, and `android/app/build.gradle` all show public version `2.0.0`.
2. `app.json` and the Android native project resolve to package `com.adventpro` and target API 36.
3. The production Supabase database has every migration in `supabase/MIGRATIONS.md`, currently through `019_dynamic_content_categories.sql`. Migration `017_production_notifications.sql` is required before any remote notification test.
4. The public site is deployed with working, no-login pages:
   - `https://song-pied-eight.vercel.app/privacy`
   - `https://song-pied-eight.vercel.app/terms`
   - `https://song-pied-eight.vercel.app/account-deletion`
   Redeploy `admin-web` after legal-link changes and confirm the rendered pages contain no links or copy pointing to the expired `adventnurutech.xyz` domain.
5. The privacy policy and Play Data Safety answers match the shipping binary, including Supabase authentication, email/display name, comments and reports, likes, media/study view activity, session identifiers, watch duration, embedded YouTube playback, and account deletion.
6. The account-deletion page provides an actual way to submit a request without reinstalling the app, and a trusted administrator or server process can complete the pending database request by deleting the Supabase Auth account and associated personal data.

## 4. Build and test the preview APK

Build the direct-install test file:

```powershell
npm run build:android:test
```

When the build completes, download the `.apk` from its EAS build page and name it clearly, for example `Advent-Pro-2.0.0-preview.apk`. Send it as a document or share the EAS download link.

### Tester installation

1. Download and open the APK on an Android phone.
2. Allow **Install unknown apps** for the browser, WhatsApp, or file manager when Android asks.
3. If Android reports a signature conflict, first confirm the APK came from this project's EAS credentials. Uninstall an older test copy only if necessary; uninstalling removes that copy's local app data.
4. Record the phone model, Android version, connection type, screenshots or screen recordings, and exact reproduction steps for every problem.

### Minimum device checklist

- Fresh install, icon, splash screen, first launch, edge-to-edge layout, status/navigation bars, and Android back behavior
- Home page: never more than 20 videos or 20 studies; Explore more appears only when its section reaches 20 items and opens the correct page
- Categories, songs, song detail, search, Bible navigation, studies, rich study content, and daily verse
- English, Swahili, and Luo resources; long text; font sizes; light and dark themes
- Videos, Shorts, YouTube playback, inactive/active player behavior, pagination, cached states, and poor/offline-network messages
- Signed-out and signed-in view counting, duplicate-view protection, likes, comments, deletion, reporting, moderation, shares, and updated counters
- For-you and popular studies, study engagement, and behavior when discovery services are unavailable
- Account creation, email confirmation, sign-in/out, display-name and email updates, password update, roles, and expired sessions
- Notification permission, the local daily reminder, signed-in push-device registration, foreground/background/terminated delivery, deep links, read state, preference opt-outs, and invalid-token cleanup
- In-app Terms acceptance before the first comment or other user-generated submission
- In-app reporting and user/content blocking flows required for publicly accessible user-generated content
- Account-deletion request, sign-out after the request, administrator processing, and verification that associated personal data is removed
- Public privacy, terms, and account-deletion links without login
- Calls, WhatsApp, donation links, clipboard/share sheet, and Play Store share link
- Relaunch after force-stop and phone restart; offline launch and reading after content has loaded; no crashes, blank screens, or stuck loaders

Fix release-blocking problems, rerun all checks, and issue another preview APK before creating the Play bundle.

## 5. Prepare Google Play Console

1. Create or verify the Play developer account and complete its identity and contact verification.
2. Create an app named **Advent Pro**, select the correct default language and app type, and choose free or paid carefully. A free app cannot later be converted to paid.
3. Confirm the package name is exactly `com.adventpro` when uploading the first bundle, and enable or confirm Play App Signing.
4. Complete the main store listing with accurate content:
   - App name, short description, and full description
   - 512 x 512 PNG Play Store icon
   - 1024 x 500 feature graphic
   - At least two valid screenshots; four portrait screenshots at 1080 x 1920 or higher are recommended for broader featuring eligibility
   - App category, developer contact details, and release notes
5. Under **Policy and programs → App content** (wording may move), complete every applicable declaration: privacy policy, Data Safety, ads, app access, content rating, target audience, news-app status, account deletion, and any permission or content declarations Play shows.
6. In Data Safety, audit both first-party code and third-party libraries. Do not state that Advent Pro collects no data. Check at least account identifiers/email/display name, user-generated comments and reports, app interactions such as likes and views, pseudonymous session identifiers and watch duration, Supabase processing, embedded YouTube behavior, encryption in transit, and deletion handling against the final bundle.
7. Because comments are publicly accessible user-generated content, confirm the release complies with Google Play's UGC policy. Users must accept the Terms or user policy before posting, objectionable behavior must be prohibited, and the app must provide suitable in-app reporting, blocking, and ongoing moderation. Treat a missing required safeguard as a release blocker.
8. Supply a non-administrator reviewer account and exact access instructions if Google cannot reach account-only features itself.
9. If this is a personal developer account created after November 13, 2023, plan for a closed test with at least 12 testers opted in continuously for at least 14 days before applying for production access. Internal testing alone does not satisfy this requirement.

## 6. Build the production AAB

Only build production after the preview APK passes:

```powershell
npm run build:android:play
```

The production profile creates a signed `.aab` and increments the remote Android `versionCode`. Download the AAB and keep the EAS build URL and test record. Do not send an AAB to testers for direct installation.

Inspect the remote build number when needed:

```powershell
npx eas-cli@latest build:version:get --platform android
```

If an earlier Play build used a higher `versionCode` outside this EAS remote-version history, synchronize EAS before the next production build:

```powershell
npx eas-cli@latest build:version:set --platform android
```

Enter the greatest `versionCode` already uploaded to Play; the next production build will increment it.

## 7. Upload, test, and release through Google Play

1. Open **Test and release → Testing → Internal testing**, create a release, and upload the AAB. Play Console labels can change; use its dashboard tasks if the exact navigation differs.
2. Add version 2.0.0 release notes, save, review, and roll out to internal testing.
3. Add tester emails or a Google Group and share the opt-in link. Test the Play-installed build even if the direct APK passed because Play signing and delivery are different.
4. Resolve every Play Console error. Review warnings, pre-launch reports, accessibility findings, Android vitals, and policy messages.
5. If the account is subject to the new-personal-account rule, complete the qualifying closed test and production-access application.
6. Promote the tested release to Production, select intended countries/regions, review the staged or full rollout, and submit it for Google review.
7. After approval, install from the public listing and recheck sign-in, Supabase sync, videos/Shorts, comments and reports, sharing, privacy links, account deletion, and offline reading.

## 8. Release gate

Do not submit to production until all of these are true:

- The exact production candidate passed the checklist on at least one real Android device, with another Android version or screen size tested where possible.
- The AAB targets API 36, has package `com.adventpro`, public version `2.0.0`, and a unique `versionCode`.
- Every database migration through 019 is deployed and the app behaves safely if network-backed features fail.
- Public privacy, terms, and account-deletion pages work without login and match actual app behavior.
- Data Safety answers include current account, community, activity, session, third-party SDK, and deletion behavior.
- Terms acceptance, objectionable-content rules, in-app reporting/blocking, and operational moderation satisfy the UGC policy before comments are enabled in production.
- A real account-deletion request has been completed end-to-end, not merely queued.
- Store graphics, screenshots, descriptions, content rating, target audience, app access, and reviewer credentials are complete.
- There are no unresolved Play Console errors, release-blocking crashes/ANRs, or critical pre-launch findings.

## Current official references

- [Expo SDK 54 platform support and API levels](https://docs.expo.dev/versions/v54.0.0/)
- [EAS app version management](https://docs.expo.dev/build-reference/app-versions/)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google Play Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play user-generated-content policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)
- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Google Play store-listing asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)

Re-check these official pages before every release because Play Console requirements and navigation can change.
