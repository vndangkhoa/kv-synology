package com.khoavo.kvsynology.presentation.monitor

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DsmProcess
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun ResourceMonitorScreen(
    viewModel: ResourceMonitorViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.resourceMonitor, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = strings.refresh)
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Live Resource Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("CPU", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${telemetry.cpuPercent.toInt()}%", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = SynologyBlue)
                            LinearProgressIndicator(
                                progress = { (telemetry.cpuPercent / 100f).toFloat().coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                color = SynologyBlue,
                            )
                        }
                    }
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("RAM", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${telemetry.memoryPercent.toInt()}%", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = SynologyEmerald)
                            LinearProgressIndicator(
                                progress = { (telemetry.memoryPercent / 100f).toFloat().coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                color = SynologyEmerald,
                            )
                        }
                    }
                }
            }

            // Real-time Canvas Graph
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Lịch sử sử dụng CPU thời gian thực", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Spacer(modifier = Modifier.height(12.dp))
                        Canvas(modifier = Modifier.fillMaxWidth().height(90.dp)) {
                            if (history.size > 1) {
                                val maxVal = 100f
                                val stepX = size.width / (history.size - 1)
                                val path = Path()
                                history.forEachIndexed { i, util ->
                                    val x = i * stepX
                                    val y = size.height - ((util.cpuPercent.toFloat() / maxVal) * size.height).coerceIn(0f, size.height)
                                    if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                                }
                                drawPath(path, color = SynologyBlue, style = Stroke(width = 4f, cap = StrokeCap.Round))
                            } else {
                                drawLine(
                                    color = SynologyBlue.copy(alpha = 0.5f),
                                    start = Offset(0f, size.height - 10f),
                                    end = Offset(size.width, size.height - 10f),
                                    strokeWidth = 3f
                                )
                            }
                        }
                    }
                }
            }

            // Process Section Header
            item {
                Text(
                    text = strings.processExplorer,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            // Search Bar
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    placeholder = { Text(strings.searchProcessPlaceholder) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
            }

            // Filter Chips
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        FilterChip(
                            selected = filter == "all",
                            onClick = { viewModel.setFilter("all") },
                            label = { Text(strings.all) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = filter == "running",
                            onClick = { viewModel.setFilter("running") },
                            label = { Text(strings.running) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = filter == "highCpu",
                            onClick = { viewModel.setFilter("highCpu") },
                            label = { Text(strings.highCpu) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = filter == "highRam",
                            onClick = { viewModel.setFilter("highRam") },
                            label = { Text(strings.highRam) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = filter == "system",
                            onClick = { viewModel.setFilter("system") },
                            label = { Text(strings.systemProcs) }
                        )
                    }
                }
            }

            // Sorting bar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        strings.sortBy,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        SortButton("CPU", sortBy == "cpu", sortDesc) { viewModel.setSort("cpu") }
                        SortButton("RAM", sortBy == "memory", sortDesc) { viewModel.setSort("memory") }
                        SortButton("PID", sortBy == "pid", sortDesc) { viewModel.setSort("pid") }
                        SortButton("Tên", sortBy == "name", sortDesc) { viewModel.setSort("name") }
                    }
                }
            }

            // Processes List
            when (val state = processesState) {
                is UiState.Loading -> {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                }
                is UiState.Error -> {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                            Text(state.message, color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
                is UiState.Empty -> {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                            Text("Không tìm thấy tiến trình nào")
                        }
                    }
                }
                is UiState.Success -> {
                    val filtered = state.data.filter { proc ->
                        val matchesSearch = if (searchQuery.isBlank()) true else {
                            proc.name.contains(searchQuery, ignoreCase = true) || proc.pid.toString().contains(searchQuery)
                        }
                        val matchesFilter = when (filter) {
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
                            Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                                Text("Không có tiến trình phù hợp với bộ lọc")
                            }
                        }
                    } else {
                        items(filtered) { proc ->
                            ProcessCard(
                                process = proc,
                                onInspect = { inspectedProcess = proc },
                                onKill = { processToKill = proc }
                            )
                        }
                    }
                }
            }
        }
    }

    // Kill confirmation dialog
    processToKill?.let { proc ->
        AlertDialog(
            onDismissRequest = { processToKill = null },
            title = { Text(strings.killConfirmTitle) },
            text = { Text("${strings.killConfirmMsg} '${proc.name}' (PID: ${proc.pid})?") },
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
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose)
                ) {
                    Text(strings.killProcess)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { processToKill = null }) {
                    Text(strings.cancel)
                }
            }
        )
    }

    // Process inspect modal
    inspectedProcess?.let { proc ->
        AlertDialog(
            onDismissRequest = { inspectedProcess = null },
            title = { Text("${strings.processDetails}: ${proc.name}") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("PID: ${proc.pid}", fontWeight = FontWeight.Bold)
                    Text("Người dùng sở hữu: ${proc.user}")
                    Text("Trạng thái: ${proc.status}")
                    Text("Tải CPU: ${proc.cpu}%", color = SynologyBlue, fontWeight = FontWeight.SemiBold)
                    val ramMB = (proc.memory / (1024 * 1024)).toInt()
                    val ramText = if (ramMB >= 1024) String.format("%.1f GB", ramMB / 1024.0) else "$ramMB MB"
                    Text("Bộ nhớ RAM: $ramText", color = SynologyEmerald, fontWeight = FontWeight.SemiBold)
                }
            },
            confirmButton = {
                Button(onClick = { inspectedProcess = null }) {
                    Text(strings.close)
                }
            }
        )
    }
}

@Composable
private fun SortButton(label: String, selected: Boolean, desc: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (selected) {
                Spacer(modifier = Modifier.width(2.dp))
                Icon(
                    if (desc) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
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
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onInspect),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left Column: Name, PID, User, Status (responsive with ellipsis)
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
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Text(
                            text = "PID: ${process.pid}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "User: ${process.user} • Trạng thái: ${process.status}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Right Column: CPU % & RAM MB stats
            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.padding(end = 4.dp)
            ) {
                Text(
                    text = "CPU: ${process.cpu}%",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (process.cpu > 10.0) SynologyRose else SynologyBlue
                )
                val ramMB = (process.memory / (1024 * 1024)).toInt()
                val ramText = if (ramMB >= 1024) String.format("RAM: %.1f GB", ramMB / 1024.0) else "RAM: ${ramMB} MB"
                Text(
                    text = ramText,
                    style = MaterialTheme.typography.labelSmall,
                    color = SynologyEmerald,
                    fontWeight = FontWeight.Medium
                )
            }

            // Kill Icon Button
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
