# WatShop Cafe — Android App

A native Android wrapper for **https://cafe.watshop.in/** that feels like a real app: branded splash screen, remote-controlled branding, native back/refresh/file-upload behavior, clean offline / maintenance / force-update screens, and external hand-off for `tel:`, `mailto:`, `upi://`, `whatsapp:`, `wa.me`, etc.

> **Primary store: Amazon Appstore (Fire OS).** A second Gradle flavor builds the same app for Google Play. Both flavors share the same `applicationId` and signing key, so you list one product in two stores.

- **Package**: `com.watshop.cafe`
- **Min SDK**: 23 (Android 6.0 / Fire OS 6 — covers all current Fire HD 8/10)
- **Target / compile SDK**: 34 (Android 14)
- **Language**: Kotlin
- **Build**: Gradle (Kotlin DSL), AGP 8.5
- **Distribution**: Amazon Appstore (`amazon` flavor — primary), Google Play (`google` flavor — secondary)

---

## 1. Project layout

```
android/
├── settings.gradle.kts
├── build.gradle.kts            ← root project
├── gradle.properties
├── gradle/wrapper/             ← run `gradle wrapper` once after cloning
└── app/
    ├── build.gradle.kts        ← app module + flavors + signing
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/watshop/cafe/
        │   ├── WatShopApplication.kt
        │   ├── MainActivity.kt           ← splash + config fetch + routing
        │   ├── WebViewActivity.kt        ← the wrapped site
        │   ├── ErrorActivity.kt
        │   ├── MaintenanceActivity.kt
        │   ├── UpdateActivity.kt         ← installer-aware update gate
        │   ├── config/
        │   │   ├── AppConfig.kt
        │   │   └── ConfigRepository.kt
        │   └── util/
        │       ├── ColorUtil.kt
        │       └── StoreLauncher.kt      ← detects installer + opens right store
        └── res/
            ├── layout/                   ← splash, web, error, maintenance, update
            ├── values{,-night}/          ← colors.xml, strings.xml, themes.xml
            ├── drawable/                 ← splash icon, error/maintenance icons
            ├── mipmap-anydpi{,-v26}/     ← launcher icon (vector)
            └── xml/                      ← network security, file paths, backup
```

---

## 2. How the app boots

1. Android shows the system splash (`Theme.WatShopCafe.Splash`, vector logo on `splashBackgroundColor`).
2. `MainActivity` hands off to its in-app splash, painted with the **last cached** remote branding so returning users see their colors immediately.
3. `ConfigRepository.fetchFresh()` calls `GET /api/mobile-app/config`. On success the JSON is persisted; on failure we fall back to the cached copy or the bundled defaults.
4. Routing decision (highest priority wins):
   - `forceUpdate` + `versionCode < minimumVersionCode` → **UpdateActivity**, which opens **Amazon Appstore** (Fire device) or **Google Play** (AOSP device) automatically — see [`StoreLauncher.kt`](app/src/main/java/com/watshop/cafe/util/StoreLauncher.kt).
   - `maintenanceMode` → **MaintenanceActivity**
   - Otherwise → **WebViewActivity** loading `https://cafe.watshop.in/`.
5. The WebView’s top progress bar mirrors page load progress; pull-to-refresh reloads; system back goes through WebView history then prompts `Close app?`.

---

## 3. Open in Android Studio

1. Install **Android Studio Hedgehog (2023.1.1) or later**.
2. Open Android Studio → *File → Open…* → select this **`android/`** folder (not the repo root).
3. The first time you open it, click **“Sync now”**. Studio will download AGP 8.5 + Gradle 8.7.
4. If the wrapper jar is missing (we don’t commit binaries), run from the `android/` folder:
   ```bash
   gradle wrapper --gradle-version 8.7 --distribution-type bin
   ```
   You need a system Gradle ≥ 8 once for this step (`brew install gradle` / `choco install gradle` / `sdk install gradle 8.7`). After it completes, `./gradlew` (Linux/Mac) or `gradlew.bat` (Windows) will work.
5. **Build variant selector** (bottom-left in Studio): choose `amazonRelease` (Fire OS) or `googleRelease` (Play).
6. Hit ▶ **Run app** with an emulator or a USB device (Developer Options → USB Debugging).

### 3.1 Recommended emulators

- **Fire OS testing**: Amazon doesn’t ship an official emulator anymore. The closest fidelity is the *Pixel 6 Tablet* AVD running **API 28 (no Google Play)** — that matches the Fire HD 10 (2021) WebView profile. Then verify on a real Fire HD before submission.
- **Play testing**: Any modern Pixel AVD with Google APIs.

---

## 4. Change the package name

`com.watshop.cafe` is referenced in three places:

1. `app/build.gradle.kts` → `namespace` and `applicationId`.
2. `AndroidManifest.xml` → `${applicationId}.fileprovider` (uses the placeholder, no edit needed).
3. Java package directory: `app/src/main/java/com/watshop/cafe/`. To rename, in Android Studio right-click the `cafe` package → **Refactor → Rename…** → enable “Search in comments and strings.”

If you change the package name, also update the **default** Amazon and Play URLs:
- `app/build.gradle.kts` → product flavor `buildConfigField "DEFAULT_STORE_URL"`.
- The remote-config defaults at `prisma/schema.prisma` → `MobileAppConfig.amazonAppstoreUrl` / `playStoreUrl`.

---

## 5. Change the website URL

Two ways:

- **One-off build**:
  ```bash
  ./gradlew assembleAmazonRelease \
    -PappBaseUrl=https://staging.example.com \
    -PconfigEndpoint=https://staging.example.com/api/mobile-app/config
  ```
- **Permanent**: edit the defaults in `app/build.gradle.kts` → `defaultConfig` → `appBaseUrl` and `configEndpoint`, then rebuild.

Also update `res/xml/network_security_config.xml` if you’re moving to a different domain (it whitelists `cafe.watshop.in` and `watshop.in`).

---

## 6. Generate a signed release build

### 6.1 Create a keystore (one time)

```bash
cd android
keytool -genkey -v \
  -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias watshopcafe
```

Save it **outside** version control. **Lose this file and you can never publish updates to your app on either store.** Back up at least two copies (encrypted USB / password manager / cloud vault).

> **Important — same keystore for both stores.** Use the *same* `release.keystore` for the `amazon` and `google` flavors. Both stores enforce signature continuity for updates; mismatched signing keys means you can never push an update.

### 6.2 Wire it into Gradle

Create `android/keystore.properties` (already in `.gitignore`):

```properties
storeFile=release.keystore
storePassword=********
keyAlias=watshopcafe
keyPassword=********
```

Gradle picks this up automatically — see `app/build.gradle.kts`.

### 6.3 Build

You get four useful outputs:

| Build variant | Command | Output | Use for |
|---|---|---|---|
| Amazon release APK | `./gradlew assembleAmazonRelease` | `app/build/outputs/apk/amazon/release/app-amazon-release.apk` | **Amazon Appstore upload** |
| Amazon debug APK | `./gradlew assembleAmazonDebug` | `app/build/outputs/apk/amazon/debug/app-amazon-debug.apk` | Sideload onto Fire tablet for testing |
| Google release AAB | `./gradlew bundleGoogleRelease` | `app/build/outputs/bundle/googleRelease/app-google-release.aab` | **Google Play upload** |
| Google release APK | `./gradlew assembleGoogleRelease` | `app/build/outputs/apk/google/release/app-google-release.apk` | Sideload Play build |

Bump `versionCode` and `versionName` in `app/build.gradle.kts` for every release.

---

## 7. Publish on Amazon Appstore (PRIMARY)

1. Sign up at <https://developer.amazon.com/apps-and-games/console/app/new>. Free; identity verification is much lighter than Play.
2. Click **Add a new App → Android**. Set name, default language, category (Food & Drink → Restaurant Pickup & Delivery).
3. **Availability & pricing** — pick free, choose countries, accept the Amazon Appstore distribution agreement.
4. **Description** — short (200 chars) and long. Plus keywords, what’s new in this release.
5. **Images & multimedia**:
   - Small icon: **114 × 114 PNG** (no alpha)
   - Large icon: **512 × 512 PNG** (no alpha)
   - Screenshots: **at least 3, 800 × 480 or larger**, 16:10 / 16:9 (phone or tablet)
   - Optional: promo image 1024 × 500 PNG, video URL (YouTube)
6. **Content rating** — fill the IARC questionnaire. For a non-game ordering app, “All Ages” is the typical outcome.
7. **Apply Android Manifest** — Amazon parses your APK and shows the device support matrix. Verify Fire HD 8 (Gen 8/10/12), Fire HD 10 (Gen 9/11/13) and Fire 7 (Gen 9/12) are all green; if any are red, check that all `<uses-feature>` declarations are `required="false"` (they already are in this project).
8. **Binary file(s)** — upload the APK from `app/build/outputs/apk/amazon/release/app-amazon-release.apk`. Amazon takes both APK and AAB; we recommend **APK** (more predictable, no Amazon-side resigning).
9. **Testing** — Amazon’s *Live App Testing* flow lets you ship to test users before public release. Set this up before your first submission.
10. Submit. Reviews land in **24–72 hours** typically.

### 7.1 Amazon-specific gotchas

- **No Google Play Services on Fire OS.** This app uses zero `com.google.*` libraries — verified by running `./gradlew :app:dependencies | grep gms` (returns nothing).
- **No microphone, no FCM, no Maps SDK.** All alternatives go through the website, so they work the same on Fire and AOSP.
- **WebView**: Fire OS 6+ uses an Amazon-managed Chromium-based WebView. Same APIs, but the version trails Chrome by ~6 weeks. Test camera and file upload on a real Fire HD before each release.
- **Fire 7 (older models)**: API 22, no camera, no GPS. Our `minSdk = 23` excludes them; if you want to support them, drop `minSdk` to 22 *and* test thoroughly because the WebView on those devices is ~Chrome 70 and very stale.
- **In-app purchases**: not used. If you ever add them, you must replace any Google Billing integration with **Amazon IAP** for the Amazon flavor — keep them under `app/src/amazon/java/...` so they don’t leak into the Google flavor.

---

## 8. Publish on Google Play (SECONDARY)

1. **Play Console** → *Create app* → set name, default language, free/paid, declarations.
2. **Internal testing** → Create a new release → upload `app/build/outputs/bundle/googleRelease/app-google-release.aab`.
3. **Set up your store listing**: title, short/long description, screenshots (phone + 7-inch tablet), feature graphic 1024×500, app icon 512×512.
4. **App content**: privacy policy URL (required — host one on `cafe.watshop.in/privacy`), data safety form, ads declaration, target audience.
5. **App access**: if the website needs login, provide a demo account so Google can review.
6. **Permissions justification** — see [§10 Security & store review notes](#10-security--store-review-notes).
7. Promote internal → closed → open → production once review passes.

The **first release** typically waits 7–14 days for review (Google now runs identity verification before any new app goes live). Subsequent updates are usually approved within hours.

---

## 9. Connect with the Railway backend

The app talks to two endpoints on the Next.js site (`cafeqr-pro-main`):

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/mobile-app/config` | GET (public) | Returns the JSON consumed by `ConfigRepository`. |
| `/api/mobile-app/assets/{logo,splash-logo}` | GET (public) | Serves the binary image you uploaded in the admin panel. |

Both are deployed automatically with the rest of the website on Railway. The first time you deploy after pulling these changes, run the migration:

```bash
# On Railway:  npm run db:deploy   (already part of `npm run start`)
# Locally:     npm run db:push
```

Once deployed, log in as super-admin and visit **/admin/mobile-app** to set the logo, colors, maintenance flag, **Amazon Appstore URL** and **Play Store URL**.

The app caches the JSON locally in `SharedPreferences` (`watshop_app_config.xml`), so it boots fine even if the API is briefly down.

---

## 10. Security & store review notes

- **Network security**: HTTPS only. `network_security_config.xml` pins our domain to system trust anchors and disables user-installed CAs from intercepting traffic. Cleartext is disabled at both the application and domain level.
- **`usesCleartextTraffic="false"`** declared on `<application>`.
- **WebView debugging** is on only for `BuildConfig.DEBUG` — automatically off in release builds.
- **JavaScript** is enabled (required for the website). No `addJavascriptInterface()` is used, eliminating the classic `JavascriptInterface` bridge attack surface.
- **Mixed content** is set to `MIXED_CONTENT_COMPATIBILITY_MODE` — passive mixed content (images) loads, active mixed content (scripts) is blocked. Our backend is HTTPS-only so this never triggers in practice.
- **Permissions** declared: `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA` (QR scanner), location (nearby cafes), `READ_MEDIA_IMAGES` / legacy `READ_EXTERNAL_STORAGE` (file uploads), `POST_NOTIFICATIONS`. Each is requested at runtime only when the website asks for it. Both store reviewers expect this justification list:
  - **Camera** — “Customer scans a QR code on a cafe table to open the menu.”
  - **Location** — “Customer can opt in to find nearby partner cafes.”
  - **Storage / Photos** — “Customer can attach a payment screenshot.”
- **Hardware features** all declared `required="false"` so the Amazon device matrix accepts cameraless Fire 7s and Fire TVs.
- **Force update** path is server-driven and installer-aware. Bumping `minimumVersionCode` in the admin panel locks out older clients within 60 s; the user is sent to whichever store they originally installed from.
- **R8 / ProGuard** is enabled for release with shrinking + obfuscation. See `proguard-rules.pro` for the keep rules.
- **Backup**: only the cached config preference is backed up; WebView cookies/cache are excluded so user sessions don’t leak across devices via Google Backup / Amazon Backup.
- **App icon**: vector adaptive icon (`mipmap-anydpi-v26/ic_launcher.xml`). For production-quality icons across all densities, use **Android Studio → File → New → Image Asset**, drop in your 1024×1024 logo, and let Studio generate `mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.png` files.
- **Splash logo**: bundled vector at `drawable/splash_icon.xml`. Override remotely via the admin panel — the admin-uploaded splash logo is rendered on top during `MainActivity`.

---

## 11. Common tasks

| Task | How |
|---|---|
| Sideload Amazon build to Fire tablet | Enable *Apps from Unknown Sources* on the Fire device → email the APK to yourself → tap to install. Or use `adb install -r` over Wi-Fi ADB. |
| Run on AOSP device | Plug in via USB, enable USB debugging, click ▶ in Studio with `googleDebug` selected. |
| Run unit tests | `./gradlew test` |
| Build all release variants | `./gradlew assembleRelease bundleRelease` |
| Inspect logs on Fire | `adb logcat -s WebViewActivity:V ConfigRepository:V` |
| Force-refresh config from app side | Cold-start the app or kill/restart from recents. |
| Debug WebView on Fire HD | Open `chrome://inspect` in desktop Chrome with USB-debugging on. Fire HDs expose Amazon’s WebView the same way as standard Android. |
| Verify no Google Play Services leaked into Amazon flavor | `./gradlew :app:dependencies --configuration amazonReleaseRuntimeClasspath \| grep "com.google.android.gms"` — should print nothing. |
