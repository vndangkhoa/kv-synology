package com.khoavo.kvsynology.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = SynologyBlueLight,
    onPrimary = Color.White,
    primaryContainer = SynologyBlueDark,
    onPrimaryContainer = Color.White,
    secondary = SynoBlueBright,
    onSecondary = SynoPureBlack,
    tertiary = SynologyEmerald,
    onTertiary = Color.White,
    background = SynoPureBlack,
    onBackground = SynoWhite,
    surface = SynoCard,
    onSurface = SynoWhite,
    surfaceVariant = SynoGrey13,
    onSurfaceVariant = SynoWhite67,
    surfaceContainer = SynoSurface,
    surfaceContainerHigh = SynoCard,
    outline = SynoWhite15,
    outlineVariant = SynoWhite08
)

private val LightColorScheme = lightColorScheme(
    primary = SynologyBlue,
    onPrimary = Color.White,
    primaryContainer = SynologyBlueLight.copy(alpha = 0.2f),
    onPrimaryContainer = SynologyBlueDark,
    secondary = SynologyEmerald,
    onSecondary = Color.White,
    tertiary = SynologyAmber,
    onTertiary = Color.White,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surface = LightSurface,
    onSurface = LightTextPrimary,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightTextSecondary,
    surfaceContainer = LightSurface,
    surfaceContainerHigh = LightSurfaceVariant,
    outline = LightBorder,
    outlineVariant = LightBorder
)

private val OledColorScheme = DarkColorScheme

@Immutable
data class SynoSemanticPalette(
    val isDark: Boolean,
    val canvas: Color,
    val chromeSurface: Color,
    val card: Color,
    val cardInner: Color,
    val cardHover: Color,
    val borderSubtle: Color,
    val borderStrong: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val chipUnselectedBg: Color,
    val chipSelectedBg: Color,
    val chipSelectedContent: Color,
    val accent: Color,
    val accentBright: Color,
    val accentDim: Color,
    val navSelectedTint: Color,
    val navUnselectedTint: Color,
    val terminalBg: Color,
    val terminalToolbarBg: Color
)

private val DarkSynoPalette = SynoSemanticPalette(
    isDark = true,
    canvas = SynoPureBlack,
    chromeSurface = SynoSurface,
    card = SynoCard,
    cardInner = SynoGrey13,
    cardHover = SynoCardHover,
    borderSubtle = SynoWhite08,
    borderStrong = SynoWhite15,
    textPrimary = SynoWhite,
    textSecondary = SynoWhite67,
    chipUnselectedBg = SynoWhite10,
    chipSelectedBg = SynologyBlue,
    chipSelectedContent = SynoPureWhite,
    accent = SynologyBlue,
    accentBright = SynoBlueBright,
    accentDim = SynoBlueDim,
    navSelectedTint = SynoBlueBright,
    navUnselectedTint = SynoWhite67,
    terminalBg = Color(0xFF05080F),
    terminalToolbarBg = SynoSurface
)

private val LightSynoPalette = SynoSemanticPalette(
    isDark = false,
    canvas = LightBackground,
    chromeSurface = LightSurface,
    card = LightSurface,
    cardInner = LightSurfaceVariant,
    cardHover = Color(0xFFE2E8F0),
    borderSubtle = LightBorder,
    borderStrong = Color(0x330F172A),
    textPrimary = LightTextPrimary,
    textSecondary = LightTextSecondary,
    chipUnselectedBg = LightSurfaceVariant,
    chipSelectedBg = SynologyBlue,
    chipSelectedContent = Color.White,
    accent = SynologyBlue,
    accentBright = SynologyBlue,
    accentDim = SynologyBlue.copy(alpha = 0.12f),
    navSelectedTint = SynologyBlue,
    navUnselectedTint = LightTextSecondary,
    terminalBg = Color(0xFF0B111C),
    terminalToolbarBg = Color(0xFF131B2B)
)

val LocalIsDarkTheme = staticCompositionLocalOf { true }
val LocalSynoColors = staticCompositionLocalOf { DarkSynoPalette }

object SynoTheme {
    val colors: SynoSemanticPalette
        @Composable get() = LocalSynoColors.current
}

@Composable
fun KVSynologyTheme(
    themeMode: String = "dark",
    darkTheme: Boolean = when (themeMode) {
        "light" -> false
        "dark", "oled" -> true
        else -> isSystemInDarkTheme()
    },
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val isDark = darkTheme || themeMode == "oled"
    val colorScheme = when {
        themeMode == "oled" -> OledColorScheme
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (isDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        isDark -> DarkColorScheme
        else -> LightColorScheme
    }

    val palette = if (isDark) DarkSynoPalette else LightSynoPalette
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            @Suppress("DEPRECATION")
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            @Suppress("DEPRECATION")
            window.navigationBarColor = (if (isDark) SynoSurface else LightSurface).toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !isDark
                isAppearanceLightNavigationBars = !isDark
            }
        }
    }

    CompositionLocalProvider(
        LocalIsDarkTheme provides isDark,
        LocalSynoColors provides palette
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
