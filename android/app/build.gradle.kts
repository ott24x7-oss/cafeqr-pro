import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Optional release signing config. Drop a keystore.properties file beside
// app/ with storeFile / storePassword / keyAlias / keyPassword and the
// release build will be signed automatically. Without it, ./gradlew
// assembleRelease still produces an unsigned APK you can sign manually.
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) load(FileInputStream(keystorePropsFile))
}

android {
    namespace = "com.watshop.cafe"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.watshop.cafe"
        // minSdk 23 is the highest floor that still covers all current Fire
        // OS 6 / 7 tablets (Fire HD 8/10 2020+). Older Fire 7 (Fire OS 5,
        // API 22) is end-of-life and has a stale WebView, so we don't
        // bother shipping to it.
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        // The website URL the app wraps. Build-time override:
        //   ./gradlew assembleAmazonRelease -PappBaseUrl=https://staging.example.com
        val appBaseUrl = (project.findProperty("appBaseUrl") as String?) ?: "https://cafe.watshop.in/"
        val configEndpoint = (project.findProperty("configEndpoint") as String?)
            ?: "https://cafe.watshop.in/api/mobile-app/config"

        buildConfigField("String", "APP_BASE_URL", "\"$appBaseUrl\"")
        buildConfigField("String", "CONFIG_ENDPOINT", "\"$configEndpoint\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Two flavors so the same source produces:
    //   - amazon  (PRIMARY) — Amazon Appstore / Fire OS submissions
    //   - google  (SECONDARY) — Google Play Store submissions
    //
    // applicationId is identical across flavors: a user installing both
    // would never happen, and we want the same identity in analytics /
    // session cookies / telemetry. The flavor only changes the default
    // store URL embedded in BuildConfig (used as a fallback when the
    // remote config has no Amazon/Play URL set yet).
    flavorDimensions += "store"
    productFlavors {
        create("amazon") {
            dimension = "store"
            buildConfigField("String", "STORE_FLAVOR", "\"amazon\"")
            buildConfigField(
                "String",
                "DEFAULT_STORE_URL",
                "\"https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe\"",
            )
        }
        create("google") {
            dimension = "store"
            buildConfigField("String", "STORE_FLAVOR", "\"google\"")
            buildConfigField(
                "String",
                "DEFAULT_STORE_URL",
                "\"https://play.google.com/store/apps/details?id=com.watshop.cafe\"",
            )
        }
    }

    signingConfigs {
        if (keystorePropsFile.exists()) {
            create("release") {
                storeFile = file(keystoreProps["storeFile"] as String)
                storePassword = keystoreProps["storePassword"] as String
                keyAlias = keystoreProps["keyAlias"] as String
                keyPassword = keystoreProps["keyPassword"] as String
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            isDebuggable = true
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (keystorePropsFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    packaging {
        resources.excludes += setOf(
            "META-INF/AL2.0",
            "META-INF/LGPL2.1",
            "META-INF/DEPENDENCIES",
        )
    }
}

dependencies {
    // AndroidX foundation
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.5")

    // Material 3 — light/dark themes, swipe refresh styling, color helpers
    implementation("com.google.android.material:material:1.12.0")

    // Layout primitives used in the WebView, error and update screens
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    // WebView extras (assets, cookies, JS bridge helpers)
    implementation("androidx.webkit:webkit:1.11.0")

    // Splash screen (compat back to API 23 — gives us native theme attrs).
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Coroutines for the config fetch + IO on the main activity
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // OkHttp for the lightweight config GET (no Retrofit needed for one
    // endpoint). Plus Glide for remote logo loading on the splash.
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.github.bumptech.glide:glide:4.16.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
