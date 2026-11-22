package com.khoavo.kvsynology.presentation.security

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.FirewallRule
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun FirewallScreen(
    viewModel: SecurityViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    val firewallState by viewModel.firewallState.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var ruleToEdit by remember { mutableStateOf<FirewallRule?>(null) }

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.firewallAndSecurity,
                    subtitle = "Quản lý quy tắc cổng & truy cập mạng",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.loadData() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                Box(modifier = Modifier.weight(1f)) {
                    when (val state = firewallState) {
                        is UiState.Loading -> SynoStateLoading()
                        is UiState.Error -> SynoStateError(
                            message = state.message,
                            onRetry = { viewModel.loadData() }
                        )
                        is UiState.Empty -> SynoStateEmpty(
                            message = "Chưa có dữ liệu tường lửa",
                            icon = Icons.Default.Security
                        )
                        is UiState.Success -> {
                            SynoResponsiveContentContainer {
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
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                                                ) {
                                                    Icon(
                                                        Icons.Default.Security,
                                                        contentDescription = null,
                                                        tint = if (state.data.enabled) SynologyEmerald else SynologyRose
                                                    )
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    Column {
                                                        Text(strings.firewallStatus, fontWeight = FontWeight.Bold, color = syno.textPrimary)
                                                        Text(
                                                            if (state.data.enabled) strings.firewallActive else strings.firewallInactive,
                                                            fontSize = 12.sp,
                                                            color = syno.textSecondary
                                                        )
                                                    }
                                                }
                                                SynoStatusBadge(
                                                    text = if (state.data.enabled) strings.running else strings.stopped,
                                                    color = if (state.data.enabled) SynologyEmerald else SynologyRose
                                                )
                                            }
                                        }
                                    }

                                    item {
                                        SynoSectionHeader(
                                            title = "${strings.firewallRules} (${state.data.rules.size})",
                                            actionLabel = strings.addRule,
                                            onAction = { showAddDialog = true }
                                        )
                                    }

                                    adaptiveGridItems(
                                        items = state.data.rules,
                                        columns = windowState.cardGridColumns
                                    ) { rule ->
                                        FirewallRuleCard(
                                            rule = rule,
                                            onToggle = { enabled -> viewModel.toggleRule(rule.name, enabled) },
                                            onDelete = { viewModel.deleteRule(rule.name) },
                                            onClick = { ruleToEdit = rule }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            FloatingActionButton(
                onClick = { showAddDialog = true },
                shape = CircleShape,
                containerColor = SynologyBlue,
                contentColor = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = strings.addRule)
            }
        }
    }

    if (showAddDialog) {
        FirewallRuleDialog(
            initialRule = null,
            onDismiss = { showAddDialog = false },
            onConfirm = { newRule ->
                viewModel.addRule(newRule)
                showAddDialog = false
            }
        )
    }

    ruleToEdit?.let { rule ->
        FirewallRuleDialog(
            initialRule = rule,
            onDismiss = { ruleToEdit = null },
            onConfirm = { updatedRule ->
                viewModel.editRule(updatedRule)
                ruleToEdit = null
            }
        )
    }
}

@Composable
fun FirewallRuleDialog(
    initialRule: FirewallRule?,
    onDismiss: () -> Unit,
    onConfirm: (FirewallRule) -> Unit
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val fieldColors = synoOutlinedTextFieldColors()
    var name by remember { mutableStateOf(initialRule?.name ?: "") }
    var ports by remember { mutableStateOf(initialRule?.ports ?: "all") }
    var protocol by remember { mutableStateOf(initialRule?.protocol?.uppercase() ?: "TCP") }
    var action by remember { mutableStateOf(initialRule?.action?.lowercase() ?: "allow") }
    var source by remember { mutableStateOf(initialRule?.sourceValue ?: "all") }

    val servicePresets = listOf(
        "DSM" to "5000, 5001",
        "Web" to "80, 443",
        "SSH" to "22",
        "SMB" to "445",
        "FTP" to "21",
        "Download" to "6881",
        "Docker" to "9001, 8080",
        "Plex" to "32400"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = {
            Text(
                if (initialRule == null) strings.addRule else strings.editRule,
                fontWeight = FontWeight.Bold,
                color = syno.textPrimary
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(strings.ruleName) },
                    placeholder = { Text("DSM Admin Web UI") },
                    colors = fieldColors,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text(strings.selectFromRunningService, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = syno.textSecondary)
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(servicePresets) { (srvName, srvPorts) ->
                        SynoFilterChip(
                            label = "$srvName ($srvPorts)",
                            selected = ports == srvPorts,
                            onClick = {
                                if (name.isBlank()) name = "$srvName Rule"
                                ports = srvPorts
                            }
                        )
                    }
                }

                OutlinedTextField(
                    value = ports,
                    onValueChange = { ports = it },
                    label = { Text("${strings.port} (all / 80, 443, 5001)") },
                    colors = fieldColors,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                LazyRow(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    item { Text("${strings.protocol}:", fontSize = 12.sp, color = syno.textSecondary) }
                    items(listOf("TCP", "UDP", "ALL")) { p ->
                        SynoFilterChip(
                            label = p,
                            selected = protocol.equals(p, ignoreCase = true),
                            onClick = { protocol = p }
                        )
                    }
                }

                LazyRow(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    item { Text("${strings.action}:", fontSize = 12.sp, color = syno.textSecondary) }
                    item {
                        SynoFilterChip(
                            label = strings.allow,
                            selected = action == "allow",
                            onClick = { action = "allow" }
                        )
                    }
                    item {
                        SynoFilterChip(
                            label = strings.deny,
                            selected = action == "deny",
                            onClick = { action = "deny" }
                        )
                    }
                }

                OutlinedTextField(
                    value = source,
                    onValueChange = { source = it },
                    label = { Text(strings.sourceIp) },
                    colors = fieldColors,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        val rule = FirewallRule(
                            id = initialRule?.id ?: "fw_${System.currentTimeMillis()}",
                            name = name.trim(),
                            ports = if (ports.isBlank()) "all" else ports.trim(),
                            protocol = protocol.lowercase(),
                            sourceType = if (source == "all") "all" else "ip",
                            sourceValue = if (source.isBlank()) "all" else source.trim(),
                            action = action,
                            enabled = initialRule?.enabled ?: true,
                            order = initialRule?.order ?: 99
                        )
                        onConfirm(rule)
                    }
                },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
            ) {
                Text(strings.saveRule)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(24.dp)) {
                Text(strings.cancel)
            }
        }
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FirewallRuleCard(
    rule: FirewallRule,
    onToggle: (Boolean) -> Unit = {},
    onDelete: () -> Unit = {},
    onClick: () -> Unit = {}
) {
    val syno = SynoTheme.colors
    val isAllow = rule.action.lowercase() == "allow"
    SynoCard(
        onClick = onClick,
        contentPadding = PaddingValues(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f).padding(end = 6.dp)
            ) {
                SynoStatusBadge(
                    text = if (isAllow) "ALLOW" else "DENY",
                    color = if (isAllow) SynologyEmerald else SynologyRose
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    rule.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = syno.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = rule.enabled,
                    onCheckedChange = onToggle
                )
                IconButton(onClick = onDelete, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Xóa", tint = SynologyRose, modifier = Modifier.size(19.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        val displayPort = remember(rule.ports) {
            val p = rule.ports.trim()
            val tokens = p.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            if (tokens.size > 3) {
                "${tokens.take(3).joinToString(", ")} (+${tokens.size - 3})"
            } else if (p.equals("all", ignoreCase = true)) {
                "Tất cả cổng"
            } else {
                p
            }
        }

        val displaySource = remember(rule.sourceValue) {
            val s = rule.sourceValue.trim()
            if (s.equals("all", ignoreCase = true) || s == "Tất cả (all)") "Tất cả nguồn" else s
        }

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Surface(shape = RoundedCornerShape(6.dp), color = syno.cardInner) {
                Text("Cổng: $displayPort", fontSize = 11.sp, color = syno.textSecondary, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
            }
            Surface(shape = RoundedCornerShape(6.dp), color = syno.cardInner) {
                Text(rule.protocol.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = syno.accentBright, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
            }
            Surface(shape = RoundedCornerShape(6.dp), color = syno.cardInner) {
                Text("Nguồn: $displaySource", fontSize = 11.sp, color = syno.textSecondary, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
            }
        }
    }
}
