package com.aiinterview

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class AiInterviewApp : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
