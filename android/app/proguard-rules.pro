# R8 / ProGuard rules for the WatShop Cafe wrapper app.
# The release build runs minification + resource shrinking. Anything reached
# only by reflection (Glide, OkHttp, JS bridge) needs to stay.

# Keep our public entry classes (referenced by AndroidManifest)
-keep class com.watshop.cafe.MainActivity
-keep class com.watshop.cafe.WebViewActivity
-keep class com.watshop.cafe.ErrorActivity
-keep class com.watshop.cafe.MaintenanceActivity
-keep class com.watshop.cafe.UpdateActivity
-keep class com.watshop.cafe.WatShopApplication

# Data classes round-tripped through OkHttp / our hand-written JSON parsing.
# We don't use reflection-based parsers so this is mostly defensive.
-keepclassmembers class com.watshop.cafe.config.AppConfig { *; }

# Anything annotated @JavascriptInterface must keep its public methods so the
# WebView bridge keeps working after R8.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# OkHttp pulls Conscrypt / Bouncy Castle on some platforms — usually unused
# but R8 likes the hint.
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Glide
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule { <init>(...); }
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** { **[] $VALUES; public *; }
-keep class com.bumptech.glide.load.data.ParcelFileDescriptorRewinder$InternalRewinder {
    *** rewind();
}

# Kotlin metadata — keep so the IDE-style stack traces are still readable.
-keepattributes Signature, *Annotation*, EnclosingMethod, InnerClasses
