package com.khoavo.kvsynology.presentation.snmp

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.SnmpDevice
import com.khoavo.kvsynology.domain.model.SnmpSensor
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.common.formatSensorValue
import com.khoavo.kvsynology.presentation.common.formatUptimeHours
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun SnmpScreen(
    viewModel: SnmpViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val snmpState by viewModel.snmpState.collectAsState()
    var snmpServiceEnabled by remember { mutableStateOf(true) }
    var snmpVersion by remember { mutableStateOf("v2c") }
    var communityName by remember { mutableStateOf("public") }
    var showAddDeviceDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.snmpMonitor, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadDevices() }) {
                        Icon(Icons.Default.Refresh, contentDescription = strings.refresh)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDeviceDialog = true },
                containerColor = SynologyBlue
            ) {
                Icon(Icons.Default.Add, contentDescription = strings.addSnmpDevice, tint = Color.White)
            }
        }
    ) { padding ->
        when (val state = snmpState) {
            is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Text(state.message, color = MaterialTheme.colorScheme.error)
            }
            is UiState.Success -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    // Bottom clearance so the + FAB never covers the last card.
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // SNMP Service Configuration Card
                    item {
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
                                        Icon(Icons.Default.SettingsInputAntenna, contentDescription = null, tint = SynologyBlue)
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(strings.snmpServiceConfig, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                            Text("SNMP Agent trên DSM Cổng 161 (UDP)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    Switch(
                                        checked = snmpServiceEnabled,
                                        onCheckedChange = { snmpServiceEnabled = it }
                                    )
                                }

                                if (snmpServiceEnabled) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                    Spacer(modifier = Modifier.height(10.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("${strings.snmpVersion}:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        listOf("v1", "v2c", "v3").forEach { v ->
                                            FilterChip(
                                                selected = snmpVersion == v,
                                                onClick = { snmpVersion = v },
                                                label = { Text(v) }
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("${strings.communityName}:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = MaterialTheme.colorScheme.surfaceVariant
                                        ) {
                                            Text(
                                                communityName,
                                                fontFamily = FontFamily.Monospace,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Thiết bị giám sát (${state.data.size})", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            TextButton(onClick = { showAddDeviceDialog = true }) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(strings.addSnmpDevice)
                            }
                        }
                    }

                    items(state.data) { device ->
                        SnmpDeviceCard(device = device)
                    }
                }
            }
            else -> {}
        }
    }

    if (showAddDeviceDialog) {
        AddSnmpDeviceDialog(
            onDismiss = { showAddDeviceDialog = false },
            onConfirm = {
                showAddDeviceDialog = false
            }
        )
    }
}

@Composable
fun SnmpDeviceCard(device: SnmpDevice) {
    val strings = LocalAppStrings.current
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
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.Router, contentDescription = null, tint = SynologyBlue)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(device.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                        Text(
                            "${device.host}:${device.port} (${device.credentials.version})",
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = SynologyEmerald.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = strings.connected,
                        color = SynologyEmerald,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(10.dp))

            Text(strings.sensors, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(8.dp))

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                device.sensors.forEach { sensor ->
                    SnmpSensorRow(sensor = sensor)
                }
            }
        }
    }
}

@Composable
fun SnmpSensorRow(sensor: SnmpSensor) {
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
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Icon(icon, contentDescription = null, tint = if (isWarning) SynologyRose else SynologyBlue, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    sensor.name,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                // Uptime arrives as fractional hours → "13h 13m"; others unit-aware.
                text = if (sensor.kind == "uptime" && sensor.unit == "h") formatUptimeHours(sensor.value)
                else formatSensorValue(sensor.value, sensor.unit),
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                color = if (isWarning) SynologyRose else SynologyEmerald,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                textAlign = androidx.compose.ui.text.style.TextAlign.End
            )
        }
    }
}

@Composable
fun AddSnmpDeviceDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    var host by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var community by remember { mutableStateOf("public") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Thêm thiết bị SNMP từ xa", fontWeight = FontWeight.Bold) },
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
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = host,
                    onValueChange = { host = it },
                    label = { Text("Địa chỉ IP máy chủ") },
                    placeholder = { Text("192.168.1.1") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = community,
                    onValueChange = { community = it },
                    label = { Text("Community String") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(onClick = onConfirm) {
                Text("Lưu thiết bị")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Hủy")
            }
        }
    )
}

