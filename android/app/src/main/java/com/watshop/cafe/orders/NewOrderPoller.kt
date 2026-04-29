package com.watshop.cafe.orders

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.webkit.CookieManager
import androidx.core.app.NotificationCompat
import com.watshop.cafe.BuildConfig
import com.watshop.cafe.MainActivity
import com.watshop.cafe.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Foreground service that polls /api/dashboard/orders/since every 12s
 * while the owner is signed in and rings a full-screen alert when a new
 * order arrives.
 *
 *  - Pulls the NextAuth session cookie out of CookieManager (set by the
 *    WebView during login) and forwards it as the Cookie header.
 *  - Bails (and stops itself) the moment the server says
 *    `enabled: false` (toggle off) or `unauthorized` (logged out).
 *  - Persists `lastSeenServerTime` to SharedPreferences so a service
 *    restart doesn't replay alerts for orders the owner already saw.
 *  - Foregrounds with a low-importance "Listening for new orders" sticky
 *    notification — required by Android 8+ and lets the OS not kill us
 *    when the screen is off.
 */
class NewOrderPoller : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollJob: Job? = null

    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        .build()

    override fun onCreate() {
        super.onCreate()
        NotificationChannels.ensure(this)
        startInForeground()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (pollJob == null || pollJob?.isActive == false) {
            pollJob = scope.launch { pollLoop() }
        }
        // STICKY = restart automatically if the OS kills us.
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startInForeground() {
        val tap = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notif = NotificationCompat.Builder(this, NotificationChannels.SERVICE)
            .setContentTitle(getString(R.string.poller_running))
            .setContentText(getString(R.string.poller_running_subtitle))
            .setSmallIcon(R.drawable.ic_new_order)
            .setOngoing(true)
            .setContentIntent(tap)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ requires explicit foreground service type.
            startForeground(
                FOREGROUND_NOTIFICATION_ID,
                notif,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            startForeground(FOREGROUND_NOTIFICATION_ID, notif)
        }
    }

    private suspend fun pollLoop() {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        var lastSeen = prefs.getLong(KEY_LAST_SEEN, System.currentTimeMillis())

        while (scope.isActive) {
            try {
                val cookie = CookieManager.getInstance().getCookie(BuildConfig.APP_BASE_URL).orEmpty()
                if (cookie.isBlank()) {
                    Log.d(TAG, "no cookie yet — owner not signed in")
                    delay(POLL_INTERVAL_MS)
                    continue
                }

                val url = BuildConfig.APP_BASE_URL.trimEnd('/') +
                    "/api/dashboard/orders/since?t=$lastSeen"
                val req = Request.Builder()
                    .url(url)
                    .header("Accept", "application/json")
                    .header("Cookie", cookie)
                    .header(
                        "User-Agent",
                        "WatShopCafePoller/${BuildConfig.VERSION_NAME} (Android)",
                    )
                    .get()
                    .build()

                http.newCall(req).execute().use { resp ->
                    if (resp.code == 401 || resp.code == 403) {
                        // Logged out — stop the service. WebViewActivity
                        // will spin it back up when the user signs in.
                        Log.d(TAG, "auth lost — stopping poller")
                        stopSelf()
                        return
                    }
                    if (!resp.isSuccessful) {
                        Log.w(TAG, "poll failed: HTTP ${resp.code}")
                        return@use
                    }
                    val body = resp.body?.string().orEmpty()
                    val json = JSONObject(body)
                    if (!json.optBoolean("enabled", false)) {
                        // Owner toggled it off. Honor that — stop ourselves
                        // so the foreground notification disappears too.
                        Log.d(TAG, "alert toggle off — stopping poller")
                        stopSelf()
                        return
                    }
                    val serverTime = json.optLong("serverTime", lastSeen)
                    val orders = json.optJSONArray("orders")
                    if (orders != null && orders.length() > 0) {
                        for (i in 0 until orders.length()) {
                            val o = orders.optJSONObject(i) ?: continue
                            ringAlert(parseOrder(o))
                        }
                    }
                    if (serverTime > lastSeen) {
                        lastSeen = serverTime
                        prefs.edit().putLong(KEY_LAST_SEEN, lastSeen).apply()
                    }
                }
            } catch (t: Throwable) {
                Log.w(TAG, "poll error: ${t.message}")
            }
            delay(POLL_INTERVAL_MS)
        }
    }

    private fun parseOrder(o: JSONObject): NewOrder = NewOrder(
        id = o.optString("id"),
        orderNumber = o.optString("orderNumber"),
        type = o.optString("type"),
        customerName = o.optString("customerName"),
        customerPhone = o.optString("customerPhone"),
        totalAmount = o.optDouble("totalAmount", 0.0),
        itemCount = o.optInt("itemCount", 0),
        tableLabel = o.optString("tableLabel"),
        createdAt = o.optString("createdAt"),
    )

    /**
     * Posts a high-priority notification with a fullScreenIntent so the
     * device launches OrderAlertActivity above the lock screen. The
     * notification itself stays in the shade as a tappable backup.
     */
    private fun ringAlert(order: NewOrder) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val fullScreen = OrderAlertActivity.launchIntent(this, order)
        val fullScreenPi = PendingIntent.getActivity(
            this,
            order.id.hashCode(),
            fullScreen,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notif = NotificationCompat.Builder(this, NotificationChannels.ALERTS)
            .setContentTitle("New order #${order.orderNumber}")
            .setContentText("${order.tableLabel} · ${order.itemCount} item${if (order.itemCount == 1) "" else "s"}")
            .setSmallIcon(R.drawable.ic_new_order)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(fullScreenPi)
            .setFullScreenIntent(fullScreenPi, true)
            .build()

        try {
            nm.notify(ALERT_NOTIFICATION_BASE + order.id.hashCode(), notif)
        } catch (t: SecurityException) {
            // Android 13+ without POST_NOTIFICATIONS permission. The
            // WebView side requests this on first launch; if it's still
            // denied we just log and move on.
            Log.w(TAG, "notify denied: ${t.message}")
        }
    }

    companion object {
        private const val TAG = "NewOrderPoller"
        private const val POLL_INTERVAL_MS = 12_000L
        private const val FOREGROUND_NOTIFICATION_ID = 901
        private const val ALERT_NOTIFICATION_BASE = 1000
        private const val PREFS = "watshop_order_poller"
        private const val KEY_LAST_SEEN = "last_seen_server_time"

        fun start(ctx: Context) {
            val intent = Intent(ctx, NewOrderPoller::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, NewOrderPoller::class.java))
        }
    }
}
