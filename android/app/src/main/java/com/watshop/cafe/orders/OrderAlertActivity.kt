package com.watshop.cafe.orders

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.watshop.cafe.BuildConfig
import com.watshop.cafe.R
import com.watshop.cafe.WebViewActivity

/**
 * Full-screen new-order alert. Designed to be launched from a
 * fullScreenIntent on a high-priority notification so it lights up the
 * device above the lock screen even when the owner has the screen off.
 *
 *  - Plays the system alarm tone in a loop (or notification ringtone as
 *    fallback) until the user taps Accept or Dismiss.
 *  - Vibrates in a pattern (0.4s on / 0.6s off) until dismissed.
 *  - Accept → launches WebViewActivity with the order detail URL so the
 *    owner can confirm and start preparing.
 *  - Dismiss → just closes; the order remains in the dashboard.
 */
class OrderAlertActivity : AppCompatActivity() {

    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Make the activity wake the screen and show above the lockscreen.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            (getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)
                ?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            )
        }

        setContentView(R.layout.activity_order_alert)

        val order = intent.parcelableExtra<NewOrder>(EXTRA_ORDER)
        if (order != null) {
            findViewById<TextView>(R.id.orderNumber).text = "#${order.orderNumber}"
            val totalLabel = if (order.totalAmount > 0)
                " · ₹%,.0f".format(order.totalAmount) else ""
            findViewById<TextView>(R.id.orderMeta).text =
                "${order.tableLabel} · ${order.itemCount} item${if (order.itemCount == 1) "" else "s"}$totalLabel"

            val customer = listOfNotNull(
                order.customerName.takeIf { it.isNotBlank() },
                order.customerPhone.takeIf { it.isNotBlank() },
            ).joinToString(" · ")
            if (customer.isNotBlank()) {
                findViewById<TextView>(R.id.customerLine).apply {
                    text = customer
                    visibility = android.view.View.VISIBLE
                }
            }
        }

        findViewById<MaterialButton>(R.id.acceptButton).setOnClickListener {
            stopAlarm()
            val orderId = order?.id
            // Hand off to the WebView so the owner lands on the actual
            // order detail page where they can change status / view items.
            val target = Intent(this, WebViewActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                if (!orderId.isNullOrBlank()) {
                    val base = BuildConfig.APP_BASE_URL.trimEnd('/')
                    putExtra(WebViewActivity.EXTRA_DEEP_LINK, "$base/dashboard/orders/$orderId")
                }
            }
            startActivity(target)
            finish()
        }

        findViewById<MaterialButton>(R.id.dismissButton).setOnClickListener {
            stopAlarm()
            finish()
        }

        startAlarm()
    }

    private fun startAlarm() {
        // Sound — prefer ALARM tone (loud, doesn't honor silent mode) but
        // fall back to NOTIFICATION if the device doesn't have an alarm
        // tone configured.
        val toneUri: Uri =
            RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        try {
            player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                setDataSource(this@OrderAlertActivity, toneUri)
                isLooping = true
                prepare()
                start()
            }
        } catch (_: Throwable) {
            // Worst case: no sound. The screen still lights up + vibrates.
        }

        // Vibration pattern: 0.4s on / 0.6s off, looping. The first 0
        // is "wait" before the pattern starts.
        val pattern = longArrayOf(0L, 400L, 600L)
        try {
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, /* repeat */ 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, /* repeat */ 0)
            }
        } catch (_: Throwable) {
            // Best effort; some Fire devices don't expose a vibrator.
        }
    }

    private fun stopAlarm() {
        runCatching {
            player?.stop()
            player?.release()
        }
        player = null
        runCatching { vibrator?.cancel() }
        vibrator = null
    }

    override fun onDestroy() {
        stopAlarm()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_ORDER = "order"

        fun launchIntent(ctx: Context, order: NewOrder): Intent =
            Intent(ctx, OrderAlertActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_NO_HISTORY,
                )
                putExtra(EXTRA_ORDER, order)
            }
    }
}

private inline fun <reified T : android.os.Parcelable> Intent.parcelableExtra(name: String): T? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        getParcelableExtra(name, T::class.java)
    } else {
        @Suppress("DEPRECATION")
        getParcelableExtra(name) as? T
    }
