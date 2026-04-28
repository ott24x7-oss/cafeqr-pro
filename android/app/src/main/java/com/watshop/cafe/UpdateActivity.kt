package com.watshop.cafe

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.watshop.cafe.util.ColorUtil
import com.watshop.cafe.util.StoreLauncher

/**
 * Force-update screen. The CTA opens whichever app store this device was
 * installed from (Amazon Appstore on Fire OS, Google Play on AOSP) — see
 * [StoreLauncher]. Back-press is a no-op so the gate stays in place.
 */
class UpdateActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_update)

        val amazonUrl = intent.getStringExtra(EXTRA_AMAZON_URL).orEmpty()
        val playUrl = intent.getStringExtra(EXTRA_PLAY_URL).orEmpty()
        val primary = ColorUtil.parseOrFallback(
            intent.getStringExtra(EXTRA_PRIMARY_COLOR),
            ContextCompat.getColor(this, R.color.brand_primary),
        )

        findViewById<MaterialButton>(R.id.playStoreButton).apply {
            setBackgroundColor(primary)
            setOnClickListener {
                StoreLauncher.open(this@UpdateActivity, amazonUrl, playUrl)
            }
        }

        // Block back-press so the user can't sneak past the update wall.
        onBackPressedDispatcher.addCallback(this, object :
            androidx.activity.OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // intentional no-op
            }
        })
    }

    companion object {
        const val EXTRA_AMAZON_URL = "amazon_url"
        const val EXTRA_PLAY_URL = "play_url"
        const val EXTRA_PRIMARY_COLOR = "primary_color"
    }
}
