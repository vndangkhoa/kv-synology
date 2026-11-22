package com.khoavo.kvsynology.presentation.permissions

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
import com.khoavo.kvsynology.domain.model.FolderUserAccess
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun PermissionsScreen(
    viewModel: PermissionsViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

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

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.aclPermissions,
                    subtitle = "Quản lý phân quyền thư mục chia sẻ",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.loadFoldersAndAcl(selectedPath) }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = hPad, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(sharedFolders) { folder ->
                        SynoFilterChip(
                            label = folder,
                            selected = selectedPath == folder,
                            leadingIcon = if (selectedPath == folder) Icons.Default.Check else Icons.Default.Folder,
                            onClick = {
                                selectedPath = folder
                                viewModel.loadAcl(folder)
                            }
                        )
                    }
                }

                saveStatus?.let { status ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = SynologyEmerald.copy(alpha = 0.16f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = hPad, vertical = 4.dp)
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
                            IconButton(onClick = { viewModel.clearSaveStatus() }, modifier = Modifier.size(22.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Đóng", tint = SynologyEmerald, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    when (val state = aclState) {
                        is UiState.Loading -> SynoStateLoading()
                        is UiState.Error -> SynoStateError(
                            message = state.message,
                            onRetry = { viewModel.loadFoldersAndAcl(selectedPath) }
                        )
                        is UiState.Empty -> SynoStateEmpty(
                            message = "Không có phân quyền ACL",
                            icon = Icons.Default.VerifiedUser
                        )
                        is UiState.Success -> {
                            val acl = state.data
                            SynoResponsiveContentContainer {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    item {
                                        SynoCard {
                                            Text(strings.inspectingFolder, style = MaterialTheme.typography.labelSmall, color = syno.textSecondary)
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(acl.path, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynoBlueBright)
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                                Text("${strings.owner}: ${acl.owner}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = syno.textPrimary)
                                                Text("${strings.adminGroup}: ${acl.group}", fontSize = 12.sp, color = syno.textSecondary)
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
                                                "${strings.accessList} (${acl.accessList.size})",
                                                fontWeight = FontWeight.Bold,
                                                style = MaterialTheme.typography.titleMedium,
                                                color = syno.textPrimary
                                            )
                                            Button(
                                                onClick = { viewModel.saveChanges() },
                                                shape = RoundedCornerShape(24.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White),
                                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                            ) {
                                                Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Áp dụng ACL", fontSize = 12.sp)
                                            }
                                        }
                                    }

                                    adaptiveGridItems(
                                        items = acl.accessList,
                                        columns = windowState.cardGridColumns
                                    ) { access ->
                                        AclAccessCard(
                                            access = access,
                                            onClick = { accessToEdit = access },
                                            onDelete = { viewModel.deletePermission(access.targetName) }
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
                Icon(Icons.Default.PersonAdd, contentDescription = strings.addPermission)
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
    val syno = SynoTheme.colors
    var targetName by remember { mutableStateOf(initialAccess?.targetName ?: "") }
    var isGroup by remember { mutableStateOf(initialAccess?.isGroup ?: false) }
    var level by remember { mutableStateOf(initialAccess?.level ?: "read_only") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = {
            Text(
                if (initialAccess == null) strings.addPermission else strings.editPermission,
                fontWeight = FontWeight.Bold,
                color = syno.textPrimary
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = targetName,
                    onValueChange = { targetName = it },
                    label = { Text(strings.userOrGroup) },
                    placeholder = { Text("vo.kn / administrators / guest") },
                    colors = synoOutlinedTextFieldColors(),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = initialAccess == null
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Loại:", fontSize = 12.sp, color = syno.textSecondary)
                    SynoFilterChip(label = "Người dùng", selected = !isGroup, onClick = { isGroup = false })
                    SynoFilterChip(label = "Nhóm", selected = isGroup, onClick = { isGroup = true })
                }

                Text(strings.permissionLevel, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = syno.textPrimary)
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
                            Text(lvlLabel, fontSize = 13.sp, color = syno.textPrimary)
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
                },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
            ) {
                Text(strings.save)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(24.dp)) {
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
    val syno = SynoTheme.colors
    val badgeColor = when (access.level) {
        "full_control" -> SynoBlueBright
        "read_write" -> SynologyAmber
        "read_only" -> SynologyEmerald
        "deny" -> SynologyRose
        else -> syno.textSecondary
    }
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
                modifier = Modifier.weight(1f).padding(end = 8.dp)
            ) {
                Icon(
                    imageVector = if (access.isGroup) Icons.Default.Group else Icons.Default.Person,
                    contentDescription = null,
                    tint = syno.accentBright
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        access.targetName,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        if (access.isGroup) "Nhóm" else "Người dùng",
                        fontSize = 11.sp,
                        color = syno.textSecondary
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                SynoStatusBadge(
                    text = access.level.replace('_', ' ').uppercase(),
                    color = badgeColor
                )
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(onClick = onDelete, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Xóa", tint = SynologyRose, modifier = Modifier.size(19.dp))
                }
            }
        }
    }
}
