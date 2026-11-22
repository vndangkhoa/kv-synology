package com.khoavo.kvsynology.presentation.monitor

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DsmProcess
import com.khoavo.kvsynology.domain.model.SystemUtilization
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.dashboard.SparklineChart
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun ResourceMonitorScreen(
    viewModel: ResourceMonitorViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp
    val context = LocalContext.current

    val processesState by viewModel.processesState.collectAsState()
    val telemetry by viewModel.currentTelemetry.collectAsState()
    val history by viewModel.telemetryHistory.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val filter by viewModel.selectedFilter.collectAsState()
    val sortBy by viewModel.sortBy.collectAsState()
    val sortDesc by viewModel.sortDesc.collectAsState()

    var processToKill by remember { mutableStateOf<DsmProcess?>(null) }
    var inspectedProcess by remember { mutableStateOf<DsmProcess?>(null) }

    val filterOptions = listOf(
        "all" to strings.all,
        "running" to strings.running,
        "highCpu" to strings.highCpu,
        "highRam" to strings.highRam,
        "system" to strings.systemProcs
    )

    SynoAmbientBackground {
        if (windowState.isTabletop) {
            // Tabletop Posture: Top half shows live gauges + CPU history chart;
            // Bottom half below hinge shows Search + Filters + Process Explorer.
            Column(modifier = Modifier.fillMaxSize()) {
                val topMax = if (windowState.hingeTopDp > 0f) windowState.hingeTopDp.dp else 340.dp
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = topMax)
                ) {
                    SynoScreenTopBar(
                        title = strings.resourceMonitor,
                        onOpenDrawer = onOpenDrawer,
                        actions = {
                            IconButton(onClick = { viewModel.loadData() }) {
                                Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                            }
                        }
                    )
                    SynoResponsiveContentContainer {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = hPad, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                MonitorGaugeCard("CPU", telemetry.cpuPercent, SynoBlueBright)
                                MonitorGaugeCard("RAM", telemetry.memoryPercent, SynologyEmerald)
                            }
                            MonitorHistoryChartCard(
                                history = history,
                                chartHeight = 112.dp,
                                modifier = Modifier.weight(1.2f)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(windowState.hingeHeightDp.coerceAtLeast(12f).dp))

                SynoResponsiveContentContainer(modifier = Modifier.weight(1f)) {
                    MonitorProcessList(
                        searchQuery = searchQuery,
                        onSearchChange = { viewModel.setSearchQuery(it) },
                        filterOptions = filterOptions,
                        selectedFilter = filter,
                        onSelectFilter = { viewModel.setFilter(it) },
                        sortBy = sortBy,
                        sortDesc = sortDesc,
                        onSelectSort = { viewModel.setSort(it) },
                        processesState = processesState,
                        onRetry = { viewModel.loadData() },
                        onInspect = { inspectedProcess = it },
                        onKill = { processToKill = it },
                        includeTopTelemetry = false,
                        telemetry = telemetry,
                        history = history,
                        hPad = hPad,
                        columns = windowState.cardGridColumns,
                        isTwoPaneTop = false,
                        processSectionTitle = strings.processExplorer,
                        searchPlaceholder = strings.searchProcessPlaceholder,
                        sortByLabel = strings.sortBy
                    )
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.resourceMonitor,
                    subtitle = "Hiệu năng phần cứng & quản lý tiến trình",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.loadData() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                SynoResponsiveContentContainer(modifier = Modifier.weight(1f)) {
                    MonitorProcessList(
                        searchQuery = searchQuery,
                        onSearchChange = { viewModel.setSearchQuery(it) },
                        filterOptions = filterOptions,
                        selectedFilter = filter,
                        onSelectFilter = { viewModel.setFilter(it) },
                        sortBy = sortBy,
                        sortDesc = sortDesc,
                        onSelectSort = { viewModel.setSort(it) },
                        processesState = processesState,
                        onRetry = { viewModel.loadData() },
                        onInspect = { inspectedProcess = it },
                        onKill = { processToKill = it },
                        includeTopTelemetry = true,
                        telemetry = telemetry,
                        history = history,
                        hPad = hPad,
                        columns = windowState.cardGridColumns,
                        isTwoPaneTop = windowState.isTwoPane,
                        processSectionTitle = strings.processExplorer,
                        searchPlaceholder = strings.searchProcessPlaceholder,
                        sortByLabel = strings.sortBy
                    )
                }
            }
        }
    }

    processToKill?.let { proc ->
        AlertDialog(
            onDismissRequest = { processToKill = null },
            containerColor = syno.chromeSurface,
            title = { Text(strings.killConfirmTitle, color = syno.textPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("${strings.killConfirmMsg} '${proc.name}' (PID: ${proc.pid})?", color = syno.textSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        val targetPid = proc.pid
                        processToKill = null
                        viewModel.killProcess(targetPid) { success ->
                            val msg = if (success) "Đã dừng tiến trình $targetPid thành công" else "Không thể dừng tiến trình $targetPid"
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
                ) {
                    Text(strings.killProcess)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { processToKill = null }, shape = RoundedCornerShape(24.dp)) {
                    Text(strings.cancel)
                }
            }
        )
    }

    inspectedProcess?.let { proc ->
        AlertDialog(
            onDismissRequest = { inspectedProcess = null },
            containerColor = syno.chromeSurface,
            title = { Text("${strings.processDetails}: ${proc.name}", color = syno.textPrimary, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("PID: ${proc.pid}", fontWeight = FontWeight.Bold, color = syno.textPrimary)
                    Text("Người dùng sở hữu: ${proc.user}", color = syno.textSecondary)
                    Text("Trạng thái: ${proc.status}", color = syno.textSecondary)
                    Text("Tải CPU: ${proc.cpu}%", color = SynoBlueBright, fontWeight = FontWeight.SemiBold)
                    val ramMB = (proc.memory / (1024 * 1024)).toInt()
                    val ramText = if (ramMB >= 1024) String.format("%.1f GB", ramMB / 1024.0) else "$ramMB MB"
                    Text("Bộ nhớ RAM: $ramText", color = SynologyEmerald, fontWeight = FontWeight.SemiBold)
                }
            },
            confirmButton = {
                Button(
                    onClick = { inspectedProcess = null },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                ) {
                    Text(strings.close)
                }
            }
        )
    }
}

@Composable
private fun MonitorProcessList(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    filterOptions: List<Pair<String, String>>,
    selectedFilter: String,
    onSelectFilter: (String) -> Unit,
    sortBy: String,
    sortDesc: Boolean,
    onSelectSort: (String) -> Unit,
    processesState: UiState<List<DsmProcess>>,
    onRetry: () -> Unit,
    onInspect: (DsmProcess) -> Unit,
    onKill: (DsmProcess) -> Unit,
    includeTopTelemetry: Boolean,
    telemetry: SystemUtilization,
    history: List<SystemUtilization>,
    hPad: Dp,
    columns: Int,
    isTwoPaneTop: Boolean,
    processSectionTitle: String,
    searchPlaceholder: String,
    sortByLabel: String
) {
    val syno = SynoTheme.colors

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (includeTopTelemetry) {
            if (isTwoPaneTop) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(IntrinsicSize.Min),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            MonitorGaugeCard("CPU", telemetry.cpuPercent, SynoBlueBright)
                            MonitorGaugeCard("RAM", telemetry.memoryPercent, SynologyEmerald)
                        }
                        MonitorHistoryChartCard(
                            history = history,
                            chartHeight = 128.dp,
                            modifier = Modifier.weight(1.3f).fillMaxHeight()
                        )
                    }
                }
            } else {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        MonitorGaugeCard(
                            label = "CPU",
                            percent = telemetry.cpuPercent,
                            color = SynoBlueBright,
                            modifier = Modifier.weight(1f)
                        )
                        MonitorGaugeCard(
                            label = "RAM",
                            percent = telemetry.memoryPercent,
                            color = SynologyEmerald,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    MonitorHistoryChartCard(history = history, chartHeight = 96.dp)
                }
            }
        }

        item {
            SynoSectionHeader(
                title = processSectionTitle,
                subtitle = "Quản trị tiến trình DSM",
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        item {
            SynoSearchBar(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = searchPlaceholder
            )
        }

        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filterOptions) { (key, label) ->
                    SynoFilterChip(
                        label = label,
                        selected = selectedFilter == key,
                        onClick = { onSelectFilter(key) }
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    sortByLabel,
                    style = MaterialTheme.typography.bodySmall,
                    color = syno.textSecondary
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val sorts = listOf("cpu" to "CPU", "memory" to "RAM", "pid" to "PID", "name" to "Tên")
                    items(sorts) { (sKey, sLabel) ->
                        SortButton(
                            label = sLabel,
                            selected = sortBy == sKey,
                            desc = sortDesc,
                            onClick = { onSelectSort(sKey) }
                        )
                    }
                }
            }
        }

        when (processesState) {
            is UiState.Loading -> {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = syno.accentBright)
                    }
                }
            }
            is UiState.Error -> {
                item {
                    SynoStateError(message = processesState.message, onRetry = onRetry)
                }
            }
            is UiState.Empty -> {
                item {
                    SynoStateEmpty(message = "Không tìm thấy tiến trình nào", icon = Icons.Default.Memory)
                }
            }
            is UiState.Success -> {
                val filtered = processesState.data.filter { proc ->
                    val matchesSearch = if (searchQuery.isBlank()) true else {
                        proc.name.contains(searchQuery, ignoreCase = true) || proc.pid.toString().contains(searchQuery)
                    }
                    val matchesFilter = when (selectedFilter) {
                        "running" -> proc.status.equals("running", ignoreCase = true)
                        "highCpu" -> proc.cpu > 5.0
                        "highRam" -> proc.memory > 5.0
                        "system" -> proc.user.equals("root", ignoreCase = true)
                        else -> true
                    }
                    matchesSearch && matchesFilter
                }.let { list ->
                    when (sortBy) {
                        "cpu" -> if (sortDesc) list.sortedByDescending { it.cpu } else list.sortedBy { it.cpu }
                        "memory" -> if (sortDesc) list.sortedByDescending { it.memory } else list.sortedBy { it.memory }
                        "pid" -> if (sortDesc) list.sortedByDescending { it.pid } else list.sortedBy { it.pid }
                        "name" -> if (sortDesc) list.sortedByDescending { it.name } else list.sortedBy { it.name }
                        else -> list
                    }
                }

                if (filtered.isEmpty()) {
                    item {
                        SynoStateEmpty(message = "Không có tiến trình phù hợp với bộ lọc", icon = Icons.Default.FilterListOff)
                    }
                } else {
                    adaptiveGridItems(
                        items = filtered,
                        columns = columns
                    ) { proc ->
                        ProcessCard(
                            process = proc,
                            onInspect = { onInspect(proc) },
                            onKill = { onKill(proc) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MonitorGaugeCard(
    label: String,
    percent: Double,
    color: Color,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    SynoCard(modifier = modifier, contentPadding = PaddingValues(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = syno.textSecondary)
            Text("${percent.toInt()}%", style = SynoTitle03.copy(color = color))
        }
        Spacer(modifier = Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { (percent / 100f).toFloat().coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = color,
            trackColor = syno.cardInner
        )
    }
}

@Composable
private fun MonitorHistoryChartCard(
    history: List<SystemUtilization>,
    chartHeight: Dp,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    SynoCard(modifier = modifier) {
        Text(
            "Lịch sử sử dụng CPU thời gian thực",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = syno.textPrimary
        )
        Spacer(modifier = Modifier.height(12.dp))
        SparklineChart(
            values = history.map { it.cpuPercent },
            modifier = Modifier
                .fillMaxWidth()
                .height(chartHeight)
        )
    }
}

@Composable
private fun SortButton(label: String, selected: Boolean, desc: Boolean, onClick: () -> Unit) {
    val syno = SynoTheme.colors
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (selected) syno.accentDim else syno.chipUnselectedBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) syno.accentBright else syno.borderSubtle)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = if (selected) syno.accentBright else syno.textSecondary,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
            )
            if (selected) {
                Spacer(modifier = Modifier.width(3.dp))
                Icon(
                    if (desc) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = syno.accentBright
                )
            }
        }
    }
}

@Composable
private fun ProcessCard(
    process: DsmProcess,
    onInspect: () -> Unit,
    onKill: () -> Unit
) {
    val syno = SynoTheme.colors
    SynoCard(
        onClick = onInspect,
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = process.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = syno.cardInner
                    ) {
                        Text(
                            text = "PID ${process.pid}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = syno.textSecondary,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "User: ${process.user} • ${process.status}",
                    style = MaterialTheme.typography.bodySmall,
                    color = syno.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.padding(end = 4.dp)
            ) {
                Text(
                    text = "CPU ${process.cpu}%",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (process.cpu > 10.0) SynologyRose else SynoBlueBright
                )
                val ramMB = (process.memory / (1024 * 1024)).toInt()
                val ramText = if (ramMB >= 1024) String.format("RAM %.1f GB", ramMB / 1024.0) else "RAM $ramMB MB"
                Text(
                    text = ramText,
                    style = MaterialTheme.typography.labelSmall,
                    color = SynologyEmerald,
                    fontWeight = FontWeight.Medium
                )
            }

            IconButton(
                onClick = onKill,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Dừng",
                    tint = SynologyRose,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
