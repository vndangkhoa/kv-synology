package com.khoavo.kvsynology

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import coil.Coil
import coil.ImageLoader
import com.khoavo.kvsynology.data.remote.ssl.CertificatePolicy
import dagger.hilt.android.HiltAndroidApp
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

@HiltAndroidApp
class KVSynologyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        setupGlobalSsl()
        setupCoil()
        setupNotificationChannel()
    }

    private fun setupGlobalSsl() {
        try {
            javax.net.ssl.HttpsURLConnection.setDefaultSSLSocketFactory(CertificatePolicy.createPermissiveSslSocketFactory())
            javax.net.ssl.HttpsURLConnection.setDefaultHostnameVerifier(CertificatePolicy.permissiveHostnameVerifier)
        } catch (_: Exception) {}
    }

    private fun setupCoil() {
        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .sslSocketFactory(CertificatePolicy.createPermissiveSslSocketFactory(), CertificatePolicy.permissiveTrustManager)
            .hostnameVerifier(CertificatePolicy.permissiveHostnameVerifier)
            .build()

        val imageLoader = ImageLoader.Builder(this)
            .okHttpClient(okHttpClient)
            .crossfade(true)
            .build()

        Coil.setImageLoader(imageLoader)
    }

    private fun setupNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Thông báo Synology DSM",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Cảnh báo hệ thống, bảo mật và sao lưu từ Synology NAS"
                setShowBadge(true)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "kvsynology_notifications"
    }
}
