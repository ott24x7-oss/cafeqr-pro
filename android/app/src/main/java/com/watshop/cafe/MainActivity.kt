package com.watshop.cafe

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.watshop.cafe.config.AppConfig
import com.watshop.cafe.util.ColorUtil
import kotlinx.coroutines.launch

/**
 * Boot screen. Responsible for:
 *  1. Showing the system splash + an in-app splash that uses the *cached*
 *     remote branding (so returning users see their custom colors instantly).
 *  2. Kicking off the config refresh in the background.
 *  3. Routing to the correct child activity once the network call resolves
 *     (or after a short timeout falls back to whatever's cached).
 *
 * All decisions (maintenance / force-update / WebView) live here so the
 * child activities are dumb consumers of an AppConfig parcel/extras bundle.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var splashLogo: ImageView
    private lateinit var appName: TextView
    private lateinit var tagline: TextView
    private lateinit var progress: ProgressBar

    private val app get() = application as WatShopApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be called *before* super.onCreate. Honors the splash theme
        // declared in AndroidManifest and gives us a smooth handoff into
        // our own in-app splash layout.
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        splashLogo = findViewById(R.id.splashLogo)
        appName = findViewById(R.id.splashAppName)
        tagline = findViewById(R.id.splashTagline)
        progress = findViewById(R.id.splashProgress)

        // Paint the splash with the LAST KNOWN branding immediately so
        // returning users never see a flash of the default green theme.
        applyBranding(app.configRepository.cached())

        // Fetch fresh config and route once the call resolves (or fails).
        lifecycleScope.launch {
            val fresh = app.configRepository.fetchFresh()
            val effective = fresh ?: app.configRepository.cached()
            // If the config payload changed visibly (e.g. logo updated),
            // re-apply branding before we navigate so the splash flickers
            // less.
            if (fresh != null) applyBranding(effective)
            route(effective)
        }
    }

    private fun applyBranding(config: AppConfig) {
        val bg = ColorUtil.parseOrFallback(config.splashBackgroundColor, Color.parseColor("#0B0F14"))
        val accent = ColorUtil.parseOrFallback(config.primaryColor, Color.parseColor("#22C55E"))
        window.decorView.background = ColorDrawable(bg)
        progress.indeterminateTintList = android.content.res.ColorStateList.valueOf(accent)

        appName.text = config.appName.ifBlank { getString(R.string.app_name) }
        if (config.tagline.isNotBlank()) {
            tagline.text = config.tagline
            tagline.visibility = View.VISIBLE
        } else {
            tagline.visibility = View.GONE
        }

        if (config.splashLogoUrl.isNotBlank()) {
            Glide.with(this)
                .load(config.splashLogoUrl)
                .placeholder(R.drawable.splash_icon)
                .error(R.drawable.splash_icon)
                .into(splashLogo)
        } else {
            splashLogo.setImageResource(R.drawable.splash_icon)
        }
    }

    private fun route(config: AppConfig) {
        val currentVersion = BuildConfig.VERSION_CODE
        val target = when {
            // Force-update has highest priority — even maintenance mode
            // can't bypass it, since old clients may not understand newer
            // server responses.
            config.forceUpdate && currentVersion < config.minimumVersionCode -> {
                Intent(this, UpdateActivity::class.java).apply {
                    putExtra(UpdateActivity.EXTRA_AMAZON_URL, config.amazonAppstoreUrl)
                    putExtra(UpdateActivity.EXTRA_PLAY_URL, config.playStoreUrl)
                    putExtra(UpdateActivity.EXTRA_PRIMARY_COLOR, config.primaryColor)
                }
            }

            config.maintenanceMode -> {
                Intent(this, MaintenanceActivity::class.java).apply {
                    putExtra(MaintenanceActivity.EXTRA_MESSAGE, config.maintenanceMessage)
                    putExtra(MaintenanceActivity.EXTRA_PRIMARY_COLOR, config.primaryColor)
                }
            }

            else -> {
                Intent(this, WebViewActivity::class.java).apply {
                    putExtra(WebViewActivity.EXTRA_PRIMARY_COLOR, config.primaryColor)
                    putExtra(WebViewActivity.EXTRA_APP_NAME, config.appName)
                }
            }
        }
        startActivity(target)
        // finish() so back-press from the routed activity doesn't drop the
        // user back onto a stale splash.
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }
}
