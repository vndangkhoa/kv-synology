package com.khoavo.kvsynology.presentation.traffic

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.CountryTrafficSummary
import com.khoavo.kvsynology.domain.model.NetworkConnectionItem
import com.khoavo.kvsynology.domain.model.NetworkInterfaceInfo
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.common.formatSpeed
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun TrafficScreen(
    viewModel: TrafficViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val trafficState by viewModel.trafficState.collectAsState()
    val autoRefresh by viewModel.autoRefresh.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val directionFilter by viewModel.directionFilter.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedConn by remember { mutableStateOf<NetworkConnectionItem?>(null) }

    LaunchedEffect(viewModel) {
        viewModel.snackbarMessage.collect { msg ->
            snackbarHostState.showSnackbar(msg)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(strings.networkTrafficGeoIp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { viewModel.setAutoRefresh(!autoRefresh) }) {
                            Icon(
                                if (autoRefresh) Icons.Default.PauseCircle else Icons.Default.PlayCircle,
                                contentDescription = if (autoRefresh) "Tắt tự động làm mới" else "Bật tự động làm mới (5s)",
                                tint = if (autoRefresh) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        IconButton(onClick = { viewModel.loadTraffic() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh)
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Lưu lượng & GeoIP", fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text(strings.networkInterfaces, fontWeight = FontWeight.SemiBold) }
                )
            }

            when (val state = trafficState) {
                is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
                is UiState.Success -> {
                    val data = state.data
                    if (selectedTab == 0) {
                        val filteredConns = data.connections.filter { c ->
                            (directionFilter == "all" || c.direction == directionFilter) &&
                                (searchQuery.isBlank() ||
                                    c.remoteAddress.contains(searchQuery, ignoreCase = true) ||
                                    c.processName.contains(searchQuery, ignoreCase = true))
                        }
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Card(
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(14.dp),
                                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp)) {
                                                Text(strings.activeConnections, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                                                Text("${data.totalConnections}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = SynologyBlue)
                                                Text(
                                                    "LAN ${data.localConnections} • NET ${data.inboundConnections}",
                                                    fontSize = 11.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    maxLines = 1
                                                )
                                            }
                                        }
                                        Card(
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(14.dp),
                                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp)) {
                                                Text("↓ RX / ↑ TX", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                                                Text("↓ ${formatSpeed(data.currentInboundSpeed)}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SynologyBlue, maxLines = 1)
                                                Text("↑ ${formatSpeed(data.currentOutboundSpeed)}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SynologyEmerald, maxLines = 1)
                                            }
                                        }
                                    }
                                    if (autoRefresh) {
                                        Text(
                                            "● Tự động làm mới mỗi 5 giây",
                                            fontSize = 11.sp,
                                            color = SynologyEmerald
                                        )
                                    }
                                }
                            }

                            item {
                                OutlinedTextField(
                                    value = searchQuery,
                                    onValueChange = { viewModel.setSearch(it) },
                                    placeholder = { Text("Tìm IP / tiến trình...", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                                    trailingIcon = {
                                        if (searchQuery.isNotBlank()) {
                                            IconButton(onClick = { viewModel.setSearch("") }) {
                                                Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    },
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }

                            item {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf("all" to "Tất cả", "local" to "🏠 LAN", "inbound" to "🌐 Internet").forEach { (key, label) ->
                                        FilterChip(
                                            selected = directionFilter == key,
                                            onClick = { viewModel.setDirectionFilter(key) },
                                            label = { Text(label, fontSize = 12.sp) }
                                        )
                                    }
                                }
                            }

                            item {
                                Text(strings.trafficByCountry, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            }

                            items(data.topCountries) { country ->
                                CountryRow(country = country, total = data.totalConnections)
                            }

                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("${strings.activeConnectionsList} (${filteredConns.size})", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            }

                            if (filteredConns.isEmpty()) {
                                item {
                                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                        Text("Không có kết nối nào khớp bộ lọc", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                                    }
                                }
                            }

                            items(filteredConns) { conn ->
                                ConnectionItemRow(
                                    conn = conn,
                                    onClick = { selectedConn = conn }
                                )
                            }
                        }
                    } else {
                        // NIC Interfaces tab
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(data.interfaces) { nic ->
                                NetworkInterfaceCard(nic = nic)
                            }
                        }
                    }
                }
                else -> {}
            }
        }
    }

    selectedConn?.let { conn ->
        ConnectionDetailsDialog(
            conn = conn,
            onDismiss = { selectedConn = null },
            onBlockIp = {
                viewModel.blockIp(conn.remoteAddress)
                selectedConn = null
            },
            onKick = {
                viewModel.kickConnection(conn.id)
                selectedConn = null
            }
        )
    }
}

@Composable
fun ConnectionItemRow(
    conn: NetworkConnectionItem,
    onClick: () -> Unit = {}
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Text(conn.geo.flagEmoji, fontSize = 22.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(conn.processName, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(
                        "${conn.remoteAddress}:${conn.remotePort}",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(6.dp),
                color = SynologyBlue.copy(alpha = 0.12f)
            ) {
                Text(
                    text = conn.protocol,
                    color = SynologyBlue,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
fun CountryRow(country: CountryTrafficSummary, total: Int) {
    val pct = if (total > 0) (country.activeConnections * 100 / total) else 0
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Text(country.flagEmoji, fontSize = 24.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(country.countryName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1)
                    Text("${country.activeConnections} kết nối", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(
                "$pct%",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = SynologyBlue
            )
        }
    }
}

@Composable
fun NetworkInterfaceCard(nic: NetworkInterfaceInfo) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Router, contentDescription = null, tint = SynologyBlue)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(nic.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(nic.ip, fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (nic.status == "up") SynologyEmerald.copy(alpha = 0.15f) else Color.Gray.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = if (nic.status == "up") "CONNECTED (${nic.speedMbps} Mbps)" else "DISCONNECTED",
                        color = if (nic.status == "up") SynologyEmerald else Color.Gray,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (nic.mac.isNotBlank()) {
                    Text("MAC: ${nic.mac}", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
                Text("Subnet: ${nic.mask}", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("↓ RX: ${nic.rxBytes / (1024 * 1024)} MB", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SynologyBlue)
                Text("↑ TX: ${nic.txBytes / (1024 * 1024)} MB", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SynologyEmerald)
            }
        }
    }
}

@Composable
fun ConnectionDetailsDialog(
    conn: NetworkConnectionItem,
    onDismiss: () -> Unit,
    onBlockIp: () -> Unit,
    onKick: () -> Unit
) {
    val strings = LocalAppStrings.current
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(conn.geo.flagEmoji, fontSize = 20.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(strings.connectionDetails, fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Tiến trình: ${conn.processName}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text("Giao thức: ${conn.protocol} (${conn.state})", fontSize = 13.sp)
                Text("Địa chỉ cục bộ: ${conn.localAddress}:${conn.localPort}", fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                Text("Địa chỉ từ xa: ${conn.remoteAddress}:${conn.remotePort}", fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                Text("Vị trí GeoIP: ${conn.geo.countryName} (${conn.geo.countryCode})", fontSize = 13.sp)
                Text("Nhà mạng (ISP): ${conn.geo.isp}", fontSize = 13.sp)
                TextButton(
                    onClick = {
                        clipboard.setText(AnnotatedString("${conn.remoteAddress}:${conn.remotePort}"))
                    },
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Sao chép IP", fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onBlockIp,
                colors = ButtonDefaults.buttonColors(containerColor = SynologyRose)
            ) {
                Icon(Icons.Default.Block, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(strings.blockIp)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onKick) {
                Icon(Icons.Default.PowerSettingsNew, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(strings.kickSession)
            }
        }
    )
}

