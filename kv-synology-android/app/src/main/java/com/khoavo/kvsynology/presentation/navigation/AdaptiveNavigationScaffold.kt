package com.khoavo.kvsynology.presentation.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.khoavo.kvsynology.domain.model.NotificationItem
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.notifications.NotificationsPopup
import com.khoavo.kvsynology.presentation.theme.SynologyAmber
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.*
import com.khoavo.kvsynology.R
import com.khoavo.kvsynology.presentation.ai.AiChatBottomSheet
import com.khoavo.kvsynology.presentation.ai.AiChatViewModel
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

    BackHandler(enabled = drawerState.isOpen) {
        scope.launch { drawerState.close() }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = !isLoginScreen,
        drawerContent = {
            if (!isLoginScreen) {
                ModalDrawerSheet {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            BadgedBox(
                                badge = {
                                    if (unreadNotifCount > 0) {
                                        Badge(
                                            containerColor = SynologyAmber,
                                            contentColor = androidx.compose.ui.graphics.Color.White
                                        ) {
                                            Text(if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString(), fontSize = 9.sp)
                                        }
                                    }
                                }
                            ) {
                                Surface(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clickable {
                                            scope.launch { drawerState.close() }
                                            showNotificationsPopup = true
                                        },
                                    shape = RoundedCornerShape(10.dp),
                                    color = SynologyBlue
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Image(
                                            painter = painterResource(R.drawable.ic_logo_glyph),
                                            contentDescription = "Logo",
                                            modifier = Modifier.size(26.dp)
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = strings.appTitle,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        IconButton(onClick = { scope.launch { drawerState.close() } }) {
                            Icon(Icons.Default.Close, contentDescription = strings.close)
                        }
                    }
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(8.dp))

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        val visibleScreens = if (experienceMode.equals("beginner", ignoreCase = true)) {
                            Screen.beginnerScreens
                        } else {
                            Screen.allScreens
                        }

                        visibleScreens.forEach { screen ->
                            val selected = currentRoute == screen.route
                            NavigationDrawerItem(
                                icon = { Icon(if (selected) screen.selectedIcon else screen.unselectedIcon, contentDescription = null) },
                                label = { Text(screen.getTitle(strings)) },
                                badge = {
                                    if (screen == Screen.Notifications && unreadNotifCount > 0) {
                                        Badge(
                                            containerColor = SynologyAmber,
                                            contentColor = androidx.compose.ui.graphics.Color.White
                                        ) {
                                            Text(if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString())
                                        }
                                    }
                                },
                                selected = selected,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    navController.navigate(screen.route) {
                                        popUpTo(Screen.Dashboard.route) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    ) {
        Scaffold(
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
            bottomBar = {
                if (!isLoginScreen) {
                    NavigationBar {
                        Screen.primaryScreens.forEach { screen ->
                            val selected = currentRoute == screen.route
                            NavigationBarItem(
                                icon = { Icon(if (selected) screen.selectedIcon else screen.unselectedIcon, contentDescription = null) },
                                label = { Text(screen.getTitle(strings)) },
                                selected = selected,
                                onClick = {
                                    navController.navigate(screen.route) {
                                        popUpTo(Screen.Dashboard.route) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            )
                        }
                    }
                }
            }
        ) { padding ->
            Box(
                modifier = if (isLoginScreen) Modifier.fillMaxSize() else Modifier.fillMaxSize().padding(padding)
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
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onOpenNotifications = { showNotificationsPopup = true },
                            onNavigateToMonitor = {
                                navController.navigate(Screen.Monitor.route) {
                                    popUpTo(Screen.Dashboard.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                    composable(Screen.Files.route) {
                        val vm: FileStationViewModel = hiltViewModel()
                        FileStationScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Docker.route) {
                        val vm: DockerViewModel = hiltViewModel()
                        DockerScreen(
                            viewModel = vm,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onOpenPackages = {
                                navController.navigate(Screen.Packages.route) {
                                    popUpTo(Screen.Dashboard.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                    composable(Screen.Download.route) {
                        val vm: DownloadViewModel = hiltViewModel()
                        DownloadScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Storage.route) {
                        val vm: StorageViewModel = hiltViewModel()
                        StorageScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Packages.route) {
                        val vm: PackageViewModel = hiltViewModel()
                        PackageScreen(
                            viewModel = vm,
                            onOpenDrawer = { scope.launch { drawerState.open() } },
                            onOpenDocker = {
                                navController.navigate(Screen.Docker.route) {
                                    popUpTo(Screen.Dashboard.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                    composable(Screen.Services.route) {
                        val vm: ServicesViewModel = hiltViewModel()
                        ServicesScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.ReverseProxy.route) {
                        val vm: ServicesViewModel = hiltViewModel()
                        ReverseProxyScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Firewall.route) {
                        val vm: SecurityViewModel = hiltViewModel()
                        FirewallScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Permissions.route) {
                        val vm: PermissionsViewModel = hiltViewModel()
                        PermissionsScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Notifications.route) {
                        val vm: NotificationsViewModel = hiltViewModel()
                        NotificationsScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Traffic.route) {
                        val vm: TrafficViewModel = hiltViewModel()
                        TrafficScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Snmp.route) {
                        val vm: SnmpViewModel = hiltViewModel()
                        SnmpScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Terminal.route) {
                        val vm: TerminalViewModel = hiltViewModel()
                        TerminalScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Monitor.route) {
                        val vm: ResourceMonitorViewModel = hiltViewModel()
                        ResourceMonitorScreen(viewModel = vm, onOpenDrawer = { scope.launch { drawerState.open() } })
                    }
                    composable(Screen.Mcp.route) {
                        McpDocsScreen(onOpenDrawer = { scope.launch { drawerState.open() } })
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
                            onOpenDrawer = { scope.launch { drawerState.open() } }
                        )
                    }
                }

                // AI Floating Button — freely draggable anywhere on screen.
                // Position persists as fractions via DataStore. Defaults to the
                // start side (all screen FABs/switches are end-aligned).
                if (!isLoginScreen && showAiBubble) {
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
                    navController.navigate(Screen.Notifications.route) {
                        popUpTo(Screen.Dashboard.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
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
        // Sync from persisted fractions (init + external changes); drags only
        // publish on release so this never fights the user's finger.
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
                containerColor = SynologyBlue,
                contentColor = androidx.compose.ui.graphics.Color.White,
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp, pressedElevation = 10.dp),
                modifier = Modifier.size(AiFabSize)
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = "AI Assistant", modifier = Modifier.size(22.dp))
            }
        }
    }
}
