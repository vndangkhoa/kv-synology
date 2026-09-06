package com.khoavo.kvsynology.presentation.services

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.ReverseProxyBackend
import com.khoavo.kvsynology.domain.model.ReverseProxyFrontend
import com.khoavo.kvsynology.domain.model.ReverseProxyRule
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReverseProxyScreen(
    viewModel: ServicesViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val proxyState by viewModel.reverseProxyState.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    
    var showAddDialog by remember { mutableStateOf(false) }
    var ruleToEdit by remember { mutableStateOf<ReverseProxyRule?>(null) }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.consumeError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Reverse Proxy", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = SynologyBlue
            ) {
                Icon(Icons.Default.Add, contentDescription = "Thêm quy tắc", tint = Color.White)
            }
        }
    ) { padding ->
        when (val state = proxyState) {
            is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(onClick = { viewModel.loadData() }) {
                        Text("Thử lại")
                    }
                }
            }
            is UiState.Success -> {
                if (state.data.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.CompareArrows,
                                    contentDescription = null,
                                    tint = SynologyBlue,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    "Chưa có quy tắc Reverse Proxy",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "Chuyển tiếp tên miền hoặc cổng HTTPS bên ngoài đến các dịch vụ nội bộ NAS.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(onClick = { showAddDialog = true }) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Thêm quy tắc mới")
                                }
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.data, key = { it.uuid }) { rule ->
                            ReverseProxyCard(
                                rule = rule,
                                onEdit = { ruleToEdit = rule },
                                onDelete = { viewModel.deleteReverseProxyRule(rule.uuid) }
                            )
                        }
                    }
                }
            }
            else -> {}
        }
    }

    if (showAddDialog) {
        ReverseProxyRuleDialog(
            ruleToEdit = null,
            onDismiss = { showAddDialog = false },
            onConfirm = { newRule ->
                viewModel.addReverseProxyRule(newRule)
                showAddDialog = false
            }
        )
    }

    ruleToEdit?.let { currentRule ->
        ReverseProxyRuleDialog(
            ruleToEdit = currentRule,
            onDismiss = { ruleToEdit = null },
            onConfirm = { updatedRule ->
                viewModel.updateReverseProxyRule(updatedRule)
                ruleToEdit = null
            }
        )
    }
}

@Composable
fun ReverseProxyRuleDialog(
    ruleToEdit: ReverseProxyRule? = null,
    onDismiss: () -> Unit,
    onConfirm: (ReverseProxyRule) -> Unit
) {
    val isEdit = ruleToEdit != null
    var description by remember { mutableStateOf(ruleToEdit?.description ?: "") }
    var sourceHost by remember { mutableStateOf(ruleToEdit?.frontend?.fqdn ?: "") }
    var sourcePort by remember { mutableStateOf((ruleToEdit?.frontend?.port ?: 443).toString()) }
    var sourceHttps by remember { mutableStateOf(ruleToEdit?.frontend?.protocol != 0) }
    var enableHsts by remember { mutableStateOf(ruleToEdit?.frontend?.hsts ?: true) }
    var enableHttp2 by remember { mutableStateOf(ruleToEdit?.frontend?.http2 ?: true) }

    var targetHost by remember { mutableStateOf(ruleToEdit?.backend?.fqdn ?: "localhost") }
    var targetPort by remember { mutableStateOf((ruleToEdit?.backend?.port ?: 8080).toString()) }
    var targetHttps by remember { mutableStateOf(ruleToEdit?.backend?.protocol == 1) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                if (isEdit) "Chỉnh sửa quy tắc Reverse Proxy" else "Thêm quy tắc Reverse Proxy",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Tên mô tả dịch vụ") },
                    placeholder = { Text("Ví dụ: Vaultwarden, AdGuard...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text("Nguồn đến (Frontend)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = sourceHost,
                        onValueChange = { sourceHost = it },
                        label = { Text("Tên miền (FQDN)") },
                        modifier = Modifier.weight(2f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = sourcePort,
                        onValueChange = { sourcePort = it },
                        label = { Text("Cổng") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Giao thức nguồn: ", fontSize = 12.sp)
                    FilterChip(
                        selected = sourceHttps,
                        onClick = { sourceHttps = true },
                        label = { Text("HTTPS") }
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    FilterChip(
                        selected = !sourceHttps,
                        onClick = { sourceHttps = false },
                        label = { Text("HTTP") }
                    )
                }

                if (sourceHttps) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = enableHsts, onCheckedChange = { enableHsts = it })
                            Text("HSTS", fontSize = 12.sp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = enableHttp2, onCheckedChange = { enableHttp2 = it })
                            Text("HTTP/2", fontSize = 12.sp)
                        }
                    }
                }

                HorizontalDivider()

                Text("Đích chuyển tiếp (Backend)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = targetHost,
                        onValueChange = { targetHost = it },
                        label = { Text("Máy chủ đích") },
                        modifier = Modifier.weight(2f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = targetPort,
                        onValueChange = { targetPort = it },
                        label = { Text("Cổng đích") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Giao thức đích: ", fontSize = 12.sp)
                    FilterChip(
                        selected = !targetHttps,
                        onClick = { targetHttps = false },
                        label = { Text("HTTP") }
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    FilterChip(
                        selected = targetHttps,
                        onClick = { targetHttps = true },
                        label = { Text("HTTPS") }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (description.isNotBlank() && sourceHost.isNotBlank()) {
                        val rule = ReverseProxyRule(
                            uuid = ruleToEdit?.uuid ?: UUID.randomUUID().toString(),
                            description = description.trim(),
                            frontend = ReverseProxyFrontend(
                                protocol = if (sourceHttps) 1 else 0,
                                fqdn = sourceHost.trim(),
                                port = sourcePort.toIntOrNull() ?: if (sourceHttps) 443 else 80,
                                hsts = if (sourceHttps) enableHsts else false,
                                http2 = if (sourceHttps) enableHttp2 else false
                            ),
                            backend = ReverseProxyBackend(
                                protocol = if (targetHttps) 1 else 0,
                                fqdn = targetHost.trim(),
                                port = targetPort.toIntOrNull() ?: if (targetHttps) 443 else 8080
                            ),
                            proxyConnectTimeout = ruleToEdit?.proxyConnectTimeout ?: 60
                        )
                        onConfirm(rule)
                    }
                }
            ) {
                Text(if (isEdit) "Lưu thay đổi" else "Lưu quy tắc")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Hủy")
            }
        }
    )
}

@Composable
fun ReverseProxyCard(
    rule: ReverseProxyRule,
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onEdit() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    rule.description,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    modifier = Modifier.weight(1f)
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onEdit) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Chỉnh sửa quy tắc",
                            tint = SynologyBlue,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    IconButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Xóa quy tắc",
                            tint = SynologyRose,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = SynologyBlue.copy(alpha = 0.12f),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text("Frontend (Nguồn)", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${rule.frontend.fqdn}:${rule.frontend.port}", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                if (rule.frontend.protocol == 1) "HTTPS" else "HTTP",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = SynologyBlue
                            )
                            if (rule.frontend.protocol == 1 && rule.frontend.hsts) {
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = SynologyEmerald.copy(alpha = 0.15f)
                                ) {
                                    Text("HSTS", fontSize = 9.sp, color = SynologyEmerald, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                            if (rule.frontend.protocol == 1 && rule.frontend.http2) {
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = SynologyBlue.copy(alpha = 0.15f)
                                ) {
                                    Text("HTTP/2", fontSize = 9.sp, color = SynologyBlue, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                        }
                    }
                }

                Icon(
                    Icons.Default.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.padding(horizontal = 8.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.weight(1f)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text("Backend (Đích)", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${rule.backend.fqdn}:${rule.backend.port}", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        Text(if (rule.backend.protocol == 1) "HTTPS" else "HTTP", fontSize = 10.sp)
                    }
                }
            }
        }
    }
}

