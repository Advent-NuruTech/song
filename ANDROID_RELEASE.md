# Advent Pro Android release guide (version 1.2.0)

This project is configured to produce two different Android files:

- `preview` creates an **APK**. Send this file to a tester through WhatsApp; it can be installed directly.
- `production` creates an **AAB**. Upload this file to Google Play Console; it cannot be installed directly on a phone.

The Android application ID is `com.adventpro`. Do not change it after the first Play Console release. EAS manages `versionCode` remotely and increments it for production builds; the public version shown to users is `1.2.0`.

## 1. One-time setup on the development computer

1. Install Node.js 20 LTS or 22 LTS and Git.
2. Open a terminal in this project folder.
3. Install the exact dependencies:

   ```powershell
   npm ci
   ```

4. Sign in to the Expo account that owns this project (`advent384`):

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   ```

5. Run the release checks:

   ```powershell
   npm run validate:content
   npm run lint
   npx tsc --noEmit
   npx expo-doctor
   ```

All commands must finish without errors. A warning should be reviewed, but it does not necessarily block a build.

## 2. Build the APK for WhatsApp testing

1. Run:

   ```powershell
   npm run build:android:test
   ```

2. If EAS asks about Android credentials, choose **Generate new keystore** and let EAS store it. Keep using the same Expo project and signing credentials for later updates.
3. Wait for the cloud build. When it finishes, open the build link and download the `.apk` file.
4. Rename it to something recognizable, for example `Advent-Pro-1.2.0-test.apk`.
5. Send the APK to the tester as a WhatsApp document. If WhatsApp refuses the file or changes it, send the EAS download link instead.

### Instructions for the tester

1. Download the APK on the Android phone.
2. Open it and allow **Install unknown apps** for WhatsApp or the phone's file manager when Android asks.
3. Install and open Advent Pro.
4. If Android reports a signature conflict, uninstall an older test copy first, then install this APK. This removes that copy's local app data.
5. Test on Wi-Fi and mobile data, then test with airplane mode after content has loaded.
6. Report the phone model, Android version, screen recording/screenshot, and the exact steps for every problem.

### Minimum test checklist

- Fresh install, splash screen, icon, and first launch
- Home, categories, songs, song details, search, Bible, and studies
- English, Swahili, and Luo content; long text and font-size settings
- Light/dark theme and Android back navigation
- Sharing text to WhatsApp
- Offline launch and offline reading
- Sign up, email confirmation, sign in/out, profile update, password update
- Post/comment features and account-deletion request
- Privacy policy, terms, About links, calls, and WhatsApp contact actions
- Relaunch after the phone restarts; no crashes or blank screens

Fix any release-blocking problem, run the checks again, and make another preview APK. Preview builds may keep the same public version; Play builds receive a unique `versionCode` automatically.

## 3. Prepare Google Play Console

1. Create or verify the Google Play developer account and complete identity/contact verification.
2. In Play Console, create an app named **Advent Pro**, choose the correct default language, select **App**, and choose whether it is free or paid. A free app cannot later be changed to paid.
3. Confirm the package name is exactly `com.adventpro` when the first bundle is uploaded.
4. Complete the store listing:
   - App name, short description, and full description
   - 512 x 512 Play Store icon
   - 1024 x 500 feature graphic
   - At least two good phone screenshots (more are recommended)
   - App category and support contact details
5. Deploy the public legal pages in `admin-web` before submission. Configure its Supabase/server environment variables on the host, then verify these pages work without signing in:
   - `https://YOUR_DOMAIN/privacy`
   - `https://YOUR_DOMAIN/terms`
   - `https://YOUR_DOMAIN/account-deletion`
6. Enter the public privacy URL and account-deletion URL in Play Console.
7. Complete **App content** honestly: Data safety, ads, content rating, target audience, app access, news-app declaration, and any other declarations shown. The app uses account email/display name and Supabase authentication, so do not declare that it collects no data.
8. If reviewers need an account to reach restricted features, supply a working review account and precise instructions under **App access**. Do not give Google an administrator account.

## 4. Build the signed Play Store bundle

Only do this after the tested APK is accepted:

```powershell
npm run build:android:play
```

The `production` profile creates a signed `.aab` and increments the remote Android `versionCode`. Download the AAB from the EAS build page and keep the build link for your records. Do not send the AAB to a phone—it is for Play Console.

To inspect the current remote build number before an update, use:

```powershell
npx eas-cli@latest build:version:get --platform android
```

If this app already has a release outside EAS, first synchronize EAS with the highest `versionCode` already uploaded to Play:

```powershell
npx eas-cli@latest build:version:set --platform android
```

Enter the last Play Store `versionCode`; the next production build will increment it.

## 5. Upload and test through Google Play

1. Open Play Console -> **Test and release** -> **Testing** -> **Internal testing**.
2. Create a release and upload the `.aab`.
3. Add release notes for version 1.2.0, save, review, and roll out to internal testing.
4. Add tester email addresses or a Google Group, copy the opt-in link, and have testers install from Google Play. Test this Play-installed build even if the direct APK worked, because Play signing and delivery are different.
5. Resolve every Play Console error. Review warnings and fix those that apply.
6. For a personal developer account created after November 13, 2023, run the required closed test (currently at least 12 opted-in testers continuously for 14 days), then apply for production access in Play Console.
7. Promote the tested release to **Production**, select the intended countries/regions, review the rollout, and submit it for Google review.

## 6. After publishing

1. Wait until Play Console shows the release as available, then install it from its public store page.
2. Verify sign-in, content sync, sharing, privacy links, account deletion, and offline reading again.
3. Monitor Android vitals, crashes/ANRs, reviews, Supabase usage, and deletion requests.
4. Process account-deletion requests promptly; the current database flow records a request but a trusted administrator or server job must remove the Supabase Auth user and associated personal data.
5. For every update, increase `expo.version`, run all checks, build a preview APK, test it, then make one production AAB. Never lose or replace the Android signing setup.

## Release gate

Do not submit to production until all of these are true:

- The preview APK passed the checklist on at least one real Android phone.
- The AAB was accepted in Play internal testing.
- Public privacy, terms, and account-deletion URLs work without login.
- Data safety answers match the app's real Supabase/account behavior.
- A real deletion request has been tested end-to-end, including administrator processing.
- Store graphics, screenshots, descriptions, content rating, target audience, and app access are complete.
- No unresolved Play Console errors or release-blocking crashes remain.
