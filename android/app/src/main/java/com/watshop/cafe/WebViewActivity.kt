package com.watshop.cafe

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.view.View
import android.os.Message
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.watshop.cafe.util.ColorUtil
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The actual WebView host. Responsibilities, in order of trickiness:
 *
 *  1. Configure WebSettings + cookies for a real-app feel (JS, DOM storage,
 *     mixed-content opt-in for HTTPS-only sites that load https sub-resources,
 *     proper user-agent suffix so the website can detect "from app").
 *  2. Hijack non-http(s) schemes (tel:/mailto:/upi:/whatsapp:/wa.me) and
 *     external domains so payments and chat hand off to the right native
 *     app instead of trying to render inside the WebView.
 *  3. Forward camera + location permission requests from the page through
 *     to the runtime permission system.
 *  4. Implement an Android file chooser (image picker + camera capture) so
 *     <input type="file"> works.
 *  5. Pull-to-refresh, top-of-screen progress bar, swipe + system back
 *     navigation in the WebView's history with a "close app?" confirmation
 *     when the stack is empty.
 *  6. Detect total network failures and route to ErrorActivity.
 */
class WebViewActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var topProgress: ProgressBar

    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var cameraOutputUri: Uri? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    /** Set to true by [WebViewClient.onReceivedError] for the main frame. */
    private var lastLoadFailed = false

    // --- Activity result launchers (registered before onCreate runs) -----

    private val fileChooserLauncher: ActivityResultLauncher<Intent> =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val cb = fileChooserCallback ?: return@registerForActivityResult
            val uris: Array<Uri>? = when {
                result.resultCode != RESULT_OK -> null
                // Camera capture: data is null but cameraOutputUri is set.
                result.data == null && cameraOutputUri != null -> arrayOf(cameraOutputUri!!)
                result.data?.data != null -> arrayOf(result.data!!.data!!)
                result.data?.clipData != null -> {
                    val clip = result.data!!.clipData!!
                    Array(clip.itemCount) { clip.getItemAt(it).uri }
                }
                cameraOutputUri != null -> arrayOf(cameraOutputUri!!)
                else -> null
            }
            cb.onReceiveValue(uris)
            fileChooserCallback = null
            cameraOutputUri = null
        }

    private val cameraPermissionLauncher: ActivityResultLauncher<String> =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val req = pendingPermissionRequest ?: return@registerForActivityResult
            if (granted) {
                req.grant(req.resources)
            } else {
                req.deny()
            }
            pendingPermissionRequest = null
        }

    private val locationPermissionLauncher: ActivityResultLauncher<Array<String>> =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val granted = result.values.any { it }
            pendingGeoCallback?.invoke(pendingGeoOrigin, granted, granted)
            pendingGeoOrigin = null
            pendingGeoCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_web)

        webView = findViewById(R.id.webview)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        topProgress = findViewById(R.id.topProgress)

        // Tint controls with the brand color from the remote config.
        val primary = ColorUtil.parseOrFallback(
            intent.getStringExtra(EXTRA_PRIMARY_COLOR),
            ContextCompat.getColor(this, R.color.brand_primary),
        )
        swipeRefresh.setColorSchemeColors(primary)
        topProgress.progressTintList = android.content.res.ColorStateList.valueOf(primary)

        configureWebView()
        bindWebClients()

        swipeRefresh.setOnRefreshListener { webView.reload() }

        // Wire up custom back navigation: WebView history first, then a
        // confirmation dialog before exiting.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    showExitConfirmation()
                }
            }
        })

        if (savedInstanceState != null) {
            // Restore WebView state across config changes / process restore.
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(BuildConfig.APP_BASE_URL)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val s = webView.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        s.javaScriptCanOpenWindowsAutomatically = true
        // Multiple windows ARE allowed so target="_blank" links and
        // window.open() (e.g. OAuth popups, payment iframes, "view full
        // image" overlays) trigger onCreateWindow. We then redirect the
        // popup URL back into the main WebView so users stay in-app.
        s.setSupportMultipleWindows(true)
        s.allowFileAccess = false
        s.allowContentAccess = true
        s.loadsImagesAutomatically = true
        s.loadWithOverviewMode = true
        s.useWideViewPort = true
        s.builtInZoomControls = false
        s.displayZoomControls = false
        s.mediaPlaybackRequiresUserGesture = false
        s.cacheMode = WebSettings.LOAD_DEFAULT
        // Append "WatShopApp/<ver>" so the server can branch on app vs
        // browser if needed (e.g. hide install banners in-app).
        s.userAgentString = s.userAgentString + " WatShopCafeApp/${BuildConfig.VERSION_NAME}"
        // Only the CafeQR site is allowed to request mixed content (and our
        // server is HTTPS-only anyway). MIXED_CONTENT_COMPATIBILITY_MODE is
        // a balance between security and not breaking sites that pull http
        // images by accident.
        s.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        // Helpful for Chrome debugging during development.
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
    }

    private fun bindWebClients() {
        webView.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return handleNonWebUrl(request.url)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                lastLoadFailed = false
                topProgress.visibility = View.VISIBLE
                topProgress.progress = 5
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                topProgress.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                if (lastLoadFailed) {
                    // Main-frame request failed before reaching this point;
                    // route to the error screen and end this WebView.
                    goToError()
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                // Only treat top-level frame failures as fatal — sub-resources
                // (analytics, third-party widgets) errors are just noisy.
                if (request.isForMainFrame) {
                    Log.w(TAG, "Main frame error ${error.errorCode}: ${error.description}")
                    lastLoadFailed = true
                }
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler, error: SslError?) {
                // Always fail closed on bad certs in release builds; the
                // network-security-config already pins our domain to system
                // trust anchors so anything that gets here is shady.
                handler.cancel()
                lastLoadFailed = true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {

            // Capture popups (target="_blank", window.open) and redirect the
            // URL into the main WebView so the user never leaves the app.
            override fun onCreateWindow(
                view: WebView,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message,
            ): Boolean {
                val transient = WebView(this@WebViewActivity).apply {
                    settings.javaScriptEnabled = true
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            v: WebView,
                            req: WebResourceRequest,
                        ): Boolean {
                            val target = req.url
                            // Re-run the normal hand-off check so wa.me /
                            // upi:// popups still launch externally.
                            if (!handleNonWebUrl(target)) {
                                webView.loadUrl(target.toString())
                            }
                            v.destroy()
                            return true
                        }
                    }
                }
                val transport = resultMsg.obj as WebView.WebViewTransport
                transport.webView = transient
                resultMsg.sendToTarget()
                return true
            }

            // Forward JS console output to logcat in debug builds so
            // bugs in the wrapped site can be diagnosed via:
            //   adb logcat -s WebConsole:V
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                if (BuildConfig.DEBUG) {
                    Log.d(
                        "WebConsole",
                        "[${message.messageLevel()}] ${message.message()} " +
                            "(@${message.sourceId()}:${message.lineNumber()})",
                    )
                }
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                topProgress.progress = newProgress
                if (newProgress >= 100) {
                    topProgress.visibility = View.GONE
                } else {
                    topProgress.visibility = View.VISIBLE
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                val needCamera = request.resources.any {
                    it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                }
                if (needCamera) {
                    pendingPermissionRequest = request
                    if (ContextCompat.checkSelfPermission(
                            this@WebViewActivity, Manifest.permission.CAMERA,
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        request.grant(request.resources)
                        pendingPermissionRequest = null
                    } else {
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                } else {
                    // Other permissions (microphone, MIDI, etc.) — grant
                    // outright if you add them to the manifest, otherwise
                    // deny.
                    request.deny()
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?,
            ) {
                if (callback == null) return
                val granted = ContextCompat.checkSelfPermission(
                    this@WebViewActivity, Manifest.permission.ACCESS_COARSE_LOCATION,
                ) == PackageManager.PERMISSION_GRANTED
                if (granted) {
                    callback.invoke(origin, true, true)
                } else {
                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    locationPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_COARSE_LOCATION,
                            Manifest.permission.ACCESS_FINE_LOCATION,
                        ),
                    )
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                val acceptTypes = fileChooserParams.acceptTypes
                val mimeType = acceptTypes.firstOrNull { it.isNotBlank() } ?: "*/*"

                val pickIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = mimeType
                    if (fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                }

                // Attach an optional "Take photo" intent when the page asks
                // for an image AND we already have camera permission.
                val cameraIntent: Intent? = buildCameraCaptureIntent(mimeType)
                val chooser = Intent(Intent.ACTION_CHOOSER).apply {
                    putExtra(Intent.EXTRA_INTENT, pickIntent)
                    putExtra(Intent.EXTRA_TITLE, getString(R.string.file_chooser_title))
                    if (cameraIntent != null) {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                    }
                }
                return try {
                    fileChooserLauncher.launch(chooser)
                    true
                } catch (t: Throwable) {
                    Log.w(TAG, "File chooser launch failed: ${t.message}")
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                    false
                }
            }
        }
    }

    /**
     * Returns a camera intent ready to launch, or null if we don't have
     * permission yet (in which case the user just gets the gallery picker;
     * the page can re-prompt for camera permission via getUserMedia later).
     */
    private fun buildCameraCaptureIntent(mimeType: String): Intent? {
        if (!mimeType.startsWith("image/") && mimeType != "*/*") return null
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) return null

        val cacheDir = File(cacheDir, "camera").apply { mkdirs() }
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val photoFile = File(cacheDir, "IMG_$timestamp.jpg")
        val authority = "${packageName}.fileprovider"
        cameraOutputUri = FileProvider.getUriForFile(this, authority, photoFile)

        return Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri)
            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
    }

    /**
     * Decide whether [url] should be loaded inside the WebView (return
     * false) or handed off to another app (return true).
     *
     * Default policy: load EVERYTHING in the WebView. Only hand off when
     * the URL is a non-web scheme (tel, mailto, upi, whatsapp, intent, …)
     * or a known native-app web link (wa.me, api.whatsapp.com, …) where
     * the right experience is to launch the partner app.
     *
     * This is deliberately permissive — earlier versions blocked any
     * off-domain http/https which broke OAuth redirects, payment iframes,
     * cross-cafe deep links and other normal site navigations.
     */
    private fun handleNonWebUrl(url: Uri?): Boolean {
        if (url == null) return false
        val scheme = url.scheme?.lowercase() ?: return false
        val host = url.host?.lowercase()

        return when {
            // Native scheme handlers — always external.
            scheme in EXTERNAL_SCHEMES -> launchExternal(url)

            // Specific web hosts that map to a native app for a better UX.
            scheme.startsWith("http") && host != null && EXTERNAL_HOSTS.any { host.endsWith(it) } ->
                launchExternal(url)

            // Everything else (same-domain navigation, third-party
            // checkout pages, OAuth, etc.) stays in the WebView.
            else -> false
        }
    }

    private fun launchExternal(url: Uri): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, url).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            true
        } catch (t: Throwable) {
            Log.w(TAG, "External launch failed: ${t.message}")
            // Tell the WebView we handled it so it doesn't try a plain
            // load on a scheme it can't render.
            true
        }
    }

    private fun showExitConfirmation() {
        val primary = ColorUtil.parseOrFallback(
            intent.getStringExtra(EXTRA_PRIMARY_COLOR),
            ContextCompat.getColor(this, R.color.brand_primary),
        )
        AlertDialog.Builder(this)
            .setTitle(R.string.exit_dialog_title)
            .setMessage(R.string.exit_dialog_message)
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.exit) { _, _ -> finish() }
            .show()
            .apply {
                getButton(AlertDialog.BUTTON_POSITIVE)?.setTextColor(primary)
                getButton(AlertDialog.BUTTON_NEGATIVE)?.setTextColor(Color.GRAY)
            }
    }

    private fun goToError() {
        startActivity(Intent(this, ErrorActivity::class.java).apply {
            putExtra(ErrorActivity.EXTRA_PRIMARY_COLOR, intent.getStringExtra(EXTRA_PRIMARY_COLOR))
        })
        finish()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
        // Persist cookies (incl. NextAuth session) so the user stays
        // logged in across cold starts.
        CookieManager.getInstance().flush()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "WebViewActivity"
        const val EXTRA_PRIMARY_COLOR = "primary_color"
        const val EXTRA_APP_NAME = "app_name"

        private val EXTERNAL_SCHEMES = setOf(
            "tel", "mailto", "sms", "smsto", "mms", "mmsto",
            "upi", "tez", "phonepe", "paytmmp", "bhim",
            "whatsapp", "intent", "geo", "market", "play",
        )

        // Web hosts that should launch their native app rather than load
        // inside the WebView. Limited intentionally — adding too many
        // hosts here will start kicking users out of the app for normal
        // navigations.
        private val EXTERNAL_HOSTS = listOf(
            "wa.me", "api.whatsapp.com", "chat.whatsapp.com", "web.whatsapp.com",
        )
    }
}
