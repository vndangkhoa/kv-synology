package com.khoavo.kvsynology.presentation.permissions

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
import com.khoavo.kvsynology.domain.model.FolderUserAccess
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun PermissionsScreen(
    viewModel: PermissionsViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val aclState by viewModel.aclState.collectAsState()
    val sharedFolders by viewModel.foldersState.collectAsState()
    val saveStatus by viewModel.saveStatus.collectAsState()
    var selectedPath by remember { mutableStateOf("/docker") }
    var showAddDialog by remember { mutableStateOf(false) }
    var accessToEdit by remember { mutableStateOf<FolderUserAccess?>(null) }

    LaunchedEffect(sharedFolders) {
        if (sharedFolders.isNotEmpty() && !sharedFolders.contains(selectedPath)) {
            selectedPath = sharedFolders.first()
            viewModel.loadAcl(selectedPath)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.aclPermissions, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadFoldersAndAcl(selectedPath) }) {
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
                Icon(Icons.Default.PersonAdd, contentDescription = strings.addPermission, tint = Color.White)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Folder selector chips
            androidx.compose.foundation.lazy.LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(sharedFolders) { folder ->
                    FilterChip(
                        selected = selectedPath == folder,
                        onClick = {
                            selectedPath = folder
                            viewModel.loadAcl(folder)
                        },
                        label = { Text(folder) },
                        leadingIcon = {
                            if (selectedPath == folder) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp))
                            }
                        }
                    )
                }
            }

            // Save Status Banner
            saveStatus?.let { status ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = SynologyEmerald.copy(alpha = 0.15f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SynologyEmerald, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(status, fontSize = 12.sp, color = SynologyEmerald, fontWeight = FontWeight.Medium)
                        }
                        IconButton(onClick = { viewModel.clearSaveStatus() }, modifier = Modifier.size(20.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Đóng", tint = SynologyEmerald, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }

            when (val state = aclState) {
                is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
                is UiState.Success -> {
                    val acl = state.data
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 120.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(strings.inspectingFolder, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(acl.path, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynologyBlue)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Text("${strings.owner}: ${acl.owner}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        Text("${strings.adminGroup}: ${acl.group}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                Text("${strings.accessList} (${acl.accessList.size})", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                Row {
                                    Button(
                                        onClick = { viewModel.saveChanges() },
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Áp dụng ACL", fontSize = 12.sp)
                                    }
                                }
                            }
                        }

                        items(acl.accessList) { access ->
                            AclAccessCard(
                                access = access,
                                onClick = { accessToEdit = access },
                                onDelete = { viewModel.deletePermission(access.targetName) }
                            )
                        }
                    }
                }
                else -> {}
            }
        }
    }

    if (showAddDialog) {
        AclPermissionDialog(
            initialAccess = null,
            onDismiss = { showAddDialog = false },
            onConfirm = { newAccess ->
                viewModel.addPermission(newAccess)
                showAddDialog = false
            }
        )
    }

    accessToEdit?.let { access ->
        AclPermissionDialog(
            initialAccess = access,
            onDismiss = { accessToEdit = null },
            onConfirm = { updatedAccess ->
                viewModel.updatePermission(updatedAccess)
                accessToEdit = null
            }
        )
    }
}

@Composable
fun AclPermissionDialog(
    initialAccess: FolderUserAccess?,
    onDismiss: () -> Unit,
    onConfirm: (FolderUserAccess) -> Unit
) {
    val strings = LocalAppStrings.current
    var targetName by remember { mutableStateOf(initialAccess?.targetName ?: "") }
    var isGroup by remember { mutableStateOf(initialAccess?.isGroup ?: false) }
    var level by remember { mutableStateOf(initialAccess?.level ?: "read_only") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initialAccess == null) strings.addPermission else strings.editPermission, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = targetName,
                    onValueChange = { targetName = it },
                    label = { Text(strings.userOrGroup) },
                    placeholder = { Text("vo.kn / administrators / guest") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = initialAccess == null
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Loại: ", fontSize = 12.sp)
                    FilterChip(
                        selected = !isGroup,
                        onClick = { isGroup = false },
                        label = { Text("Người dùng") },
                        modifier = Modifier.padding(end = 6.dp)
                    )
                    FilterChip(
                        selected = isGroup,
                        onClick = { isGroup = true },
                        label = { Text("Nhóm người dùng") }
                    )
                }

                Text(strings.permissionLevel, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf(
                        "full_control" to strings.fullControl,
                        "read_write" to strings.readAndWrite,
                        "read_only" to strings.readOnly,
                        "deny" to strings.deny
                    ).forEach { (lvlKey, lvlLabel) ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            RadioButton(
                                selected = level == lvlKey,
                                onClick = { level = lvlKey }
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(lvlLabel, fontSize = 13.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (targetName.isNotBlank()) {
                        onConfirm(
                            FolderUserAccess(
                                targetName = targetName.trim(),
                                isGroup = isGroup,
                                level = level
                            )
                        )
                    }
                }
            ) {
                Text(strings.save)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text(strings.cancel)
            }
        }
    )
}

@Composable
fun AclAccessCard(
    access: FolderUserAccess,
    onClick: () -> Unit = {},
    onDelete: () -> Unit = {}
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
                Icon(
                    imageVector = if (access.isGroup) Icons.Default.Group else Icons.Default.Person,
                    contentDescription = null,
                    tint = SynologyBlue
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(access.targetName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text(if (access.isGroup) "Nhóm" else "Người dùng", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = when (access.level) {
                        "full_control" -> SynologyBlue.copy(alpha = 0.15f)
                        "read_write" -> MaterialTheme.colorScheme.tertiaryContainer
                        "read_only" -> SynologyEmerald.copy(alpha = 0.15f)
                        "deny" -> SynologyRose.copy(alpha = 0.15f)
                        else -> MaterialTheme.colorScheme.outlineVariant
                    }
                ) {
                    Text(
                        text = access.level.replace('_', ' ').uppercase(),
                        color = when (access.level) {
                            "full_control" -> SynologyBlue
                            "read_write" -> MaterialTheme.colorScheme.tertiary
                            "read_only" -> SynologyEmerald
                            "deny" -> SynologyRose
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.width(4.dp))
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Xóa", tint = SynologyRose, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}
