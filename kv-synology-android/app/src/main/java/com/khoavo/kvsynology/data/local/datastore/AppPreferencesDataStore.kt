package com.khoavo.kvsynology.data.local.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "kv_synology_preferences")

@Singleton
class AppPreferencesDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val KEY_LANGUAGE = stringPreferencesKey("app_language")
        val KEY_THEME = stringPreferencesKey("app_theme")
        val KEY_EXPERIENCE_MODE = stringPreferencesKey("app_experience_mode")
        val KEY_DEMO_MODE = booleanPreferencesKey("app_demo_mode")
        val KEY_SHOW_AI_BUBBLE = booleanPreferencesKey("app_show_ai_bubble")
        val KEY_ACTIVE_PROFILE_ID = stringPreferencesKey("app_active_profile_id")
        
        val KEY_AI_PROVIDER = stringPreferencesKey("app_ai_provider")
        val KEY_AI_MODEL = stringPreferencesKey("app_ai_model")
        val KEY_AI_API_KEY = stringPreferencesKey("app_ai_api_key")
        val KEY_AI_CUSTOM_BASE_URL = stringPreferencesKey("app_ai_custom_base_url")
        val KEY_AI_SYSTEM_PROMPT = stringPreferencesKey("app_ai_system_prompt")
        // AI bubble position as fractions of drag travel (0f..1f), persisted across launches.
        val KEY_AI_BUBBLE_X = floatPreferencesKey("app_ai_bubble_x")
        val KEY_AI_BUBBLE_Y = floatPreferencesKey("app_ai_bubble_y")
    }

    val languageFlow: Flow<String> = context.dataStore.data.map { it[KEY_LANGUAGE] ?: "vi" }
    val themeFlow: Flow<String> = context.dataStore.data.map { it[KEY_THEME] ?: "system" }
    val experienceModeFlow: Flow<String> = context.dataStore.data.map { it[KEY_EXPERIENCE_MODE] ?: "beginner" }
    val demoModeFlow: Flow<Boolean> = context.dataStore.data.map { it[KEY_DEMO_MODE] ?: false }
    val showAiBubbleFlow: Flow<Boolean> = context.dataStore.data.map { it[KEY_SHOW_AI_BUBBLE] ?: true }
    val activeProfileIdFlow: Flow<String?> = context.dataStore.data.map { it[KEY_ACTIVE_PROFILE_ID] }

    val aiProviderFlow: Flow<String> = context.dataStore.data.map { it[KEY_AI_PROVIDER] ?: "local" }
    val aiModelFlow: Flow<String> = context.dataStore.data.map { it[KEY_AI_MODEL] ?: "dsm-local-assistant" }
    val aiApiKeyFlow: Flow<String> = context.dataStore.data.map { it[KEY_AI_API_KEY] ?: "" }
    val aiCustomBaseUrlFlow: Flow<String> = context.dataStore.data.map { it[KEY_AI_CUSTOM_BASE_URL] ?: "" }
    val aiSystemPromptFlow: Flow<String> = context.dataStore.data.map { it[KEY_AI_SYSTEM_PROMPT] ?: "" }
    val aiBubbleXFlow: Flow<Float> = context.dataStore.data.map { (it[KEY_AI_BUBBLE_X] ?: 0f).coerceIn(0f, 1f) }
    val aiBubbleYFlow: Flow<Float> = context.dataStore.data.map { (it[KEY_AI_BUBBLE_Y] ?: 0.72f).coerceIn(0f, 1f) }

    suspend fun setLanguage(lang: String) {
        context.dataStore.edit { it[KEY_LANGUAGE] = lang }
    }

    suspend fun setTheme(theme: String) {
        context.dataStore.edit { it[KEY_THEME] = theme }
    }

    suspend fun setExperienceMode(mode: String) {
        context.dataStore.edit { it[KEY_EXPERIENCE_MODE] = mode }
    }

    suspend fun setDemoMode(enabled: Boolean) {
        context.dataStore.edit { it[KEY_DEMO_MODE] = enabled }
    }

    suspend fun setShowAiBubble(show: Boolean) {
        context.dataStore.edit { it[KEY_SHOW_AI_BUBBLE] = show }
    }

    suspend fun setAiProvider(provider: String) {
        context.dataStore.edit { it[KEY_AI_PROVIDER] = provider }
    }

    suspend fun setAiModel(model: String) {
        context.dataStore.edit { it[KEY_AI_MODEL] = model }
    }

    suspend fun setAiApiKey(key: String) {
        context.dataStore.edit { it[KEY_AI_API_KEY] = key }
    }

    suspend fun setAiCustomBaseUrl(url: String) {
        context.dataStore.edit { it[KEY_AI_CUSTOM_BASE_URL] = url }
    }

    suspend fun setAiSystemPrompt(prompt: String) {
        context.dataStore.edit { it[KEY_AI_SYSTEM_PROMPT] = prompt }
    }

    suspend fun setAiBubblePosition(x: Float, y: Float) {
        context.dataStore.edit {
            it[KEY_AI_BUBBLE_X] = x.coerceIn(0f, 1f)
            it[KEY_AI_BUBBLE_Y] = y.coerceIn(0f, 1f)
        }
    }

    suspend fun setActiveProfileId(profileId: String?) {
        context.dataStore.edit {
            if (profileId != null) {
                it[KEY_ACTIVE_PROFILE_ID] = profileId
            } else {
                it.remove(KEY_ACTIVE_PROFILE_ID)
            }
        }
    }
}
