package com.watshop.cafe.orders

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import com.watshop.cafe.R

/**
 * Two channels:
 *  - ALERTS — high-importance, sound, vibration, lockscreen visible.
 *    Used for the new-order full-screen notification.
 *  - SERVICE — low-importance, no sound. Used for the foreground-service
 *    persistent "Listening for new orders" notification so the OS
 *    doesn't kill the poller.
 */
object NotificationChannels {
    const val ALERTS = "watshop_order_alerts"
    const val SERVICE = "watshop_order_service"

    fun ensure(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return

        val alarmAttrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val toneUri = RingtoneManager.getActualDefaultRingtoneUri(ctx, RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val alerts = NotificationChannel(
            ALERTS,
            ctx.getString(R.string.channel_alerts_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = ctx.getString(R.string.channel_alerts_description)
            enableLights(true)
            enableVibration(true)
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            setSound(toneUri, alarmAttrs)
            vibrationPattern = longArrayOf(0L, 400L, 600L, 400L, 600L)
        }
        val service = NotificationChannel(
            SERVICE,
            ctx.getString(R.string.channel_service_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = ctx.getString(R.string.channel_service_description)
            setShowBadge(false)
        }
        nm.createNotificationChannels(listOf(alerts, service))
    }
}
