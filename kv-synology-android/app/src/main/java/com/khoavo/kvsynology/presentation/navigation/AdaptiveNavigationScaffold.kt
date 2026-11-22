package com.khoavo.kvsynology.presentation.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khoavo.kvsynology.domain.model.NotificationItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.ai.AiChatBottomSheet
import com.khoavo.kvsynology.presentation.ai.AiChatViewModel
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.dashboard.DashboardScreen
import com.khoavo.kvsynology.presentation.dashboard.DashboardViewModel
import com.khoavo.kvsynology.presentation.docker.DockerScreen
import com.khoavo.kvsynology.presentation.docker.DockerViewModel
import com.khoavo.kvsynology.presentation.download.DownloadScreen
import com.khoavo.kvsynology.presentation.download.DownloadViewModel
import com.khoavo.kvsynology.presentation.files.FileStationScreen
import com.khoavo.kvsynology.presentation.files.FileStationViewModel
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.login.LoginScreen
import com.khoavo.kvsynology.presentation.login.LoginViewModel
import com.khoavo.kvsynology.presentation.mcp.McpDocsScreen
import com.khoavo.kvsynology.presentation.monitor.ResourceMonitorScreen
import com.khoavo.kvsynology.presentation.monitor.ResourceMonitorViewModel
import com.khoavo.kvsynology.presentation.notifications.NotificationsPopup
import com.khoavo.kvsynology.presentation.notifications.NotificationsScreen
import com.khoavo.kvsynology.presentation.notifications.NotificationsViewModel
import com.khoavo.kvsynology.presentation.packages.PackageScreen
import com.khoavo.kvsynology.presentation.packages.PackageViewModel
import com.khoavo.kvsynology.presentation.permissions.PermissionsScreen
import com.khoavo.kvsynology.presentation.permissions.PermissionsViewModel
import com.khoavo.kvsynology.presentation.security.FirewallScreen
import com.khoavo.kvsynology.presentation.security.SecurityViewModel
import com.khoavo.kvsynology.presentation.services.ReverseProxyScreen
import com.khoavo.kvsynology.presentation.services.ServicesScreen
import com.khoavo.kvsynology.presentation.services.ServicesViewModel
import com.khoavo.kvsynology.presentation.settings.SettingsScreen
import com.khoavo.kvsynology.presentation.settings.SettingsViewModel
import com.khoavo.kvsynology.presentation.snmp.SnmpScreen
import com.khoavo.kvsynology.presentation.snmp.SnmpViewModel
import com.khoavo.kvsynology.presentation.storage.StorageScreen
import com.khoavo.kvsynology.presentation.storage.StorageViewModel
import com.khoavo.kvsynology.presentation.terminal.TerminalScreen
import com.khoavo.kvsynology.presentation.terminal.TerminalViewModel
import com.khoavo.kvsynology.presentation.theme.SynoTheme
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.traffic.TrafficScreen
import com.khoavo.kvsynology.presentation.traffic.TrafficViewModel
import kotlinx.coroutines.launch

@Composable
fun AdaptiveNavigationScaffold(
    experienceMode: String = "beginner",
    showAiBubble: Boolean = true,
    aiBubbleX: Float = 0f,
    aiBubbleY: Float = 0.72f,
    onAiBubblePositionChange: (Float, Float) -> Unit = { _, _ -> }
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Login.route

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val isLoginScreen = currentRoute == Screen.Login.route
    var showAiChatSheet by remember { mutableStateOf(false) }

    val notifViewModel: NotificationsViewModel = hiltViewModel()
    val notifState by notifViewModel.notificationsState.collectAsState()
    val unreadNotifCount = if (notifState is UiState.Success) {
        (notifState as UiState.Success<List<NotificationItem>>).data.count { !it.read }
    } else 0
    var showNotificationsPopup by remember { mutableStateOf(false) }

    val navigateTo: (String) -> Unit = { route ->
        scope.launch { if (drawerState.isOpen) drawerState.close() }
        if (currentRoute != route) {
            navController.navigate(route) {
                popUpTo(Screen.Dashboard.route) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    BackHandler(enabled = drawerState.isOpen) {
        scope.launch { drawerState.close() }
    }

    val openDrawerAction: () -> Unit = { scope.launch { drawerState.open() } }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(syno.canvas)
    ) {
        when {
            isLoginScreen -> {
                MainNavHost(
                    navController = navController,
                    onOpenDrawer = openDrawerAction,
                    onOpenNotifications = { showNotificationsPopup = true },
                    onNavigateTo = navigateTo,
                    unreadNotifCount = unreadNotifCount
                )
            }

            windowState.usePermanentSidebar -> {
                Row(modifier = Modifier.fillMaxSize()) {
                    SynoNavigationSidebar(
                        currentRoute = currentRoute,
                        experienceMode = experienceMode,
                        strings = strings,
                        unreadNotifCount = unreadNotifCount,
                        onNavigate = navigateTo,
                        onOpenNotifications = { showNotificationsPopup = true }
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .windowInsetsPadding(WindowInsets.navigationBars)
                    ) {
                        MainNavHost(
                            navController = navController,
                            onOpenDrawer = openDrawerAction,
                            onOpenNotifications = { showNotificationsPopup = true },
                            onNavigateTo = navigateTo,
                            unreadNotifCount = unreadNotifCount
                        )
                        if (showAiBubble) {
                            DraggableAiBubble(
                                visible = !showAiChatSheet,
                                fractionX = aiBubbleX,
                                fractionY = aiBubbleY,
                                onPositionChange = onAiBubblePositionChange,
                                onClick = { showAiChatSheet = true }
                            )
                        }
                    }
                }
            }

            else -> {
                ModalNavigationDrawer(
                    drawerState = drawerState,
                    gesturesEnabled = true,
                    drawerContent = {
                        SynoModalDrawerContent(
                            currentRoute = currentRoute,
                            experienceMode = experienceMode,
                            strings = strings,
                            unreadNotifCount = unreadNotifCount,
                            onNavigate = navigateTo,
                            onOpenNotifications = {
                                scope.launch { drawerState.close() }
                                showNotificationsPopup = true
                            },
                            onCloseDrawer = { scope.launch { drawerState.close() } }
                        )
                    }
                ) {
                    if (windowState.useNavigationRail) {
                        Row(modifier = Modifier.fillMaxSize()) {
                            SynoNavigationRail(
                                currentRoute = currentRoute,
                                strings = strings,
                                unreadNotifCount = unreadNotifCount,
                                onNavigate = navigateTo,
                                onOpenDrawer = openDrawerAction
                            )
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .windowInsetsPadding(WindowInsets.navigationBars)
                            ) {
                                MainNavHost(
                                    navController = navController,
                                    onOpenDrawer = openDrawerAction,
                                    onOpenNotifications = { showNotificationsPopup = true },
                                    onNavigateTo = navigateTo,
                                    unreadNotifCount = unreadNotifCount
                                )
                                if (showAiBubble) {
                                    DraggableAiBubble(
                                        visible = !showAiChatSheet,
                                        fractionX = aiBubbleX,
                                        fractionY = aiBubbleY,
                                        onPositionChange = onAiBubblePositionChange,
                                        onClick = { showAiChatSheet = true }
                                    )
                                }
                            }
                        }
                    } else {
                        Scaffold(
                            containerColor = syno.canvas,
                            contentWindowInsets = WindowInsets(0, 0, 0, 0),
                            bottomBar = {
                                SynoBottomNavBar(
                                    currentRoute = currentRoute,
                                    strings = strings,
                                    onNavigate = navigateTo
                                )
                            }
                        ) { padding ->
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(padding)
                            ) {
                                MainNavHost(
                                    navController = navController,
                                    onOpenDrawer = openDrawerAction,
                                    onOpenNotifications = { showNotificationsPopup = true },
                                    onNavigateTo = navigateTo,
                                    unreadNotifCount = unreadNotifCount
                                )
                                if (showAiBubble) {
                                    DraggableAiBubble(
                                        visible = !showAiChatSheet,
                                        fractionX = aiBubbleX,
                                        fractionY = aiBubbleY,
                                        onPositionChange = onAiBubblePositionChange,
                                        onClick = { showAiChatSheet = true }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showAiChatSheet,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
        ) {
            val aiVm: AiChatViewModel = hiltViewModel()
            AiChatBottomSheet(viewModel = aiVm, onDismiss = { showAiChatSheet = false })
        }

        if (showNotificationsPopup) {
            NotificationsPopup(
                notificationsState = notifState,
                onDismiss = { showNotificationsPopup = false },
                onMarkAllRead = { notifViewModel.markAllRead() },
                onClearAll = { notifViewModel.clearAll() },
                onNavigateToFullNotifications = {
                    showNotificationsPopup = false
                    navigateTo(Screen.Notifications.route)
                }
            )
        }
    }
}

@Composable
private fun MainNavHost(
    navController: NavHostController,
    onOpenDrawer: () -> Unit,
    onOpenNotifications: () -> Unit,
    onNavigateTo: (String) -> Unit,
    unreadNotifCount: Int
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            val loginViewModel: LoginViewModel = hiltViewModel()
            LoginScreen(
                viewModel = loginViewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Dashboard.route) {
            val vm: DashboardViewModel = hiltViewModel()
            DashboardScreen(
                viewModel = vm,
                unreadNotificationsCount = unreadNotifCount,
                onOpenDrawer = onOpenDrawer,
                onOpenNotifications = onOpenNotifications,
                onNavigateToMonitor = { onNavigateTo(Screen.Monitor.route) },
                onNavigateToSettings = { onNavigateTo(Screen.Settings.route) },
                onNavigateToRoute = onNavigateTo
            )
        }
        composable(Screen.Files.route) {
            val vm: FileStationViewModel = hiltViewModel()
            FileStationScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Docker.route) {
            val vm: DockerViewModel = hiltViewModel()
            DockerScreen(
                viewModel = vm,
                onOpenDrawer = onOpenDrawer,
                onOpenPackages = { onNavigateTo(Screen.Packages.route) }
            )
        }
        composable(Screen.Download.route) {
            val vm: DownloadViewModel = hiltViewModel()
            DownloadScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Storage.route) {
            val vm: StorageViewModel = hiltViewModel()
            StorageScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Packages.route) {
            val vm: PackageViewModel = hiltViewModel()
            PackageScreen(
                viewModel = vm,
                onOpenDrawer = onOpenDrawer,
                onOpenDocker = { onNavigateTo(Screen.Docker.route) }
            )
        }
        composable(Screen.Services.route) {
            val vm: ServicesViewModel = hiltViewModel()
            ServicesScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.ReverseProxy.route) {
            val vm: ServicesViewModel = hiltViewModel()
            ReverseProxyScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Firewall.route) {
            val vm: SecurityViewModel = hiltViewModel()
            FirewallScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Permissions.route) {
            val vm: PermissionsViewModel = hiltViewModel()
            PermissionsScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Notifications.route) {
            val vm: NotificationsViewModel = hiltViewModel()
            NotificationsScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Traffic.route) {
            val vm: TrafficViewModel = hiltViewModel()
            TrafficScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Snmp.route) {
            val vm: SnmpViewModel = hiltViewModel()
            SnmpScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Terminal.route) {
            val vm: TerminalViewModel = hiltViewModel()
            TerminalScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Monitor.route) {
            val vm: ResourceMonitorViewModel = hiltViewModel()
            ResourceMonitorScreen(viewModel = vm, onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Mcp.route) {
            McpDocsScreen(onOpenDrawer = onOpenDrawer)
        }
        composable(Screen.Settings.route) {
            val vm: SettingsViewModel = hiltViewModel()
            SettingsScreen(
                viewModel = vm,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onOpenDrawer = onOpenDrawer
            )
        }
    }
}

private val AiFabSize = 48.dp
private val AiFabMargin = 16.dp

/**
 * AI assistant bubble the user can drag anywhere; the drop point is saved
 * as screen fractions so it survives rotation, resizing and restarts.
 */
@Composable
private fun BoxScope.DraggableAiBubble(
    visible: Boolean,
    fractionX: Float,
    fractionY: Float,
    onPositionChange: (Float, Float) -> Unit,
    onClick: () -> Unit
) {
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val fabPx = with(density) { AiFabSize.toPx() }
        val marginPx = with(density) { AiFabMargin.toPx() }
        val maxX = (constraints.maxWidth - fabPx - marginPx * 2).coerceAtLeast(0f)
        val maxY = (constraints.maxHeight - fabPx - marginPx * 2).coerceAtLeast(0f)

        var offset by remember { mutableStateOf(IntOffset.Zero) }
        LaunchedEffect(fractionX, fractionY, maxX, maxY) {
            offset = IntOffset(
                (marginPx + fractionX.coerceIn(0f, 1f) * maxX).toInt(),
                (marginPx + fractionY.coerceIn(0f, 1f) * maxY).toInt()
            )
        }

        AnimatedVisibility(
            visible = visible,
            enter = fadeIn() + scaleIn(),
            exit = fadeOut() + scaleOut(),
            modifier = Modifier
                .offset { offset }
                .pointerInput(maxX, maxY) {
                    detectDragGestures(
                        onDragEnd = {
                            onPositionChange(
                                ((offset.x - marginPx) / maxX.coerceAtLeast(1f)).coerceIn(0f, 1f),
                                ((offset.y - marginPx) / maxY.coerceAtLeast(1f)).coerceIn(0f, 1f)
                            )
                        }
                    ) { change, dragAmount ->
                        change.consume()
                        offset = IntOffset(
                            (offset.x + dragAmount.x).coerceIn(marginPx, marginPx + maxX).toInt(),
                            (offset.y + dragAmount.y).coerceIn(marginPx, marginPx + maxY).toInt()
                        )
                    }
                }
        ) {
            FloatingActionButton(
                onClick = onClick,
                shape = CircleShape,
                containerColor = SynologyBlue,
                contentColor = Color.White,
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp, pressedElevation = 10.dp),
                modifier = Modifier
                    .size(AiFabSize)
                    .border(1.dp, Color.White.copy(alpha = 0.25f), CircleShape)
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = "AI Assistant", modifier = Modifier.size(22.dp))
            }
        }
    }
}
