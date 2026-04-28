package com.watshop.cafe

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.watshop.cafe.util.ColorUtil

/**
 * Maintenance screen — surfaced when the remote config has
 * maintenanceMode=true. Retry just restarts the boot flow so the user can
 * recover the moment the admin flips the flag back off.
 */
class MaintenanceActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_maintenance)

        val message = intent.getStringExtra(EXTRA_MESSAGE)
            ?: getString(R.string.maintenance_default)
        findViewById<TextView>(R.id.message).text = message

        val primary = ColorUtil.parseOrFallback(
            intent.getStringExtra(EXTRA_PRIMARY_COLOR),
            ContextCompat.getColor(this, R.color.brand_primary),
        )
        findViewById<MaterialButton>(R.id.retryButton).apply {
            setBackgroundColor(primary)
            setOnClickListener {
                startActivity(Intent(this@MaintenanceActivity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                })
                finish()
            }
        }
    }

    companion object {
        const val EXTRA_MESSAGE = "message"
        const val EXTRA_PRIMARY_COLOR = "primary_color"
    }
}
