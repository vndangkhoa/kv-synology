package com.khoavo.kvsynology.presentation.snmp

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.SnmpDevice
import com.khoavo.kvsynology.domain.model.SnmpSensor
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.common.formatSensorValue
import com.khoavo.kvsynology.presentation.common.formatUptimeHours
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun SnmpScreen(
    viewModel: SnmpViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    val snmpState by viewModel.snmpState.collectAsState()
    var snmpServiceEnabled by remember { mutableStateOf(true) }
    var snmpVersion by remember { mutableStateOf("v2c") }
    var communityName by remember { mutableStateOf("public") }
    var showAddDeviceDialog by remember { mutableStateOf(false) }

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.snmpMonitor,
                    subtitle = "Cảm biến phần cứng & thiết bị SNMP từ xa",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.loadDevices() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                Box(modifier = Modifier.weight(1f)) {
                    when (val state = snmpState) {
                        is UiState.Loading -> SynoStateLoading()
                        is UiState.Error -> SynoStateError(
                            message = state.message,
                            onRetry = { viewModel.loadDevices() }
                        )
                        is UiState.Empty -> SynoStateEmpty(
                            message = "Không có thiết bị SNMP",
                            icon = Icons.Default.Sensors
                        )
                        is UiState.Success -> {
                            SynoResponsiveContentContainer {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                    verticalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    item {
                                        SynoCard {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                                                ) {
                                                    Icon(Icons.Default.SettingsInputAntenna, contentDescription = null, tint = syno.accentBright)
                                                    Spacer(modifier = Modifier.width(10.dp))
                                                    Column {
                                                        Text(strings.snmpServiceConfig, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = syno.textPrimary)
                                                        Text("SNMP Agent trên DSM Cổng 161 (UDP)", fontSize = 12.sp, color = syno.textSecondary)
                                                    }
                                                }
                                                Switch(
                                                    checked = snmpServiceEnabled,
                                                    onCheckedChange = { snmpServiceEnabled = it }
                                                )
                                            }

                                            if (snmpServiceEnabled) {
                                                Spacer(modifier = Modifier.height(12.dp))
                                                HorizontalDivider(color = syno.borderSubtle)
                                                Spacer(modifier = Modifier.height(10.dp))

                                                LazyRow(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    item {
                                                        Text("${strings.snmpVersion}:", fontSize = 12.sp, color = syno.textSecondary)
                                                    }
                                                    items(listOf("v1", "v2c", "v3")) { v ->
                                                        SynoFilterChip(
                                                            label = v,
                                                            selected = snmpVersion == v,
                                                            onClick = { snmpVersion = v }
                                                        )
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(10.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text("${strings.communityName}:", fontSize = 12.sp, color = syno.textSecondary)
                                                    Surface(
                                                        shape = RoundedCornerShape(6.dp),
                                                        color = syno.cardInner
                                                    ) {
                                                        Text(
                                                            communityName,
                                                            fontFamily = FontFamily.Monospace,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 12.sp,
                                                            color = syno.textPrimary,
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    item {
                                        SynoSectionHeader(
                                            title = "Thiết bị giám sát (${state.data.size})",
                                            actionLabel = strings.addSnmpDevice,
                                            onAction = { showAddDeviceDialog = true }
                                        )
                                    }

                                    adaptiveGridItems(
                                        items = state.data,
                                        columns = windowState.cardGridColumns
                                    ) { device ->
                                        SnmpDeviceCard(device = device)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            FloatingActionButton(
                onClick = { showAddDeviceDialog = true },
                shape = CircleShape,
                containerColor = SynologyBlue,
                contentColor = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = strings.addSnmpDevice)
            }
        }
    }

    if (showAddDeviceDialog) {
        AddSnmpDeviceDialog(
            onDismiss = { showAddDeviceDialog = false },
            onConfirm = { showAddDeviceDialog = false }
        )
    }
}

@Composable
fun SnmpDeviceCard(device: SnmpDevice) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    SynoCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Icon(Icons.Default.Router, contentDescription = null, tint = syno.accentBright)
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        device.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "${device.host}:${device.port} (${device.credentials.version})",
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        color = syno.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            SynoStatusBadge(text = strings.connected, color = SynologyEmerald)
        }

        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider(color = syno.borderSubtle)
        Spacer(modifier = Modifier.height(10.dp))

        Text(strings.sensors, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = syno.textSecondary)
        Spacer(modifier = Modifier.height(8.dp))

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            device.sensors.forEach { sensor ->
                SnmpSensorRow(sensor = sensor)
            }
        }
    }
}

@Composable
fun SnmpSensorRow(sensor: SnmpSensor) {
    val syno = SynoTheme.colors
    val icon: ImageVector = when (sensor.kind) {
        "cpu" -> Icons.Default.Memory
        "memory" -> Icons.Default.Storage
        "uptime" -> Icons.Default.Timer
        "traffic" -> Icons.Default.SwapVert
        "fan" -> Icons.Default.Speed
        "disk" -> Icons.Default.DeviceThermostat
        else -> Icons.Default.Sensors
    }

    val isWarning = sensor.status == "warn"
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = syno.cardInner
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Icon(icon, contentDescription = null, tint = if (isWarning) SynologyRose else syno.accentBright, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    sensor.name,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = syno.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (sensor.kind == "uptime" && sensor.unit == "h") formatUptimeHours(sensor.value)
                else formatSensorValue(sensor.value, sensor.unit),
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                color = if (isWarning) SynologyRose else SynologyEmerald,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.End
            )
        }
    }
}

@Composable
fun AddSnmpDeviceDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    val syno = SynoTheme.colors
    val fieldColors = synoOutlinedTextFieldColors()
    var host by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var community by remember { mutableStateOf("public") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = { Text("Thêm thiết bị SNMP từ xa", fontWeight = FontWeight.Bold, color = syno.textPrimary) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Tên thiết bị") },
                    placeholder = { Text("Router Mikrotik / Switch Cisco") },
                    colors = fieldColors,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = host,
                    onValueChange = { host = it },
                    label = { Text("Địa chỉ IP máy chủ") },
                    placeholder = { Text("192.168.1.1") },
                    colors = fieldColors,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = community,
                    onValueChange = { community = it },
                    label = { Text("Community String") },
                    colors = fieldColors,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
            ) {
                Text("Lưu thiết bị")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(24.dp)) {
                Text("Hủy")
            }
        }
    )
}
