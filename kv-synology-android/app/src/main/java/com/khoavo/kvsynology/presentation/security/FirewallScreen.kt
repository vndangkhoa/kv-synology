package com.khoavo.kvsynology.presentation.security

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.FirewallRule
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun FirewallScreen(
    viewModel: SecurityViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val firewallState by viewModel.firewallState.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var ruleToEdit by remember { mutableStateOf<FirewallRule?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.firewallAndSecurity, fontWeight = FontWeight.Bold) },
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
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = SynologyBlue
            ) {
                Icon(Icons.Default.Add, contentDescription = strings.addRule, tint = Color.White)
            }
        }
    ) { padding ->
        when (val state = firewallState) {
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
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Default.Security, contentDescription = null, tint = SynologyEmerald)
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(strings.firewallStatus, fontWeight = FontWeight.Bold)
                                        Text(
                                            if (state.data.enabled) strings.firewallActive else strings.firewallInactive,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (state.data.enabled) SynologyEmerald.copy(alpha = 0.15f) else SynologyRose.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = if (state.data.enabled) strings.running else strings.stopped,
                                        color = if (state.data.enabled) SynologyEmerald else SynologyRose,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
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
                            Text(
                                "${strings.firewallRules} (${state.data.rules.size})",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium
                            )
                            TextButton(onClick = { showAddDialog = true }) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(strings.addRule)
                            }
                        }
                    }

                    items(state.data.rules) { rule ->
                        FirewallRuleCard(
                            rule = rule,
                            onToggle = { enabled -> viewModel.toggleRule(rule.name, enabled) },
                            onDelete = { viewModel.deleteRule(rule.name) },
                            onClick = { ruleToEdit = rule }
                        )
                    }
                }
            }
            else -> {}
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FirewallRuleDialog(
    initialRule: FirewallRule?,
    onDismiss: () -> Unit,
    onConfirm: (FirewallRule) -> Unit
) {
    val strings = LocalAppStrings.current
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
        title = { Text(if (initialRule == null) strings.addRule else strings.editRule, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(strings.ruleName) },
                    placeholder = { Text("DSM Admin Web UI") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text(strings.selectFromRunningService, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(servicePresets) { (srvName, srvPorts) ->
                        SuggestionChip(
                            onClick = {
                                if (name.isBlank()) name = "$srvName Rule"
                                ports = srvPorts
                            },
                            label = { Text("$srvName ($srvPorts)", fontSize = 11.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = ports,
                    onValueChange = { ports = it },
                    label = { Text("${strings.port} (all / 80, 443, 5001)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${strings.protocol}: ", fontSize = 12.sp)
                    listOf("TCP", "UDP", "ALL").forEach { p ->
                        FilterChip(
                            selected = protocol.equals(p, ignoreCase = true),
                            onClick = { protocol = p },
                            label = { Text(p) },
                            modifier = Modifier.padding(end = 6.dp)
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${strings.action}: ", fontSize = 12.sp)
                    FilterChip(
                        selected = action == "allow",
                        onClick = { action = "allow" },
                        label = { Text(strings.allow) },
                        modifier = Modifier.padding(end = 6.dp)
                    )
                    FilterChip(
                        selected = action == "deny",
                        onClick = { action = "deny" },
                        label = { Text(strings.deny) }
                    )
                }

                OutlinedTextField(
                    value = source,
                    onValueChange = { source = it },
                    label = { Text(strings.sourceIp) },
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
                }
            ) {
                Text(strings.saveRule)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
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
    val isAllow = rule.action.lowercase() == "allow"
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isAllow) SynologyEmerald.copy(alpha = 0.15f) else SynologyRose.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = if (isAllow) "ALLOW" else "DENY",
                            color = if (isAllow) SynologyEmerald else SynologyRose,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        rule.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(
                        checked = rule.enabled,
                        onCheckedChange = onToggle
                    )
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Xóa", tint = SynologyRose, modifier = Modifier.size(20.dp))
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
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text("Cổng: $displayPort", fontSize = 11.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(rule.protocol.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text("Nguồn: $displaySource", fontSize = 11.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }
        }
    }
}

