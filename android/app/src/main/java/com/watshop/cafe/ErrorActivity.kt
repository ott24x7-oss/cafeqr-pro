package com.watshop.cafe

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.watshop.cafe.util.ColorUtil

/**
 * Shown when the WebView fails to load the main frame (no internet, DNS
 * failure, SSL error, etc.). Tapping Retry restarts the boot flow which
 * re-fetches the config and tries the WebView again.
 */
class ErrorActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_error)

        val primary = ColorUtil.parseOrFallback(
            intent.getStringExtra(EXTRA_PRIMARY_COLOR),
            ContextCompat.getColor(this, R.color.brand_primary),
        )
        findViewById<MaterialButton>(R.id.retryButton).apply {
            setBackgroundColor(primary)
            setOnClickListener {
                startActivity(Intent(this@ErrorActivity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                })
                finish()
            }
        }
    }

    companion object {
        const val EXTRA_PRIMARY_COLOR = "primary_color"
    }
}
