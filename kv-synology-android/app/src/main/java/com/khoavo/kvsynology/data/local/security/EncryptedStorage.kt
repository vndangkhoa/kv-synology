package com.khoavo.kvsynology.data.local.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EncryptedStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val sharedPreferences: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                "kv_synology_secure_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to standard private preferences if keystore is unavailable on some emulators
            context.getSharedPreferences("kv_synology_fallback_prefs", Context.MODE_PRIVATE)
        }
    }

    fun savePassword(profileId: String, password: String) {
        sharedPreferences.edit().putString("pwd_$profileId", password).apply()
    }

    fun getPassword(profileId: String): String? {
        return sharedPreferences.getString("pwd_$profileId", null)
    }

    fun removePassword(profileId: String) {
        sharedPreferences.edit().remove("pwd_$profileId").apply()
    }

    fun saveSessionToken(profileId: String, sid: String, synoToken: String?) {
        sharedPreferences.edit()
            .putString("sid_$profileId", sid)
            .putString("synoToken_$profileId", synoToken)
            .apply()
    }

    fun getSessionSid(profileId: String): String? {
        return sharedPreferences.getString("sid_$profileId", null)
    }

    fun getSynoToken(profileId: String): String? {
        return sharedPreferences.getString("synoToken_$profileId", null)
    }

    fun clearProfileCredentials(profileId: String) {
        sharedPreferences.edit()
            .remove("pwd_$profileId")
            .remove("sid_$profileId")
            .remove("synoToken_$profileId")
            .apply()
    }

    fun clearAll() {
        sharedPreferences.edit().clear().apply()
    }
}
