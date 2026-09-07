package com.khoavo.kvsynology.presentation.dashboard

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DsmProcess
import com.khoavo.kvsynology.domain.model.SystemInfo
import com.khoavo.kvsynology.domain.model.SystemUtilization
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    unreadNotificationsCount: Int = 0,
    onOpenDrawer: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onNavigateToMonitor: () -> Unit = {}
) {
    val systemInfoState by viewModel.systemInfo.collectAsState()
    val util by viewModel.currentUtilization.collectAsState()
    val history by viewModel.utilizationHistory.collectAsState()
    val procsState by viewModel.processes.collectAsState()

    var showPowerDialog by remember { mutableStateOf(false) }
    var selectedPowerAction by remember { mutableStateOf("reboot") }

    LaunchedEffect(Unit) {
        viewModel.loadDashboardData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tổng quan hệ thống", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = onOpenNotifications) {
                        BadgedBox(
                            badge = {
                                if (unreadNotificationsCount > 0) {
                                    Badge(containerColor = SynologyAmber) {
                                        Text(if (unreadNotificationsCount > 9) "9+" else unreadNotificationsCount.toString(), fontSize = 9.sp)
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Notifications, contentDescription = "Thông báo", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    IconButton(onClick = { viewModel.loadDashboardData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = {
                        selectedPowerAction = "reboot"
                        showPowerDialog = true
                    }) {
                        Icon(Icons.Default.RestartAlt, contentDescription = "Reboot", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = {
                        selectedPowerAction = "shutdown"
                        showPowerDialog = true
                    }) {
                        Icon(Icons.Default.PowerSettingsNew, contentDescription = "Shutdown", tint = SynologyRose)
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. System Info Card
            item {
                when (val state = systemInfoState) {
                    is UiState.Success -> SystemInfoCard(state.data)
                    is UiState.Loading -> CircularProgressIndicator(modifier = Modifier.padding(16.dp))
                    is UiState.Error -> Text("Lỗi: ${state.message}", color = MaterialTheme.colorScheme.error)
                    else -> {}
                }
            }

            // 2. Real-Time Telemetry Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Tải phần cứng thời gian thực",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    TextButton(onClick = onNavigateToMonitor) {
                        Text("Tài nguyên", fontSize = 12.sp, color = SynologyBlue)
                        Icon(Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp), tint = SynologyBlue)
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricCard(
                        title = "CPU",
                        value = "${util.cpuPercent.toInt()}%",
                        color = SynologyBlue,
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
                        subtitle = "${util.networkTxBytes / 1024} KB/s",
                        color = SynologyAmber,
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToMonitor
                    )
                    MetricCard(
                        title = "Đĩa (R / W)",
                        value = "${util.diskReadBytes / 1024} KB/s",
                        subtitle = "${util.diskWriteBytes / 1024} KB/s",
                        color = SynologyRose,
                        modifier = Modifier.weight(1f),
                        onClick = onNavigateToMonitor
                    )
                }
            }

            // 3. Live CPU History Chart
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clickable(onClick = onNavigateToMonitor),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Lịch sử CPU (20 mẫu gần nhất)",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(14.dp), tint = SynologyBlue)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        SparklineChart(history.map { it.cpuPercent })
                    }
                }
            }

            // 4. Processes Header
            item {
                Text(
                    text = "Tiến trình đang chạy",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // 5. Process Items
            when (val pState = procsState) {
                is UiState.Success -> {
                    items(pState.data.take(6)) { proc ->
                        ProcessRow(proc)
                    }
                }
                is UiState.Loading -> {
                    item { CircularProgressIndicator(modifier = Modifier.padding(16.dp)) }
                }
                is UiState.Error -> {
                    item { Text(pState.message, color = MaterialTheme.colorScheme.error) }
                }
                else -> {}
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }

    if (showPowerDialog) {
        AlertDialog(
            onDismissRequest = { showPowerDialog = false },
            title = {
                Text(if (selectedPowerAction == "reboot") "Khởi động lại NAS?" else "Tắt nguồn NAS?")
            },
            text = {
                Text(
                    if (selectedPowerAction == "reboot")
                        "Các dịch vụ đang hoạt động có thể bị gián đoạn trong 2-3 phút. Bạn có chắc muốn khởi động lại?"
                    else
                        "NAS sẽ ngừng hoạt động. Bạn cần bật thủ công qua nút nguồn phần cứng hoặc Wake-on-LAN."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.executePowerAction(selectedPowerAction) {
                            showPowerDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedPowerAction == "reboot") SynologyBlue else SynologyRose
                    )
                ) {
                    Text(if (selectedPowerAction == "reboot") "Khởi động lại" else "Tắt nguồn")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showPowerDialog = false }) {
                    Text("Hủy")
                }
            }
        )
    }
}

@Composable
fun SystemInfoCard(info: SystemInfo) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(info.model, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(info.version, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = SynologyEmerald.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = "● ${info.temperature}°C",
                        color = SynologyEmerald,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Thời gian hoạt động (Uptime)", style = MaterialTheme.typography.bodySmall)
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
                Text(uptimeStr, fontWeight = FontWeight.SemiBold)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Bộ xử lý (CPU)", style = MaterialTheme.typography.bodySmall)
                Text(info.cpuModel.ifBlank { "Quad-Core" }, fontWeight = FontWeight.SemiBold)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Bộ nhớ RAM", style = MaterialTheme.typography.bodySmall)
                val ramGb = if (info.ramTotal >= 1024) "${info.ramTotal / 1024} GB" else "${info.ramTotal} MB"
                Text(ramGb, fontWeight = FontWeight.SemiBold)
            }
        }
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
    val cardModifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier
    Card(
        modifier = cardModifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (onClick != null) {
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun SparklineChart(values: List<Double>) {
    if (values.isEmpty()) return
    Canvas(modifier = Modifier.fillMaxSize()) {
        val max = 100f
        val w = size.width
        val h = size.height
        val step = if (values.size > 1) w / (values.size - 1) else w

        val path = Path()
        values.forEachIndexed { index, v ->
            val x = index * step
            val y = h - ((v.toFloat() / max) * h).coerceIn(0f, h)
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }

        drawPath(
            path = path,
            color = SynologyBlue,
            style = Stroke(width = 3.dp.toPx())
        )
    }
}

@Composable
fun ProcessRow(proc: DsmProcess) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
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
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                Text(
                    text = "PID: ${proc.pid} • ${proc.user}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("CPU: ${proc.cpu}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SynologyBlue)
                val ramMB = (proc.memory / (1024 * 1024)).toInt()
                val ramText = if (ramMB >= 1024) String.format("RAM: %.1f GB", ramMB / 1024.0) else "RAM: ${ramMB} MB"
                Text(ramText, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SynologyEmerald)
            }
        }
    }
}
