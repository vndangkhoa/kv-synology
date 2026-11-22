package com.khoavo.kvsynology.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.R
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.adaptive.MaxContentWidthDp
import com.khoavo.kvsynology.presentation.theme.*

/**
 * Pure OLED black (dark) or clean light canvas with KV-Music-style radial top ambient glow
 * in Synology Blue that smoothly fades out as content scrolls.
 */
@Composable
fun SynoAmbientBackground(
    ambientFadeAlpha: Float = 1f,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val syno = SynoTheme.colors
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(syno.canvas)
    ) {
        if (ambientFadeAlpha > 0.01f) {
            val topGlow = if (syno.isDark) 0.24f else 0.10f
            val secondaryGlow = if (syno.isDark) 0.14f else 0.06f
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                SynologyBlue.copy(alpha = topGlow * ambientFadeAlpha),
                                SynoBlueBright.copy(alpha = secondaryGlow * ambientFadeAlpha),
                                Color.Transparent
                            ),
                            center = Offset(180f, 80f),
                            radius = 780f
                        )
                    )
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    syno.canvas.copy(alpha = 0.50f),
                                    syno.canvas
                                )
                            )
                        )
                )
            }
        }
        content()
    }
}

/**
 * Canonical KV Synology squircle brand emblem modeled on KV-Music's rounded squircle mark.
 */
@Composable
fun SynoBrandMark(
    size: Dp = 28.dp,
    cornerRadius: Dp = (size.value * 0.26f).dp,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(cornerRadius)
    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(
                Brush.linearGradient(
                    colors = listOf(SynologyBlueLight, SynologyBlue, SynologyBlueDark)
                )
            )
            .border(1.dp, Color.White.copy(alpha = 0.22f), shape),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(R.drawable.ic_logo_glyph),
            contentDescription = "KV Synology",
            modifier = Modifier.size(size * 0.72f)
        )
    }
}

/**
 * KV-Music-inspired 52.dp Home toolbar for DashboardScreen.
 */
@Composable
fun SynoHomeTopBar(
    unreadNotificationsCount: Int,
    onOpenDrawer: () -> Unit,
    onOpenNotifications: () -> Unit,
    onRefresh: () -> Unit,
    onPowerAction: (String) -> Unit,
    onNavigateSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    var showPowerMenu by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .height(52.dp)
            .padding(horizontal = windowState.contentHorizontalPaddingDp.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            if (!windowState.usePermanentSidebar && !windowState.useNavigationRail) {
                IconButton(
                    onClick = onOpenDrawer,
                    modifier = Modifier.size(38.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Menu,
                        contentDescription = "Menu",
                        tint = syno.textPrimary,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
            }
            SynoBrandMark(size = 28.dp)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "KV Synology",
                style = TextStyle(
                    fontFamily = SynoDisplayFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 21.sp,
                    letterSpacing = (-0.04).em,
                    color = syno.textPrimary
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            IconButton(
                onClick = onOpenNotifications,
                modifier = Modifier.size(40.dp)
            ) {
                BadgedBox(
                    badge = {
                        if (unreadNotificationsCount > 0) {
                            Badge(
                                containerColor = SynologyAmber,
                                contentColor = Color.White
                            ) {
                                Text(
                                    text = if (unreadNotificationsCount > 9) "9+" else unreadNotificationsCount.toString(),
                                    fontSize = 9.sp
                                )
                            }
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = "Thông báo",
                        tint = syno.textPrimary,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            IconButton(
                onClick = onRefresh,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Làm mới",
                    tint = syno.textPrimary,
                    modifier = Modifier.size(22.dp)
                )
            }

            Box {
                IconButton(
                    onClick = { showPowerMenu = true },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PowerSettingsNew,
                        contentDescription = "Nguồn NAS",
                        tint = SynologyRose,
                        modifier = Modifier.size(21.dp)
                    )
                }
                DropdownMenu(
                    expanded = showPowerMenu,
                    onDismissRequest = { showPowerMenu = false },
                    containerColor = syno.chromeSurface
                ) {
                    DropdownMenuItem(
                        text = { Text("Khởi động lại NAS", color = syno.textPrimary) },
                        leadingIcon = {
                            Icon(Icons.Default.RestartAlt, contentDescription = null, tint = SynologyAmber)
                        },
                        onClick = {
                            showPowerMenu = false
                            onPowerAction("reboot")
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Tắt nguồn NAS", color = SynologyRose) },
                        leadingIcon = {
                            Icon(Icons.Default.PowerSettingsNew, contentDescription = null, tint = SynologyRose)
                        },
                        onClick = {
                            showPowerMenu = false
                            onPowerAction("shutdown")
                        }
                    )
                }
            }

            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onNavigateSettings),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(SynologyBlue)
                        .border(1.dp, syno.borderStrong, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Cài đặt",
                        tint = Color.White,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }
        }
    }
}

/**
 * Consistent KV-Music-inspired top header bar for all module screens.
 */
@Composable
fun SynoScreenTopBar(
    title: String,
    subtitle: String? = null,
    onOpenDrawer: (() -> Unit)? = null,
    navigationIcon: ImageVector = Icons.Default.Menu,
    actions: @Composable RowScope.() -> Unit = {},
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                horizontal = windowState.contentHorizontalPaddingDp.dp,
                vertical = if (subtitle != null) 10.dp else 8.dp
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 40.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                if (onOpenDrawer != null && !windowState.usePermanentSidebar && !windowState.useNavigationRail) {
                    IconButton(
                        onClick = onOpenDrawer,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Icon(
                            imageVector = navigationIcon,
                            contentDescription = "Menu",
                            tint = syno.textPrimary,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text(
                    text = title,
                    style = TextStyle(
                        fontFamily = SynoDisplayFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        letterSpacing = (-0.04).em,
                        color = syno.textPrimary
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                content = actions
            )
        }
        if (!subtitle.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = SynoSubtitle01.copy(color = syno.textSecondary, fontSize = 13.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * KV-Music-styled hairline-bordered card (`14.dp` radius, `#171D29` surface + `1.dp` border).
 */
@Composable
fun SynoCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    containerColor: Color = SynoTheme.colors.card,
    borderColor: Color = SynoTheme.colors.borderSubtle,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(14.dp)
    val baseModifier = modifier
        .fillMaxWidth()
        .border(1.dp, borderColor, shape)
    Surface(
        modifier = if (onClick != null) baseModifier.clip(shape).clickable(onClick = onClick) else baseModifier,
        shape = shape,
        color = containerColor,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

/**
 * Sleek 32.dp KV-Music rounded pill filter chip (`RoundedCornerShape(8.dp)`).
 */
@Composable
fun SynoFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    leadingIcon: ImageVector? = null,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (selected) syno.chipSelectedBg else syno.chipUnselectedBg,
        border = if (selected) null else BorderStroke(1.dp, syno.borderSubtle),
        modifier = modifier.height(32.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 12.dp)
        ) {
            if (leadingIcon != null) {
                Icon(
                    imageVector = leadingIcon,
                    contentDescription = null,
                    tint = if (selected) syno.chipSelectedContent else syno.textPrimary,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
            }
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = if (selected) syno.chipSelectedContent else syno.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * KV-Music-styled 44.dp rounded search bar pill (`RoundedCornerShape(22.dp)`).
 */
@Composable
fun SynoSearchBar(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    onSearchAction: (() -> Unit)? = null
) {
    val syno = SynoTheme.colors
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(44.dp)
            .border(1.dp, syno.borderStrong, RoundedCornerShape(22.dp)),
        shape = RoundedCornerShape(22.dp),
        color = syno.cardInner
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = null,
                tint = syno.textSecondary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (value.isEmpty()) {
                    Text(
                        text = placeholder,
                        color = syno.textSecondary,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    singleLine = true,
                    textStyle = TextStyle(
                        color = syno.textPrimary,
                        fontSize = 14.sp
                    ),
                    cursorBrush = SolidColor(syno.accentBright),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { onSearchAction?.invoke() }),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            if (value.isNotEmpty()) {
                IconButton(
                    onClick = { onValueChange("") },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Xóa",
                        tint = syno.textSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun SynoStatusBadge(
    text: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.16f)
    ) {
        Text(
            text = text,
            color = color,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}

@Composable
fun SynoSectionHeader(
    title: String,
    subtitle: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.8.sp,
                    color = syno.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
            }
            Text(
                text = title,
                style = SynoTitle03.copy(color = syno.textPrimary),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (!actionLabel.isNullOrBlank() && onAction != null) {
            Surface(
                onClick = onAction,
                shape = RoundedCornerShape(16.dp),
                color = Color.Transparent,
                border = BorderStroke(1.dp, syno.borderStrong)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = actionLabel,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = syno.textPrimary
                    )
                }
            }
        }
    }
}

@Composable
fun SynoStateLoading(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            color = SynoTheme.colors.accentBright,
            strokeWidth = 2.5.dp,
            modifier = Modifier.size(34.dp)
        )
    }
}

@Composable
fun SynoStateEmpty(
    message: String,
    icon: ImageVector = Icons.Default.Inbox,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = syno.textSecondary.copy(alpha = 0.7f),
                modifier = Modifier.size(44.dp)
            )
            Text(
                text = message,
                color = syno.textSecondary,
                style = SynoSubtitle01
            )
        }
    }
}

@Composable
fun SynoStateError(
    message: String,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.ErrorOutline,
                contentDescription = null,
                tint = SynologyRose,
                modifier = Modifier.size(40.dp)
            )
            Text(
                text = message,
                color = syno.textPrimary,
                style = SynoSubtitle01
            )
            if (onRetry != null) {
                Button(
                    onClick = onRetry,
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SynologyBlue,
                        contentColor = Color.White
                    )
                ) {
                    Text("Thử lại", fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

@Composable
fun SynoResponsiveContentContainer(
    modifier: Modifier = Modifier,
    maxWidth: Dp = MaxContentWidthDp.dp,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.TopCenter
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = maxWidth),
            content = content
        )
    }
}

/**
 * Renders a 1-column list on Compact phones or a 2-column row grid on Medium/Expanded
 * foldables and tablets inside a parent [LazyColumn] without nested scroll containers.
 */
fun <T> LazyListScope.adaptiveGridItems(
    items: List<T>,
    columns: Int,
    horizontalSpacing: Dp = 12.dp,
    key: ((T) -> Any)? = null,
    itemContent: @Composable (T) -> Unit
) {
    val safeCols = columns.coerceAtLeast(1)
    if (safeCols == 1) {
        if (key != null) {
            items(items, key = key) { item ->
                itemContent(item)
            }
        } else {
            items(items) { item ->
                itemContent(item)
            }
        }
    } else {
        val rows = items.chunked(safeCols)
        items(rows) { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(horizontalSpacing)
            ) {
                for (colIndex in 0 until safeCols) {
                    if (colIndex < rowItems.size) {
                        Box(modifier = Modifier.weight(1f)) {
                            itemContent(rowItems[colIndex])
                        }
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun synoOutlinedTextFieldColors(): TextFieldColors {
    val syno = SynoTheme.colors
    return OutlinedTextFieldDefaults.colors(
        focusedBorderColor = syno.accentBright,
        unfocusedBorderColor = syno.borderStrong,
        focusedContainerColor = syno.cardInner,
        unfocusedContainerColor = syno.cardInner,
        focusedTextColor = syno.textPrimary,
        unfocusedTextColor = syno.textPrimary,
        focusedLabelColor = syno.accentBright,
        unfocusedLabelColor = syno.textSecondary,
        focusedPlaceholderColor = syno.textSecondary,
        unfocusedPlaceholderColor = syno.textSecondary,
        cursorColor = syno.accentBright
    )
}
