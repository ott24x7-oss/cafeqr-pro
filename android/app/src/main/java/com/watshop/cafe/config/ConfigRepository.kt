package com.watshop.cafe.config

import android.content.Context
import android.util.Log
import com.watshop.cafe.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Single source of truth for the remote app config.
 *
 * Strategy:
 *  1. fetchFresh() pulls the latest JSON from /api/mobile-app/config and
 *     persists it to SharedPreferences on success.
 *  2. cached() returns the last persisted copy, or AppConfig.DEFAULT if
 *     this is the first ever launch and the network is offline. Never
 *     blocks on I/O — used by the splash to render brand colors before
 *     the network call returns.
 *  3. The MainActivity always writes the freshest value back to the cache
 *     and uses it to drive routing (maintenance / force-update / WebView).
 */
class ConfigRepository(private val context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        .build()

    /** Cached copy — synchronous, safe to call on the main thread. */
    fun cached(): AppConfig {
        val raw = prefs.getString(KEY_CACHED, null) ?: return AppConfig.DEFAULT
        return runCatching { parseJson(raw) }.getOrElse { AppConfig.DEFAULT }
    }

    /**
     * Fetch the latest config from the server. On success, persist it and
     * return it. On failure, returns null — callers should fall back to
     * [cached]. Runs on Dispatchers.IO.
     */
    suspend fun fetchFresh(): AppConfig? = withContext(Dispatchers.IO) {
        val req = Request.Builder()
            .url(BuildConfig.CONFIG_ENDPOINT)
            .header("Accept", "application/json")
            .header("User-Agent", "WatShopCafe/${BuildConfig.VERSION_NAME} (Android)")
            .get()
            .build()

        try {
            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) {
                    Log.w(TAG, "Config fetch failed: HTTP ${resp.code}")
                    return@withContext null
                }
                val body = resp.body?.string() ?: return@withContext null
                val parsed = parseJson(body)
                prefs.edit().putString(KEY_CACHED, body).apply()
                parsed
            }
        } catch (e: Exception) {
            Log.w(TAG, "Config fetch error: ${e.message}")
            null
        }
    }

    private fun parseJson(raw: String): AppConfig {
        val o = JSONObject(raw)
        return AppConfig(
            appName = o.optString("appName", AppConfig.DEFAULT.appName).ifBlank { AppConfig.DEFAULT.appName },
            logoUrl = o.optString("logoUrl", ""),
            splashLogoUrl = o.optString("splashLogoUrl", ""),
            splashBackgroundColor = o.optString("splashBackgroundColor", AppConfig.DEFAULT.splashBackgroundColor)
                .ifBlank { AppConfig.DEFAULT.splashBackgroundColor },
            primaryColor = o.optString("primaryColor", AppConfig.DEFAULT.primaryColor)
                .ifBlank { AppConfig.DEFAULT.primaryColor },
            tagline = o.optString("tagline", AppConfig.DEFAULT.tagline),
            maintenanceMode = o.optBoolean("maintenanceMode", false),
            maintenanceMessage = o.optString("maintenanceMessage", AppConfig.DEFAULT.maintenanceMessage)
                .ifBlank { AppConfig.DEFAULT.maintenanceMessage },
            forceUpdate = o.optBoolean("forceUpdate", false),
            minimumVersionCode = o.optInt("minimumVersionCode", 1),
            amazonAppstoreUrl = o.optString("amazonAppstoreUrl", AppConfig.DEFAULT.amazonAppstoreUrl)
                .ifBlank { AppConfig.DEFAULT.amazonAppstoreUrl },
            playStoreUrl = o.optString("playStoreUrl", AppConfig.DEFAULT.playStoreUrl)
                .ifBlank { AppConfig.DEFAULT.playStoreUrl },
        )
    }

    companion object {
        private const val TAG = "ConfigRepository"
        private const val PREFS_NAME = "watshop_app_config"
        private const val KEY_CACHED = "config_json"
    }
}
