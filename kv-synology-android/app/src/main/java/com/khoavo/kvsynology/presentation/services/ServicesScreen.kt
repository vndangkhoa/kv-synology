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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.ServiceItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun ServicesScreen(
    viewModel: ServicesViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

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

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.fileAndNetworkServices,
                    subtitle = "SMB, AFP, NFS, FTP, SSH & cổng lắng nghe",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.loadData() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                Box(modifier = Modifier.weight(1f)) {
                    when (val state = servicesState) {
                        is UiState.Loading -> SynoStateLoading()
                        is UiState.Error -> SynoStateError(
                            message = state.message,
                            onRetry = { viewModel.loadData() }
                        )
                        is UiState.Empty -> SynoStateEmpty(
                            message = "Không có dịch vụ nào",
                            icon = Icons.Default.MiscellaneousServices
                        )
                        is UiState.Success -> {
                            val allServices = state.data
                            val activeCount = allServices.count { it.enabled }
                            val totalPortsCount = allServices.count { it.port != null }

                            val categories = listOf(
                                "all" to "Tất cả (${allServices.size})",
                                "file" to "Chia sẻ tệp",
                                "terminal" to "SSH & Dòng lệnh",
                                "backup" to "Sao lưu & Sync",
                                "web" to "Web & Proxy",
                                "management" to "Quản trị"
                            )

                            val filteredServices = if (selectedCategory == "all") {
                                allServices
                            } else {
                                allServices.filter { it.category.equals(selectedCategory, ignoreCase = true) }
                            }

                            Column(modifier = Modifier.fillMaxSize()) {
                                LazyRow(
                                    modifier = Modifier.fillMaxWidth(),
                                    contentPadding = PaddingValues(horizontal = hPad, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(categories) { (catKey, catLabel) ->
                                        SynoFilterChip(
                                            label = catLabel,
                                            selected = selectedCategory == catKey,
                                            onClick = { selectedCategory = catKey }
                                        )
                                    }
                                }

                                SynoResponsiveContentContainer(modifier = Modifier.weight(1f)) {
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                        verticalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        item {
                                            SynoCard {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                                                        Text(
                                                            "Tổng quan Dịch vụ & Cổng mạng",
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 16.sp,
                                                            color = syno.textPrimary
                                                        )
                                                        Spacer(modifier = Modifier.height(2.dp))
                                                        Text(
                                                            "Quản lý trạng thái và cấu hình cổng lắng nghe",
                                                            fontSize = 12.sp,
                                                            color = syno.textSecondary
                                                        )
                                                    }
                                                    SynoStatusBadge(
                                                        text = "$activeCount ĐANG CHẠY",
                                                        color = SynologyEmerald
                                                    )
                                                }

                                                Spacer(modifier = Modifier.height(12.dp))
                                                HorizontalDivider(color = syno.borderSubtle)
                                                Spacer(modifier = Modifier.height(12.dp))

                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceAround
                                                ) {
                                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Text("$activeCount / ${allServices.size}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynoBlueBright)
                                                        Text("Dịch vụ bật", fontSize = 11.sp, color = syno.textSecondary)
                                                    }
                                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Text("$totalPortsCount", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynologyEmerald)
                                                        Text("Cổng đang mở", fontSize = 11.sp, color = syno.textSecondary)
                                                    }
                                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Text("TCP / UDP", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = syno.textPrimary)
                                                        Text("Giao thức", fontSize = 11.sp, color = syno.textSecondary)
                                                    }
                                                }
                                            }
                                        }

                                        adaptiveGridItems(
                                            items = filteredServices,
                                            columns = windowState.cardGridColumns
                                        ) { srv ->
                                            UnifiedServiceCard(
                                                service = srv,
                                                isToggling = srv.id in togglingIds,
                                                onToggle = { enabled -> viewModel.toggleService(srv.id, enabled) },
                                                onEditPort = { serviceToEditPort = srv }
                                            )
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
    val syno = SynoTheme.colors
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

    SynoCard(contentPadding = PaddingValues(14.dp)) {
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
                            if (service.enabled) syno.accentDim else syno.cardInner
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (service.enabled) syno.accentBright else syno.textSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            service.displayName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = syno.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        SynoStatusBadge(
                            text = if (service.enabled) "BẬT" else "TẮT",
                            color = if (service.enabled) SynologyEmerald else SynologyRose
                        )
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        service.description,
                        fontSize = 12.sp,
                        color = syno.textSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Box(modifier = Modifier.padding(start = 8.dp), contentAlignment = Alignment.Center) {
                if (isToggling) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = syno.accentBright)
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
                        color = syno.cardInner
                    ) {
                        Text(
                            text = "TCP / ${service.port}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = syno.accentBright,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                SynoStatusBadge(text = service.category.uppercase(), color = SynoBlueBright)
            }

            if (service.port != null && (service.id == "ssh" || service.id == "ftp" || service.id == "webdav" || service.id == "rsync")) {
                TextButton(
                    onClick = onEditPort,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(14.dp), tint = syno.accentBright)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Đổi cổng", fontSize = 12.sp, color = syno.accentBright)
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
    val syno = SynoTheme.colors
    var portText by remember { mutableStateOf((service.port ?: 22).toString()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = { Text("Chỉnh sửa Cổng Dịch vụ", fontWeight = FontWeight.Bold, color = syno.textPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Dịch vụ: ${service.displayName}", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = syno.textPrimary)
                Text(
                    "Nhập số cổng lắng nghe mới cho dịch vụ này (1 - 65535). Đảm bảo không trùng với các cổng dịch vụ hệ thống khác.",
                    fontSize = 12.sp,
                    color = syno.textSecondary
                )

                OutlinedTextField(
                    value = portText,
                    onValueChange = {
                        portText = it
                        errorMessage = null
                    },
                    label = { Text("Cổng (Port)") },
                    placeholder = { Text("22") },
                    colors = synoOutlinedTextFieldColors(),
                    shape = RoundedCornerShape(10.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    isError = errorMessage != null,
                    modifier = Modifier.fillMaxWidth()
                )

                errorMessage?.let {
                    Text(it, color = SynologyRose, fontSize = 12.sp)
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
                },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
            ) {
                Text("Lưu cổng mới")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(24.dp)) {
                Text("Hủy")
            }
        }
    )
}
