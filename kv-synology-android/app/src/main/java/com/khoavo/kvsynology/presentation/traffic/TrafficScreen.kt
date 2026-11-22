package com.khoavo.kvsynology.presentation.traffic

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.CountryTrafficSummary
import com.khoavo.kvsynology.domain.model.NetworkConnectionItem
import com.khoavo.kvsynology.domain.model.NetworkInterfaceInfo
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.common.formatSpeed
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun TrafficScreen(
    viewModel: TrafficViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

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

    val tabs = listOf(
        0 to "Lưu lượng & GeoIP",
        1 to strings.networkInterfaces
    )

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.networkTrafficGeoIp,
                    subtitle = "Kết nối theo quốc gia & giao diện mạng",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.setAutoRefresh(!autoRefresh) }) {
                            Icon(
                                if (autoRefresh) Icons.Default.PauseCircle else Icons.Default.PlayCircle,
                                contentDescription = if (autoRefresh) "Tắt tự động làm mới" else "Bật tự động làm mới (5s)",
                                tint = if (autoRefresh) SynologyEmerald else syno.textSecondary
                            )
                        }
                        IconButton(onClick = { viewModel.loadTraffic() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = hPad, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(tabs) { (idx, label) ->
                        SynoFilterChip(
                            label = label,
                            selected = selectedTab == idx,
                            onClick = { selectedTab = idx }
                        )
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    when (val state = trafficState) {
                        is UiState.Loading -> SynoStateLoading()
                        is UiState.Error -> SynoStateError(
                            message = state.message,
                            onRetry = { viewModel.loadTraffic() }
                        )
                        is UiState.Empty -> SynoStateEmpty(
                            message = "Không có dữ liệu lưu lượng mạng",
                            icon = Icons.Default.Public
                        )
                        is UiState.Success -> {
                            val data = state.data
                            SynoResponsiveContentContainer {
                                if (selectedTab == 0) {
                                    val filteredConns = data.connections.filter { c ->
                                        (directionFilter == "all" || c.direction == directionFilter) &&
                                            (searchQuery.isBlank() ||
                                                c.remoteAddress.contains(searchQuery, ignoreCase = true) ||
                                                c.processName.contains(searchQuery, ignoreCase = true))
                                    }
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                        verticalArrangement = Arrangement.spacedBy(14.dp)
                                    ) {
                                        item {
                                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                                ) {
                                                    SynoCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(14.dp)) {
                                                        Text(strings.activeConnections, style = MaterialTheme.typography.labelSmall, color = syno.textSecondary, maxLines = 1)
                                                        Spacer(modifier = Modifier.height(4.dp))
                                                        Text("${data.totalConnections}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = SynoBlueBright)
                                                        Text(
                                                            "LAN ${data.localConnections} • NET ${data.inboundConnections}",
                                                            fontSize = 11.sp,
                                                            color = syno.textSecondary,
                                                            maxLines = 1
                                                        )
                                                    }
                                                    SynoCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(14.dp)) {
                                                        Text("↓ RX / ↑ TX", style = MaterialTheme.typography.labelSmall, color = syno.textSecondary, maxLines = 1)
                                                        Spacer(modifier = Modifier.height(4.dp))
                                                        Text("↓ ${formatSpeed(data.currentInboundSpeed)}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SynoBlueBright, maxLines = 1)
                                                        Text("↑ ${formatSpeed(data.currentOutboundSpeed)}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SynologyEmerald, maxLines = 1)
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
                                            SynoSearchBar(
                                                value = searchQuery,
                                                onValueChange = { viewModel.setSearch(it) },
                                                placeholder = "Tìm IP / tiến trình..."
                                            )
                                        }

                                        item {
                                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                val dirs = listOf("all" to "Tất cả", "local" to "🏠 LAN", "inbound" to "🌐 Internet")
                                                items(dirs) { (key, label) ->
                                                    SynoFilterChip(
                                                        label = label,
                                                        selected = directionFilter == key,
                                                        onClick = { viewModel.setDirectionFilter(key) }
                                                    )
                                                }
                                            }
                                        }

                                        item {
                                            SynoSectionHeader(title = strings.trafficByCountry)
                                        }

                                        adaptiveGridItems(
                                            items = data.topCountries,
                                            columns = windowState.cardGridColumns
                                        ) { country ->
                                            CountryRow(country = country, total = data.totalConnections)
                                        }

                                        item {
                                            SynoSectionHeader(title = "${strings.activeConnectionsList} (${filteredConns.size})")
                                        }

                                        if (filteredConns.isEmpty()) {
                                            item {
                                                SynoStateEmpty(
                                                    message = "Không có kết nối nào khớp bộ lọc",
                                                    icon = Icons.Default.SearchOff
                                                )
                                            }
                                        } else {
                                            adaptiveGridItems(
                                                items = filteredConns,
                                                columns = windowState.cardGridColumns
                                            ) { conn ->
                                                ConnectionItemRow(
                                                    conn = conn,
                                                    onClick = { selectedConn = conn }
                                                )
                                            }
                                        }
                                    }
                                } else {
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                        verticalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        adaptiveGridItems(
                                            items = data.interfaces,
                                            columns = windowState.cardGridColumns
                                        ) { nic ->
                                            NetworkInterfaceCard(nic = nic)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            SnackbarHost(
                hostState = snackbarHostState,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            )
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
    val syno = SynoTheme.colors
    SynoCard(onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f).padding(end = 8.dp)
            ) {
                Text(conn.geo.flagEmoji, fontSize = 22.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        conn.processName,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "${conn.remoteAddress}:${conn.remotePort}",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = syno.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            SynoStatusBadge(text = conn.protocol, color = SynoBlueBright)
        }
    }
}

@Composable
fun CountryRow(country: CountryTrafficSummary, total: Int) {
    val syno = SynoTheme.colors
    val pct = if (total > 0) (country.activeConnections * 100 / total) else 0
    SynoCard(contentPadding = PaddingValues(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f).padding(end = 8.dp)
            ) {
                Text(country.flagEmoji, fontSize = 24.sp)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        country.countryName,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "${country.activeConnections} kết nối",
                        fontSize = 11.sp,
                        color = syno.textSecondary
                    )
                }
            }
            Text(
                "$pct%",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = SynoBlueBright
            )
        }
    }
}

@Composable
fun NetworkInterfaceCard(nic: NetworkInterfaceInfo) {
    val syno = SynoTheme.colors
    val isUp = nic.status == "up"
    SynoCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Icon(Icons.Default.Router, contentDescription = null, tint = syno.accentBright)
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(nic.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = syno.textPrimary)
                    Text(nic.ip, fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = syno.textSecondary)
                }
            }
            SynoStatusBadge(
                text = if (isUp) "CONNECTED (${nic.speedMbps} Mbps)" else "DISCONNECTED",
                color = if (isUp) SynologyEmerald else syno.textSecondary
            )
        }

        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider(color = syno.borderSubtle)
        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            if (nic.mac.isNotBlank()) {
                Text("MAC: ${nic.mac}", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = syno.textSecondary, maxLines = 1)
            }
            Text("Subnet: ${nic.mask}", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = syno.textSecondary, maxLines = 1)
        }
        Spacer(modifier = Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("↓ RX: ${nic.rxBytes / (1024 * 1024)} MB", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SynoBlueBright)
            Text("↑ TX: ${nic.txBytes / (1024 * 1024)} MB", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = SynologyEmerald)
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
    val syno = SynoTheme.colors
    val clipboard = LocalClipboardManager.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(conn.geo.flagEmoji, fontSize = 20.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(strings.connectionDetails, fontWeight = FontWeight.Bold, color = syno.textPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Tiến trình: ${conn.processName}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = syno.textPrimary)
                Text("Giao thức: ${conn.protocol} (${conn.state})", fontSize = 13.sp, color = syno.textSecondary)
                Text("Địa chỉ cục bộ: ${conn.localAddress}:${conn.localPort}", fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = syno.textPrimary)
                Text("Địa chỉ từ xa: ${conn.remoteAddress}:${conn.remotePort}", fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = syno.textPrimary)
                Text("Vị trí GeoIP: ${conn.geo.countryName} (${conn.geo.countryCode})", fontSize = 13.sp, color = syno.textSecondary)
                Text("Nhà mạng (ISP): ${conn.geo.isp}", fontSize = 13.sp, color = syno.textSecondary)
                TextButton(
                    onClick = { clipboard.setText(AnnotatedString("${conn.remoteAddress}:${conn.remotePort}")) },
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp), tint = syno.accentBright)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Sao chép IP", fontSize = 12.sp, color = syno.accentBright)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onBlockIp,
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
            ) {
                Icon(Icons.Default.Block, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(strings.blockIp)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onKick, shape = RoundedCornerShape(24.dp)) {
                Icon(Icons.Default.PowerSettingsNew, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(strings.kickSession)
            }
        }
    )
}
