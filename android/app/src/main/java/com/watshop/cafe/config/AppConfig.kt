package com.watshop.cafe.config

/**
 * Mirrors the JSON returned by GET /api/mobile-app/config.
 * Keep field names identical — the JSON parser in [ConfigRepository] is
 * positional/keyed by name.
 */
data class AppConfig(
    val appName: String,
    val logoUrl: String,
    val splashLogoUrl: String,
    val splashBackgroundColor: String,
    val primaryColor: String,
    val tagline: String,
    val maintenanceMode: Boolean,
    val maintenanceMessage: String,
    val forceUpdate: Boolean,
    val minimumVersionCode: Int,
    /** Amazon Appstore deep link for Fire OS / Amazon-installed builds. */
    val amazonAppstoreUrl: String,
    /** Google Play deep link for Play-installed builds. */
    val playStoreUrl: String,
) {
    companion object {
        /**
         * Hard-coded fallback shown when the API is unreachable on first
         * launch (no on-disk cache yet). Matches the server-side defaults
         * defined in /api/mobile-app/config so the offline experience
         * looks identical to the freshest config.
         */
        val DEFAULT = AppConfig(
            appName = "WatShop Cafe",
            logoUrl = "",
            splashLogoUrl = "",
            splashBackgroundColor = "#0B0F14",
            primaryColor = "#22C55E",
            tagline = "QR Ordering for Cafes",
            maintenanceMode = false,
            maintenanceMessage = "App is under maintenance. Please try again later.",
            forceUpdate = false,
            minimumVersionCode = 1,
            amazonAppstoreUrl = "https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe",
            playStoreUrl = "https://play.google.com/store/apps/details?id=com.watshop.cafe",
        )
    }
}
