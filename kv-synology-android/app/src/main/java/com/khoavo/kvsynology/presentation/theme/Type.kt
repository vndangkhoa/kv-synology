package com.khoavo.kvsynology.presentation.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.R

val SynoDisplayFontFamily = FontFamily(
    Font(R.font.yt_sans_medium, FontWeight.Medium),
    Font(R.font.yt_sans_medium, FontWeight.SemiBold),
    Font(R.font.yt_sans_bold, FontWeight.Bold),
    Font(R.font.yt_sans_bold, FontWeight.Black)
)

val SynoDisplay01 = TextStyle(
    fontFamily = SynoDisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 28.sp,
    lineHeight = 34.sp,
    letterSpacing = (-0.04).em
)

val SynoDisplay02 = TextStyle(
    fontFamily = SynoDisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 22.sp,
    lineHeight = 28.sp,
    letterSpacing = (-0.04).em
)

val SynoTitle03 = TextStyle(
    fontFamily = SynoDisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 18.sp,
    lineHeight = 24.sp
)

val SynoTitle02 = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Medium,
    fontSize = 14.sp,
    lineHeight = 18.sp
)

val SynoSubtitle01 = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Normal,
    fontSize = 14.sp,
    lineHeight = 18.sp
)

val SynoCaption02 = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Normal,
    fontSize = 12.sp,
    lineHeight = 16.sp
)

val SynoCaption03 = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Normal,
    fontSize = 10.sp,
    lineHeight = 14.sp
)

// Keep color = Color.Unspecified on Material3 Typography slots so LocalContentColor
// inside filled Buttons / Surfaces is never overridden.
val Typography = Typography(
    headlineLarge = SynoDisplay01.copy(color = Color.Unspecified),
    headlineMedium = SynoDisplay02.copy(color = Color.Unspecified),
    titleLarge = SynoTitle03.copy(color = Color.Unspecified),
    titleMedium = SynoTitle02.copy(fontSize = 16.sp, lineHeight = 22.sp, color = Color.Unspecified),
    titleSmall = SynoTitle02.copy(color = Color.Unspecified),
    bodyLarge = SynoSubtitle01.copy(color = Color.Unspecified),
    bodyMedium = SynoCaption02.copy(fontSize = 13.sp, lineHeight = 18.sp, color = Color.Unspecified),
    bodySmall = SynoCaption02.copy(color = Color.Unspecified),
    labelLarge = SynoTitle02.copy(color = Color.Unspecified),
    labelMedium = SynoCaption02.copy(fontWeight = FontWeight.Medium, color = Color.Unspecified),
    labelSmall = SynoCaption03.copy(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color.Unspecified)
)
