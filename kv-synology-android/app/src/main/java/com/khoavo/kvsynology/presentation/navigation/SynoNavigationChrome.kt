package com.khoavo.kvsynology.presentation.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.presentation.components.SynoBrandMark
import com.khoavo.kvsynology.presentation.i18n.AppStrings
import com.khoavo.kvsynology.presentation.theme.*

/**
 * KV-Music-styled 56.dp Bottom Navigation Bar for Compact phones (<600dp).
 */
@Composable
fun SynoBottomNavBar(
    currentRoute: String,
    strings: AppStrings,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    val items = Screen.primaryScreens

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(syno.chromeSurface)
            .windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            color = syno.chromeSurface,
            tonalElevation = 0.dp,
            shadowElevation = 0.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(syno.borderSubtle)
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    verticalAlignment = Alignment.Top
                ) {
                    items.forEach { screen ->
                        val isSelected = currentRoute == screen.route
                        val tint = if (isSelected) syno.navSelectedTint else syno.navUnselectedTint
                        val tabIcon = if (isSelected) screen.selectedIcon else screen.unselectedIcon
                        val title = screen.getTitle(strings)
                        val interactionSource = remember { MutableInteractionSource() }

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .defaultMinSize(minWidth = 48.dp)
                                .selectable(
                                    selected = isSelected,
                                    interactionSource = interactionSource,
                                    indication = ripple(bounded = false, color = syno.accentBright.copy(alpha = 0.25f)),
                                    role = Role.Tab,
                                    onClick = { onNavigate(screen.route) }
                                )
                                .padding(top = 6.dp, start = 4.dp, end = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = tabIcon,
                                contentDescription = title,
                                tint = tint,
                                modifier = Modifier.size(23.dp)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = title,
                                style = SynoCaption03.copy(
                                    color = tint,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Adaptive 84.dp NavigationRail for Unfolded Foldables & Medium widths (600..839dp).
 */
@Composable
fun SynoNavigationRail(
    currentRoute: String,
    strings: AppStrings,
    unreadNotifCount: Int,
    onNavigate: (String) -> Unit,
    onOpenDrawer: () -> Unit,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    val railItems = remember { Screen.primaryScreens + Screen.Settings }

    Row(modifier = modifier.fillMaxHeight()) {
        Column(
            modifier = Modifier
                .width(84.dp)
                .fillMaxHeight()
                .background(syno.chromeSurface)
                .windowInsetsPadding(
                    WindowInsets.systemBars.only(
                        WindowInsetsSides.Start + WindowInsetsSides.Top + WindowInsetsSides.Bottom
                    )
                )
                .padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SynoBrandMark(size = 34.dp)
            Spacer(modifier = Modifier.height(5.dp))
            Text(
                text = "SYNO",
                fontSize = 10.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.4.sp,
                color = syno.navSelectedTint
            )
            Spacer(modifier = Modifier.height(14.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                railItems.forEach { screen ->
                    val isSelected = currentRoute == screen.route
                    val tint = if (isSelected) syno.navSelectedTint else syno.navUnselectedTint
                    val tabIcon = if (isSelected) screen.selectedIcon else screen.unselectedIcon
                    val title = screen.getTitle(strings)

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = ripple(color = syno.accentBright.copy(alpha = 0.2f)),
                                role = Role.Tab,
                                onClick = { onNavigate(screen.route) }
                            )
                    ) {
                        if (isSelected) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.CenterStart)
                                    .width(3.dp)
                                    .height(28.dp)
                                    .clip(RoundedCornerShape(topEnd = 3.dp, bottomEnd = 3.dp))
                                    .background(syno.navSelectedTint)
                            )
                        }

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp, horizontal = 6.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) syno.accentDim else Color.Transparent)
                                    .padding(horizontal = 14.dp, vertical = 5.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = tabIcon,
                                    contentDescription = title,
                                    tint = tint,
                                    modifier = Modifier.size(21.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                text = title,
                                fontSize = 10.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = tint,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable(onClick = onOpenDrawer)
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    BadgedBox(
                        badge = {
                            if (unreadNotifCount > 0) {
                                Badge(
                                    containerColor = SynologyAmber,
                                    contentColor = Color.White
                                ) {
                                    Text(if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString(), fontSize = 8.sp)
                                }
                            }
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Apps,
                            contentDescription = "Thêm",
                            tint = syno.navUnselectedTint,
                            modifier = Modifier.size(21.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "Thêm",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = syno.navUnselectedTint,
                        maxLines = 1
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .width(1.dp)
                .fillMaxHeight()
                .background(syno.borderSubtle)
        )
    }
}

/**
 * Persistent 232.dp Sidebar for Expanded Tablets & Unfolded Landscape (>= 840dp).
 */
@Composable
fun SynoNavigationSidebar(
    currentRoute: String,
    experienceMode: String,
    strings: AppStrings,
    unreadNotifCount: Int,
    onNavigate: (String) -> Unit,
    onOpenNotifications: () -> Unit,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    val isBeginner = experienceMode.equals("beginner", ignoreCase = true)
    val coreScreens = remember {
        listOf(Screen.Dashboard, Screen.Monitor, Screen.Files, Screen.Docker, Screen.Download, Screen.Storage, Screen.Notifications)
    }
    val adminScreens = remember {
        listOf(Screen.Packages, Screen.Services, Screen.ReverseProxy, Screen.Firewall, Screen.Permissions, Screen.Traffic, Screen.Snmp, Screen.Terminal, Screen.Mcp)
    }

    Row(modifier = modifier.fillMaxHeight()) {
        Column(
            modifier = Modifier
                .width(232.dp)
                .fillMaxHeight()
                .background(syno.chromeSurface)
                .windowInsetsPadding(
                    WindowInsets.systemBars.only(
                        WindowInsetsSides.Start + WindowInsetsSides.Top + WindowInsetsSides.Bottom
                    )
                )
                .padding(vertical = 14.dp, horizontal = 12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    SynoBrandMark(size = 32.dp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "KV Synology",
                            style = SynoTitle03.copy(fontSize = 17.sp, color = syno.textPrimary),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = if (isBeginner) "Cơ bản" else "Quản trị Nâng cao",
                            fontSize = 10.sp,
                            color = syno.textSecondary,
                            maxLines = 1
                        )
                    }
                }
                IconButton(
                    onClick = onOpenNotifications,
                    modifier = Modifier.size(34.dp)
                ) {
                    BadgedBox(
                        badge = {
                            if (unreadNotifCount > 0) {
                                Badge(containerColor = SynologyAmber, contentColor = Color.White) {
                                    Text(if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString(), fontSize = 8.sp)
                                }
                            }
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = strings.notifications,
                            tint = syno.textPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = syno.borderSubtle)
            Spacer(modifier = Modifier.height(10.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                SidebarSectionLabel(text = "CHÍNH")
                coreScreens.forEach { screen ->
                    SidebarNavRow(
                        screen = screen,
                        selected = currentRoute == screen.route,
                        title = screen.getTitle(strings),
                        badgeCount = if (screen == Screen.Notifications) unreadNotifCount else 0,
                        onClick = { onNavigate(screen.route) }
                    )
                }

                if (!isBeginner) {
                    Spacer(modifier = Modifier.height(10.dp))
                    SidebarSectionLabel(text = "QUẢN TRỊ HỆ THỐNG")
                    adminScreens.forEach { screen ->
                        SidebarNavRow(
                            screen = screen,
                            selected = currentRoute == screen.route,
                            title = screen.getTitle(strings),
                            badgeCount = 0,
                            onClick = { onNavigate(screen.route) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            HorizontalDivider(color = syno.borderSubtle)
            Spacer(modifier = Modifier.height(6.dp))
            SidebarNavRow(
                screen = Screen.Settings,
                selected = currentRoute == Screen.Settings.route,
                title = Screen.Settings.getTitle(strings),
                badgeCount = 0,
                onClick = { onNavigate(Screen.Settings.route) }
            )
        }

        Box(
            modifier = Modifier
                .width(1.dp)
                .fillMaxHeight()
                .background(syno.borderSubtle)
        )
    }
}

@Composable
private fun SidebarSectionLabel(text: String) {
    Text(
        text = text,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.8.sp,
        color = SynoTheme.colors.textSecondary,
        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

@Composable
private fun SidebarNavRow(
    screen: Screen,
    selected: Boolean,
    title: String,
    badgeCount: Int,
    onClick: () -> Unit
) {
    val syno = SynoTheme.colors
    val tint = if (selected) syno.navSelectedTint else syno.textPrimary
    val icon = if (selected) screen.selectedIcon else screen.unselectedIcon
    val shape = RoundedCornerShape(10.dp)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) syno.accentDim else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (selected) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(18.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(syno.navSelectedTint)
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(19.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = title,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = tint,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        if (badgeCount > 0) {
            Badge(containerColor = SynologyAmber, contentColor = Color.White) {
                Text(if (badgeCount > 9) "9+" else badgeCount.toString(), fontSize = 9.sp)
            }
        }
    }
}

/**
 * KV-Music-styled Modal Navigation Drawer Sheet for Compact & Medium screens.
 */
@Composable
fun SynoModalDrawerContent(
    currentRoute: String,
    experienceMode: String,
    strings: AppStrings,
    unreadNotifCount: Int,
    onNavigate: (String) -> Unit,
    onOpenNotifications: () -> Unit,
    onCloseDrawer: () -> Unit
) {
    val syno = SynoTheme.colors
    val visibleScreens = if (experienceMode.equals("beginner", ignoreCase = true)) {
        Screen.beginnerScreens
    } else {
        Screen.allScreens
    }

    ModalDrawerSheet(
        drawerContainerColor = syno.chromeSurface,
        drawerContentColor = syno.textPrimary
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                BadgedBox(
                    badge = {
                        if (unreadNotifCount > 0) {
                            Badge(
                                containerColor = SynologyAmber,
                                contentColor = Color.White
                            ) {
                                Text(if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString(), fontSize = 9.sp)
                            }
                        }
                    }
                ) {
                    SynoBrandMark(
                        size = 36.dp,
                        modifier = Modifier.clickable(onClick = onOpenNotifications)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = strings.appTitle,
                        style = SynoTitle03.copy(fontSize = 16.sp, color = syno.textPrimary),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = if (experienceMode.equals("beginner", ignoreCase = true)) "Beginner Mode" else "Advanced Mode",
                        fontSize = 11.sp,
                        color = syno.textSecondary
                    )
                }
            }
            IconButton(onClick = onCloseDrawer) {
                Icon(Icons.Default.Close, contentDescription = strings.close, tint = syno.textSecondary)
            }
        }
        HorizontalDivider(color = syno.borderSubtle)
        Spacer(modifier = Modifier.height(8.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 2.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            visibleScreens.forEach { screen ->
                SidebarNavRow(
                    screen = screen,
                    selected = currentRoute == screen.route,
                    title = screen.getTitle(strings),
                    badgeCount = if (screen == Screen.Notifications) unreadNotifCount else 0,
                    onClick = { onNavigate(screen.route) }
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
