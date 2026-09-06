package com.khoavo.kvsynology.presentation.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = SynologyBlueLight,
    onPrimary = Color.White,
    primaryContainer = SynologyBlueDark,
    onPrimaryContainer = Color.White,
    secondary = SynologyEmerald,
    onSecondary = Color.White,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkTextSecondary
)

private val LightColorScheme = lightColorScheme(
    primary = SynologyBlue,
    onPrimary = Color.White,
    primaryContainer = SynologyBlueLight.copy(alpha = 0.2f),
    onPrimaryContainer = SynologyBlueDark,
    secondary = SynologyEmerald,
    onSecondary = Color.White,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surface = LightSurface,
    onSurface = LightTextPrimary,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightTextSecondary
)

private val OledColorScheme = darkColorScheme(
    primary = SynologyBlueLight,
    onPrimary = Color.White,
    primaryContainer = SynologyBlueDark,
    onPrimaryContainer = Color.White,
    secondary = SynologyEmerald,
    onSecondary = Color.White,
    background = Color(0xFF000000),
    onBackground = DarkTextPrimary,
    surface = Color(0xFF000000),
    onSurface = DarkTextPrimary,
    surfaceVariant = Color(0xFF121212),
    onSurfaceVariant = DarkTextSecondary
)

@Composable
fun KVSynologyTheme(
    themeMode: String = "system",
    darkTheme: Boolean = when (themeMode) {
        "light" -> false
        "dark", "oled" -> true
        else -> isSystemInDarkTheme()
    },
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        themeMode == "oled" -> OledColorScheme
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
