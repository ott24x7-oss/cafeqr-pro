package com.watshop.cafe.util

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import com.watshop.cafe.BuildConfig

/**
 * Picks the right app-store URL for the current device and opens it.
 *
 * Selection priority:
 *  1. Installer package — the most reliable signal. If we were installed
 *     by Amazon Appstore (`com.amazon.venezia`) we open Amazon; if by
 *     Google Play (`com.android.vending`) we open Play.
 *  2. Build flavor — `BuildConfig.STORE_FLAVOR` set by Gradle. Acts as a
 *     fallback when the installer is unknown (e.g. sideloaded debug
 *     builds during development).
 *  3. Hard-coded `BuildConfig.DEFAULT_STORE_URL` if both remote URLs are
 *     blank.
 *
 * Then we try the deep link with the store-specific package set; if the
 * store app isn't installed (uncommon — Fire devices ship Amazon, Play
 * devices ship Play) we fall back to a plain web URL.
 */
object StoreLauncher {

    /** What kind of store this device most likely uses. */
    enum class Store { AMAZON, GOOGLE_PLAY, UNKNOWN }

    private const val PKG_AMAZON = "com.amazon.venezia"
    private const val PKG_GOOGLE_PLAY = "com.android.vending"

    fun detectStore(context: Context): Store {
        val pm = context.packageManager

        @Suppress("DEPRECATION")
        val installer: String? = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                pm.getInstallSourceInfo(context.packageName).installingPackageName
            } else {
                pm.getInstallerPackageName(context.packageName)
            }
        } catch (_: Throwable) {
            null
        }

        return when (installer) {
            PKG_AMAZON -> Store.AMAZON
            PKG_GOOGLE_PLAY -> Store.GOOGLE_PLAY
            else -> when (BuildConfig.STORE_FLAVOR) {
                "amazon" -> Store.AMAZON
                "google" -> Store.GOOGLE_PLAY
                else -> Store.UNKNOWN
            }
        }
    }

    /**
     * Open the store listing for this app, preferring [amazonUrl] on Fire /
     * Amazon-installed devices and [playUrl] on Play-installed devices.
     */
    fun open(context: Context, amazonUrl: String, playUrl: String) {
        val store = detectStore(context)
        val webUrl = when (store) {
            Store.AMAZON -> amazonUrl.ifBlank { playUrl }.ifBlank { BuildConfig.DEFAULT_STORE_URL }
            Store.GOOGLE_PLAY -> playUrl.ifBlank { amazonUrl }.ifBlank { BuildConfig.DEFAULT_STORE_URL }
            Store.UNKNOWN -> when (BuildConfig.STORE_FLAVOR) {
                "amazon" -> amazonUrl.ifBlank { BuildConfig.DEFAULT_STORE_URL }
                "google" -> playUrl.ifBlank { BuildConfig.DEFAULT_STORE_URL }
                else -> BuildConfig.DEFAULT_STORE_URL
            }
        }

        // First try the store-app-targeted intent so the listing opens
        // inside the native store UI; fall back to a plain web view if the
        // store app isn't installed.
        val targetPackage = when (store) {
            Store.AMAZON -> PKG_AMAZON
            Store.GOOGLE_PLAY -> PKG_GOOGLE_PLAY
            Store.UNKNOWN -> null
        }

        val direct = Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (targetPackage != null) setPackage(targetPackage)
        }

        try {
            context.startActivity(direct)
            return
        } catch (_: ActivityNotFoundException) {
            // Fall through to the no-package version below.
        } catch (_: Throwable) {
            // Some Fire devices throw SecurityException when targeting a
            // disabled Amazon Appstore — also fall through.
        }

        // Plain web URL — works on any device with a browser.
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (_: ActivityNotFoundException) {
            // Nothing else we can do; the user can manually navigate.
        }
    }
}
