package com.watshop.cafe.util

import android.graphics.Color

/**
 * Parse a CSS hex string ("#RGB", "#RRGGBB", "#RRGGBBAA") to an Android
 * color int. Returns [fallback] for any malformed input — never throws —
 * so a typo in the admin panel can't crash the splash screen.
 */
object ColorUtil {
    fun parseOrFallback(value: String?, fallback: Int): Int {
        if (value.isNullOrBlank()) return fallback
        return runCatching {
            val s = value.trim()
            // Android's Color.parseColor accepts #RGB / #RRGGBB / #AARRGGBB,
            // but not the CSS shorthand for #RRGGBBAA → reorder if needed.
            if (s.startsWith("#") && s.length == 9) {
                // CSS uses #RRGGBBAA; Android wants #AARRGGBB.
                val rrggbb = s.substring(1, 7)
                val aa = s.substring(7, 9)
                Color.parseColor("#$aa$rrggbb")
            } else {
                Color.parseColor(s)
            }
        }.getOrElse { fallback }
    }
}
