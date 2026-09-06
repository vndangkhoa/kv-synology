package com.khoavo.kvsynology

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.khoavo.kvsynology.data.local.datastore.AppPreferencesDataStore
import com.khoavo.kvsynology.presentation.i18n.EnStrings
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.i18n.ViStrings
import com.khoavo.kvsynology.presentation.navigation.AdaptiveNavigationScaffold
import com.khoavo.kvsynology.presentation.theme.KVSynologyTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var preferencesDataStore: AppPreferencesDataStore

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by preferencesDataStore.themeFlow.collectAsState(initial = "system")
            val experienceMode by preferencesDataStore.experienceModeFlow.collectAsState(initial = "beginner")
            val language by preferencesDataStore.languageFlow.collectAsState(initial = "vi")
            val showAiBubble by preferencesDataStore.showAiBubbleFlow.collectAsState(initial = true)

            val currentStrings = if (language == "en") EnStrings else ViStrings

            CompositionLocalProvider(LocalAppStrings provides currentStrings) {
                KVSynologyTheme(themeMode = themeMode) {
                    val bubbleX by preferencesDataStore.aiBubbleXFlow.collectAsState(initial = 0f)
                    val bubbleY by preferencesDataStore.aiBubbleYFlow.collectAsState(initial = 0.72f)
                    val scope = rememberCoroutineScope()
                    AdaptiveNavigationScaffold(
                        experienceMode = experienceMode,
                        showAiBubble = showAiBubble,
                        aiBubbleX = bubbleX,
                        aiBubbleY = bubbleY,
                        onAiBubblePositionChange = { x, y ->
                            scope.launch {
                                preferencesDataStore.setAiBubblePosition(x, y)
                            }
                        }
                    )
                }
            }
        }
    }
}
