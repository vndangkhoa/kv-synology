package com.khoavo.kvsynology.presentation.dashboard

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DsmProcess
import com.khoavo.kvsynology.domain.model.SystemInfo
import com.khoavo.kvsynology.domain.model.SystemUtilization
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.navigation.Screen
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    unreadNotificationsCount: Int = 0,
    onOpenDrawer: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onNavigateToMonitor: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onNavigateToRoute: (String) -> Unit = {}
) {
    val systemInfoState by viewModel.systemInfo.collectAsState()
    val util by viewModel.currentUtilization.collectAsState()
    val history by viewModel.utilizationHistory.collectAsState()
    val procsState by viewModel.processes.collectAsState()

    var showPowerDialog by remember { mutableStateOf(false) }
    var selectedPowerAction by remember { mutableStateOf("reboot") }

    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val listState = rememberLazyListState()
    val hPad = windowState.contentHorizontalPaddingDp.dp

    val ambientFadeAlpha by remember {
        derivedStateOf {
            if (listState.firstVisibleItemIndex > 0) 0f
            else (1f - (listState.firstVisibleItemScrollOffset / 420f)).coerceIn(0f, 1f)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.loadDashboardData()
    }

    val quickNavChips = remember {
        listOf(
            Triple(Screen.Files.route, "Tập tin", Icons.Default.Folder),
            Triple(Screen.Docker.route, "Docker", Icons.Default.Layers),
            Triple(Screen.Download.route, "Tải xuống", Icons.Default.Download),
            Triple(Screen.Storage.route, "Lưu trữ", Icons.Default.Storage),
            Triple(Screen.Monitor.route, "Tài nguyên", Icons.Default.Speed),
            Triple(Screen.Notifications.route, "Thông báo", Icons.Default.Notifications)
        )
    }

    SynoAmbientBackground(ambientFadeAlpha = ambientFadeAlpha) {
        if (windowState.isTabletop) {
            // Tabletop Flex Posture: Top half shows System Info + 4-up KPI + Live Sparkline;
            // Bottom half below hinge shows Quick Modules + Running Processes.
            Column(modifier = Modifier.fillMaxSize()) {
                val topMax = if (windowState.hingeTopDp > 0f) windowState.hingeTopDp.dp else 360.dp
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = topMax)
                ) {
                    SynoHomeTopBar(
                        unreadNotificationsCount = unreadNotificationsCount,
                        onOpenDrawer = onOpenDrawer,
                        onOpenNotifications = onOpenNotifications,
                        onRefresh = { viewModel.loadDashboardData() },
                        onPowerAction = { action ->
                            selectedPowerAction = action
                            showPowerDialog = true
                        },
                        onNavigateSettings = onNavigateToSettings
                    )
                    SynoResponsiveContentContainer {
                        Column(
                            modifier = Modifier.padding(horizontal = hPad, vertical = 6.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(modifier = Modifier.weight(1f)) {
                                    DashboardSystemInfoSection(systemInfoState, onRetry = { viewModel.loadDashboardData() })
                                }
                                Box(modifier = Modifier.weight(1f)) {
                                    DashboardCpuChartCard(
                                        history = history,
                                        onClick = onNavigateToMonitor,
                                        chartHeight = 90.dp
                                    )
                                }
                            }
                            DashboardKpiRow4Up(util = util, onNavigateToMonitor = onNavigateToMonitor)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(windowState.hingeHeightDp.coerceAtLeast(12f).dp))

                SynoResponsiveContentContainer(modifier = Modifier.weight(1f)) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(quickNavChips) { (route, label, icon) ->
                                    SynoFilterChip(
                                        label = label,
                                        selected = false,
                                        leadingIcon = icon,
                                        onClick = { onNavigateToRoute(route) }
                                    )
                                }
                            }
                        }
                        item {
                            SynoSectionHeader(
                                title = "Tiến trình đang chạy",
                                subtitle = "Hoạt động DSM",
                                actionLabel = "Chi tiết",
                                onAction = onNavigateToMonitor
                            )
                        }
                        when (val pState = procsState) {
                            is UiState.Success -> {
                                adaptiveGridItems(
                                    items = pState.data.take(8),
                                    columns = windowState.cardGridColumns
                                ) { proc ->
                                    ProcessRow(proc)
                                }
                            }
                            is UiState.Loading -> item { SynoStateLoading() }
                            is UiState.Error -> item { Text(pState.message, color = SynologyRose) }
                            else -> {}
                        }
                    }
                }
            }
        } else {
            // Flat / Phone / Foldable / Tablet / Book Posture
            SynoResponsiveContentContainer {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        SynoHomeTopBar(
                            unreadNotificationsCount = unreadNotificationsCount,
                            onOpenDrawer = onOpenDrawer,
                            onOpenNotifications = onOpenNotifications,
                            onRefresh = { viewModel.loadDashboardData() },
                            onPowerAction = { action ->
                                selectedPowerAction = action
                                showPowerDialog = true
                            },
                            onNavigateSettings = onNavigateToSettings
                        )
                    }

                    // Quick Module Filter Pills (KV-Music horizontal mood-chip bar style)
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = hPad, vertical = 2.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(quickNavChips) { (route, label, icon) ->
                                SynoFilterChip(
                                    label = label,
                                    selected = false,
                                    leadingIcon = icon,
                                    onClick = { onNavigateToRoute(route) }
                                )
                            }
                        }
                    }

                    if (windowState.isTwoPane) {
                        val splitGap = if (windowState.isBook && windowState.hingeWidthDp > 0f) {
                            windowState.hingeWidthDp.dp + 12.dp
                        } else {
                            12.dp
                        }
                        // Two-pane Hero: System Info (left) + Live CPU History (right)
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = hPad)
                                    .height(IntrinsicSize.Min),
                                horizontalArrangement = Arrangement.spacedBy(splitGap)
                            ) {
                                Box(modifier = Modifier.weight(1f).fillMaxHeight()) {
                                    DashboardSystemInfoSection(
                                        systemInfoState = systemInfoState,
                                        onRetry = { viewModel.loadDashboardData() },
                                        modifier = Modifier.fillMaxHeight()
                                    )
                                }
                                Box(modifier = Modifier.weight(1f).fillMaxHeight()) {
                                    DashboardCpuChartCard(
                                        history = history,
                                        onClick = onNavigateToMonitor,
                                        chartHeight = 112.dp,
                                        modifier = Modifier.fillMaxHeight()
                                    )
                                }
                            }
                        }

                        // 4-up Single-Row Telemetry Bar
                        item {
                            Column(modifier = Modifier.padding(horizontal = hPad)) {
                                SynoSectionHeader(
                                    title = "Tải phần cứng thời gian thực",
                                    subtitle = "Telemetry trực tiếp",
                                    actionLabel = "Tài nguyên",
                                    onAction = onNavigateToMonitor
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                DashboardKpiRow4Up(util = util, onNavigateToMonitor = onNavigateToMonitor)
                            }
                        }
                    } else {
                        // Compact Phone Layout
                        item {
                            Box(modifier = Modifier.padding(horizontal = hPad)) {
                                DashboardSystemInfoSection(
                                    systemInfoState = systemInfoState,
                                    onRetry = { viewModel.loadDashboardData() }
                                )
                            }
                        }

                        item {
                            Column(modifier = Modifier.padding(horizontal = hPad)) {
                                SynoSectionHeader(
                                    title = "Tải phần cứng thời gian thực",
                                    subtitle = "Telemetry trực tiếp",
                                    actionLabel = "Tài nguyên",
                                    onAction = onNavigateToMonitor
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    MetricCard(
                                        title = "CPU",
                                        value = "${util.cpuPercent.toInt()}%",
                                        color = SynoBlueBright,
                                        modifier = Modifier.weight(1f),
                                        onClick = onNavigateToMonitor
                                    )
                                    MetricCard(
                                        title = "RAM",
                                        value = "${util.memoryPercent.toInt()}%",
                                        color = SynologyEmerald,
                                        modifier = Modifier.weight(1f),
                                        onClick = onNavigateToMonitor
                                    )
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    MetricCard(
                                        title = "Mạng (RX / TX)",
                                        value = "${util.networkRxBytes / 1024} KB/s",
                                        subtitle = "↑ ${util.networkTxBytes / 1024} KB/s",
                                        color = SynologyAmber,
                                        modifier = Modifier.weight(1f),
                                        onClick = onNavigateToMonitor
                                    )
                                    MetricCard(
                                        title = "Đĩa (R / W)",
                                        value = "${util.diskReadBytes / 1024} KB/s",
                                        subtitle = "✎ ${util.diskWriteBytes / 1024} KB/s",
                                        color = SynologyRose,
                                        modifier = Modifier.weight(1f),
                                        onClick = onNavigateToMonitor
                                    )
                                }
                            }
                        }

                        item {
                            Box(modifier = Modifier.padding(horizontal = hPad)) {
                                DashboardCpuChartCard(
                                    history = history,
                                    onClick = onNavigateToMonitor,
                                    chartHeight = 96.dp
                                )
                            }
                        }
                    }

                    // Running Processes Section
                    item {
                        Box(modifier = Modifier.padding(horizontal = hPad)) {
                            SynoSectionHeader(
                                title = "Tiến trình đang chạy",
                                subtitle = "Hoạt động hệ thống",
                                actionLabel = "Xem tất cả",
                                onAction = onNavigateToMonitor
                            )
                        }
                    }

                    when (val pState = procsState) {
                        is UiState.Success -> {
                            val slice = pState.data.take(if (windowState.isWide) 8 else 6)
                            if (windowState.cardGridColumns > 1) {
                                val rows = slice.chunked(windowState.cardGridColumns)
                                items(rows) { rowItems ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = hPad),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        for (idx in 0 until windowState.cardGridColumns) {
                                            if (idx < rowItems.size) {
                                                Box(modifier = Modifier.weight(1f)) {
                                                    ProcessRow(rowItems[idx])
                                                }
                                            } else {
                                                Spacer(modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                }
                            } else {
                                items(slice) { proc ->
                                    Box(modifier = Modifier.padding(horizontal = hPad)) {
                                        ProcessRow(proc)
                                    }
                                }
                            }
                        }
                        is UiState.Loading -> {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = syno.accentBright)
                                }
                            }
                        }
                        is UiState.Error -> {
                            item {
                                Text(
                                    text = pState.message,
                                    color = SynologyRose,
                                    modifier = Modifier.padding(horizontal = hPad)
                                )
                            }
                        }
                        else -> {}
                    }
                }
            }
        }
    }

    if (showPowerDialog) {
        AlertDialog(
            onDismissRequest = { showPowerDialog = false },
            containerColor = syno.chromeSurface,
            title = {
                Text(
                    if (selectedPowerAction == "reboot") "Khởi động lại NAS?" else "Tắt nguồn NAS?",
                    color = syno.textPrimary,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = if (selectedPowerAction == "reboot")
                        "Các dịch vụ đang hoạt động có thể bị gián đoạn trong 2-3 phút. Bạn có chắc muốn khởi động lại?"
                    else
                        "NAS sẽ ngừng hoạt động. Bạn cần bật thủ công qua nút nguồn phần cứng hoặc Wake-on-LAN.",
                    color = syno.textSecondary
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.executePowerAction(selectedPowerAction) {
                            showPowerDialog = false
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedPowerAction == "reboot") SynologyBlue else SynologyRose,
                        contentColor = Color.White
                    )
                ) {
                    Text(if (selectedPowerAction == "reboot") "Khởi động lại" else "Tắt nguồn")
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showPowerDialog = false },
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Hủy")
                }
            }
        )
    }
}

@Composable
private fun DashboardSystemInfoSection(
    systemInfoState: UiState<SystemInfo>,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    when (systemInfoState) {
        is UiState.Success -> SystemInfoCard(systemInfoState.data, modifier = modifier)
        is UiState.Loading -> SynoCard(modifier = modifier) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = SynoTheme.colors.accentBright)
            }
        }
        is UiState.Error -> SynoCard(modifier = modifier) {
            Text("Lỗi: ${systemInfoState.message}", color = SynologyRose, fontSize = 13.sp)
            Spacer(modifier = Modifier.height(8.dp))
            TextButton(onClick = onRetry) { Text("Thử lại") }
        }
        else -> {}
    }
}

@Composable
private fun DashboardKpiRow4Up(
    util: SystemUtilization,
    onNavigateToMonitor: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Max),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        MetricCard(
            title = "CPU",
            value = "${util.cpuPercent.toInt()}%",
            color = SynoBlueBright,
            modifier = Modifier.weight(1f).fillMaxHeight(),
            onClick = onNavigateToMonitor
        )
        MetricCard(
            title = "RAM",
            value = "${util.memoryPercent.toInt()}%",
            color = SynologyEmerald,
            modifier = Modifier.weight(1f).fillMaxHeight(),
            onClick = onNavigateToMonitor
        )
        MetricCard(
            title = "Mạng (RX/TX)",
            value = "${util.networkRxBytes / 1024} KB/s",
            subtitle = "↑ ${util.networkTxBytes / 1024} KB/s",
            color = SynologyAmber,
            modifier = Modifier.weight(1f).fillMaxHeight(),
            onClick = onNavigateToMonitor
        )
        MetricCard(
            title = "Đĩa (R/W)",
            value = "${util.diskReadBytes / 1024} KB/s",
            subtitle = "✎ ${util.diskWriteBytes / 1024} KB/s",
            color = SynologyRose,
            modifier = Modifier.weight(1f).fillMaxHeight(),
            onClick = onNavigateToMonitor
        )
    }
}

@Composable
private fun DashboardCpuChartCard(
    history: List<SystemUtilization>,
    onClick: () -> Unit,
    chartHeight: androidx.compose.ui.unit.Dp,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    SynoCard(
        modifier = modifier,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Lịch sử CPU (20 mẫu gần nhất)",
                style = MaterialTheme.typography.labelMedium,
                color = syno.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Default.OpenInNew,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = syno.accentBright
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        SparklineChart(
            values = history.map { it.cpuPercent },
            modifier = Modifier
                .fillMaxWidth()
                .height(chartHeight)
        )
    }
}

@Composable
fun SystemInfoCard(
    info: SystemInfo,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    val tempColor = when {
        info.temperature >= 60 -> SynologyRose
        info.temperature >= 50 -> SynologyAmber
        else -> SynologyEmerald
    }
    SynoCard(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Text(
                    text = info.model,
                    style = SynoTitle03.copy(color = syno.textPrimary),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = info.version,
                    style = MaterialTheme.typography.bodySmall,
                    color = syno.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            SynoStatusBadge(text = "● ${info.temperature}°C", color = tempColor)
        }
        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider(color = syno.borderSubtle)
        Spacer(modifier = Modifier.height(10.dp))

        val days = info.uptime / 86400
        val hours = (info.uptime % 86400) / 3600
        val mins = (info.uptime % 3600) / 60
        val uptimeStr = when {
            days > 0 -> "$days ngày $hours giờ"
            hours > 0 -> "$hours giờ $mins phút"
            mins > 0 -> "$mins phút"
            info.uptime > 0 -> "${info.uptime} giây"
            else -> "Vừa khởi động"
        }

        InfoKvRow(label = "Uptime", value = uptimeStr)
        Spacer(modifier = Modifier.height(6.dp))
        InfoKvRow(label = "CPU", value = info.cpuModel.ifBlank { "Quad-Core" })
        Spacer(modifier = Modifier.height(6.dp))
        val ramGb = if (info.ramTotal >= 1024) "${info.ramTotal / 1024} GB" else "${info.ramTotal} MB"
        InfoKvRow(label = "RAM", value = ramGb)
    }
}

@Composable
private fun InfoKvRow(label: String, value: String) {
    val syno = SynoTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = syno.textSecondary)
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = value,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            color = syno.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    subtitle: String? = null,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val syno = SynoTheme.colors
    SynoCard(
        modifier = modifier,
        onClick = onClick,
        contentPadding = PaddingValues(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = syno.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            if (onClick != null) {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = syno.textSecondary.copy(alpha = 0.6f)
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = value,
            style = SynoTitle03.copy(fontSize = 19.sp, color = color),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (subtitle != null) {
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = syno.textSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun SparklineChart(
    values: List<Double>,
    modifier: Modifier = Modifier.fillMaxSize()
) {
    if (values.isEmpty()) return
    Canvas(modifier = modifier) {
        val max = 100f
        val w = size.width
        val h = size.height

        if (values.size == 1) {
            val y = h - ((values.first().toFloat() / max) * h).coerceIn(0f, h)
            val fillPath = Path().apply {
                moveTo(0f, h)
                lineTo(0f, y)
                lineTo(w, y)
                lineTo(w, h)
                close()
            }
            drawPath(
                path = fillPath,
                brush = Brush.verticalGradient(
                    colors = listOf(
                        SynoBlueBright.copy(alpha = 0.24f),
                        Color.Transparent
                    )
                )
            )
            drawLine(
                color = SynoBlueBright.copy(alpha = 0.7f),
                start = androidx.compose.ui.geometry.Offset(0f, y),
                end = androidx.compose.ui.geometry.Offset(w, y),
                strokeWidth = 2.dp.toPx(),
                cap = StrokeCap.Round
            )
            drawCircle(
                color = SynoBlueBright,
                radius = 4.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(w * 0.98f, y)
            )
            return@Canvas
        }

        val step = w / (values.size - 1)

        val linePath = Path()
        val fillPath = Path()
        values.forEachIndexed { index, v ->
            val x = index * step
            val y = h - ((v.toFloat() / max) * h).coerceIn(0f, h)
            if (index == 0) {
                linePath.moveTo(x, y)
                fillPath.moveTo(x, h)
                fillPath.lineTo(x, y)
            } else {
                linePath.lineTo(x, y)
                fillPath.lineTo(x, y)
            }
        }
        fillPath.lineTo((values.size - 1) * step, h)
        fillPath.close()

        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(
                colors = listOf(
                    SynoBlueBright.copy(alpha = 0.28f),
                    Color.Transparent
                )
            )
        )
        drawPath(
            path = linePath,
            color = SynoBlueBright,
            style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

@Composable
fun ProcessRow(proc: DsmProcess) {
    val syno = SynoTheme.colors
    SynoCard(contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 8.dp)
            ) {
                Text(
                    text = proc.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = syno.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "PID: ${proc.pid} • ${proc.user}",
                    style = MaterialTheme.typography.labelSmall,
                    color = syno.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("CPU ${proc.cpu}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SynoBlueBright)
                val ramMB = (proc.memory / (1024 * 1024)).toInt()
                val ramText = if (ramMB >= 1024) String.format("%.1f GB", ramMB / 1024.0) else "$ramMB MB"
                Text(ramText, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SynologyEmerald)
            }
        }
    }
}
