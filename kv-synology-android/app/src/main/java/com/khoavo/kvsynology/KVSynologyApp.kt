package com.khoavo.kvsynology

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class KVSynologyApp : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
