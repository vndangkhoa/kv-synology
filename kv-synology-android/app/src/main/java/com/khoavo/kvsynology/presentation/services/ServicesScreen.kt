package com.khoavo.kvsynology.presentation.services

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.ServiceItem
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun ServicesScreen(
    viewModel: ServicesViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val servicesState by viewModel.servicesState.collectAsState()
    val togglingIds by viewModel.togglingIds.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    var selectedCategory by remember { mutableStateOf("all") }
    var serviceToEditPort by remember { mutableStateOf<ServiceItem?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.consumeError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.fileAndNetworkServices, fontWeight = FontWeight.Bold) },
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
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (val state = servicesState) {
                is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
                is UiState.Success -> {
                    val allServices = state.data
                    val activeCount = allServices.count { it.enabled }
                    val totalPortsCount = allServices.count { it.port != null }

                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val categories = listOf(
                            "all" to "Tất cả (${allServices.size})",
                            "file" to "Chia sẻ tệp",
                            "terminal" to "SSH & Dòng lệnh",
                            "backup" to "Sao lưu & Sync",
                            "web" to "Web & Proxy",
                            "management" to "Quản trị"
                        )
                        items(categories) { (catKey, catLabel) ->
                            FilterChip(
                                selected = selectedCategory == catKey,
                                onClick = { selectedCategory = catKey },
                                label = { Text(catLabel) }
                            )
                        }
                    }

                    val filteredServices = if (selectedCategory == "all") {
                        allServices
                    } else {
                        allServices.filter { it.category.equals(selectedCategory, ignoreCase = true) }
                    }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 120.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
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
                                            Text("Tổng quan Dịch vụ & Cổng mạng", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text("Quản lý trạng thái và cấu hình cổng lắng nghe", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = SynologyEmerald.copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                text = "$activeCount ĐANG CHẠY",
                                                color = SynologyEmerald,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(12.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceAround
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("$activeCount / ${allServices.size}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynologyBlue)
                                            Text("Dịch vụ bật", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("$totalPortsCount", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynologyEmerald)
                                            Text("Cổng đang mở", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("TCP / UDP", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                                            Text("Giao thức", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }

                        items(filteredServices) { srv ->
                            UnifiedServiceCard(
                                service = srv,
                                isToggling = srv.id in togglingIds,
                                onToggle = { enabled -> viewModel.toggleService(srv.id, enabled) },
                                onEditPort = { serviceToEditPort = srv }
                            )
                        }
                    }
                }
                else -> {}
            }
        }
    }

    serviceToEditPort?.let { srv ->
        EditServicePortDialog(
            service = srv,
            onDismiss = { serviceToEditPort = null },
            onConfirm = { newPort ->
                viewModel.updateServicePort(srv.id, newPort)
                serviceToEditPort = null
            }
        )
    }
}

@Composable
fun UnifiedServiceCard(
    service: ServiceItem,
    onToggle: (Boolean) -> Unit,
    onEditPort: () -> Unit,
    isToggling: Boolean = false
) {
    val icon = when (service.id) {
        "smb" -> Icons.Default.FolderShared
        "afp" -> Icons.Default.Devices
        "nfs" -> Icons.Default.Dns
        "ftp" -> Icons.Default.CloudUpload
        "ssh" -> Icons.Default.Terminal
        "rsync" -> Icons.Default.Sync
        "webdav" -> Icons.Default.Cloud
        "nginx" -> Icons.Default.Language
        "snmp" -> Icons.Default.Router
        else -> Icons.Default.MiscellaneousServices
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(
                                if (service.enabled) SynologyBlue.copy(alpha = 0.12f)
                                else MaterialTheme.colorScheme.surfaceVariant
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = if (service.enabled) SynologyBlue else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(service.displayName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = if (service.enabled) SynologyEmerald.copy(alpha = 0.15f) else SynologyRose.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = if (service.enabled) "ĐANG LẮNG NGHE" else "ĐÃ TẮT",
                                    color = if (service.enabled) SynologyEmerald else SynologyRose,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(service.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                Box(modifier = Modifier.padding(start = 8.dp), contentAlignment = Alignment.Center) {
                    if (isToggling) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    } else {
                        Switch(
                            checked = service.enabled,
                            onCheckedChange = if (service.canToggle) onToggle else ({}),
                            enabled = service.canToggle
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (service.port != null) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "TCP / ${service.port}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = SynologyBlue.copy(alpha = 0.1f)
                    ) {
                        Text(
                            text = service.category.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SynologyBlue,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                        )
                    }
                }

                if (service.port != null && (service.id == "ssh" || service.id == "ftp" || service.id == "webdav" || service.id == "rsync")) {
                    TextButton(
                        onClick = onEditPort,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Đổi cổng", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun EditServicePortDialog(
    service: ServiceItem,
    onDismiss: () -> Unit,
    onConfirm: (Int) -> Unit
) {
    var portText by remember { mutableStateOf((service.port ?: 22).toString()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Chỉnh sửa Cổng Dịch vụ", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Dịch vụ: ${service.displayName}", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    "Nhập số cổng lắng nghe mới cho dịch vụ này (1 - 65535). Đảm bảo không trùng với các cổng dịch vụ hệ thống khác.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = portText,
                    onValueChange = {
                        portText = it
                        errorMessage = null
                    },
                    label = { Text("Cổng (Port)") },
                    placeholder = { Text("22") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    isError = errorMessage != null,
                    modifier = Modifier.fillMaxWidth()
                )

                errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val portNum = portText.toIntOrNull()
                    if (portNum == null || portNum < 1 || portNum > 65535) {
                        errorMessage = "Số cổng không hợp lệ (1 - 65535)"
                    } else {
                        onConfirm(portNum)
                    }
                }
            ) {
                Text("Lưu cổng mới")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Hủy")
            }
        }
    )
}
