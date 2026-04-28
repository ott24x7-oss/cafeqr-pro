package com.watshop.cafe

import android.app.Application
import com.watshop.cafe.config.ConfigRepository

/**
 * Application bootstrap. Holds the singleton ConfigRepository so every
 * activity reads from the same in-memory + on-disk cache. Nothing fancy
 * here — no DI framework — because the app has exactly one runtime
 * dependency and pulling in Hilt would bloat the APK for no payoff.
 */
class WatShopApplication : Application() {

    lateinit var configRepository: ConfigRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        configRepository = ConfigRepository(applicationContext)
    }

    companion object {
        @Volatile lateinit var instance: WatShopApplication
            private set
    }
}
