package com.khoavo.kvsynology.presentation.files

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import com.khoavo.kvsynology.domain.model.FileItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun FileStationScreen(
    viewModel: FileStationViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp
    val snackbarHostState = remember { SnackbarHostState() }

    val currentPath by viewModel.currentPath.collectAsState()
    val filesState by viewModel.filesState.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedFile by viewModel.selectedPreviewFile.collectAsState()
    val shareLink by viewModel.createdShareLink.collectAsState()
    val clipboard by viewModel.clipboard.collectAsState()
    val editingFile by viewModel.editingFile.collectAsState()
    val editingContent by viewModel.editingContent.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()

    var showCreateFolderDialog by remember { mutableStateOf(false) }
    var newFolderName by remember { mutableStateOf("") }

    var itemToRename by remember { mutableStateOf<FileItem?>(null) }
    var renameText by remember { mutableStateOf("") }

    var itemToDelete by remember { mutableStateOf<FileItem?>(null) }

    LaunchedEffect(Unit) {
        viewModel.userMessage.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = "File Station",
                    subtitle = "Duyệt tệp, phát đa phương tiện & chỉnh sửa cấu hình",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        if (clipboard != null) {
                            IconButton(onClick = { viewModel.pasteClipboard() }) {
                                Icon(Icons.Default.ContentPaste, contentDescription = "Dán vào đây", tint = syno.accentBright)
                            }
                        }
                        IconButton(onClick = { showCreateFolderDialog = true }) {
                            Icon(Icons.Default.CreateNewFolder, contentDescription = "Tạo thư mục", tint = syno.textPrimary)
                        }
                        IconButton(onClick = { viewModel.loadDirectory(currentPath) }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Tải lại", tint = syno.textPrimary)
                        }
                    }
                )

                SynoResponsiveContentContainer(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Path Breadcrumb Bar
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = hPad)
                                .border(1.dp, syno.borderSubtle, RoundedCornerShape(10.dp)),
                            shape = RoundedCornerShape(10.dp),
                            color = syno.cardInner
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (currentPath != "/" && currentPath.isNotEmpty()) {
                                    IconButton(
                                        onClick = { viewModel.navigateUp() },
                                        modifier = Modifier.size(30.dp)
                                    ) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowBack,
                                            contentDescription = "Lên thư mục cha",
                                            tint = syno.accentBright,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                } else {
                                    Icon(
                                        Icons.Default.FolderOpen,
                                        contentDescription = null,
                                        tint = SynologyAmber,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Text(
                                    text = currentPath,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.SemiBold,
                                    color = syno.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        SynoSearchBar(
                            value = searchQuery,
                            onValueChange = { viewModel.setSearch(it) },
                            placeholder = "Tìm kiếm tệp trong thư mục...",
                            modifier = Modifier.padding(horizontal = hPad)
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Box(modifier = Modifier.weight(1f)) {
                            when (val state = filesState) {
                                is UiState.Loading -> SynoStateLoading()
                                is UiState.Empty -> SynoStateEmpty(
                                    message = "Thư mục trống",
                                    icon = Icons.Default.FolderOff
                                )
                                is UiState.Error -> SynoStateError(
                                    message = state.message,
                                    onRetry = { viewModel.loadDirectory(currentPath) }
                                )
                                is UiState.Success -> {
                                    val filtered = state.data.filter {
                                        if (searchQuery.isBlank()) true else it.name.contains(searchQuery, ignoreCase = true)
                                    }

                                    if (filtered.isEmpty()) {
                                        SynoStateEmpty(
                                            message = "Không tìm thấy tệp phù hợp",
                                            icon = Icons.Default.SearchOff
                                        )
                                    } else {
                                        LazyColumn(
                                            modifier = Modifier.fillMaxSize(),
                                            contentPadding = PaddingValues(start = hPad, end = hPad, top = 6.dp, bottom = 96.dp),
                                            verticalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            adaptiveGridItems(
                                                items = filtered,
                                                columns = windowState.cardGridColumns
                                            ) { file ->
                                                FileRowItem(
                                                    file = file,
                                                    onClick = { viewModel.navigateInto(file) },
                                                    onDownload = { viewModel.downloadFile(context, file) },
                                                    onEdit = if (!file.isdir) { { viewModel.startEditing(file) } } else null,
                                                    onCut = { viewModel.cutItem(file) },
                                                    onCopy = { viewModel.copyItem(file) },
                                                    onShareLink = { viewModel.createShareLink(file) },
                                                    onRename = {
                                                        itemToRename = file
                                                        renameText = file.name
                                                    },
                                                    onDelete = { itemToDelete = file }
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (clipboard == null) {
                FloatingActionButton(
                    onClick = { showCreateFolderDialog = true },
                    shape = CircleShape,
                    containerColor = SynologyBlue,
                    contentColor = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Thêm thư mục")
                }
            }

            // Floating Clipboard Action Bar
            AnimatedVisibility(
                visible = clipboard != null,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
                    .widthIn(max = 560.dp),
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
            ) {
                clipboard?.let { clip ->
                    SynoCard(
                        containerColor = syno.chromeSurface,
                        borderColor = syno.accentBright.copy(alpha = 0.45f),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (clip.isCut) Icons.Default.ContentCut else Icons.Default.ContentCopy,
                                    contentDescription = null,
                                    tint = syno.accentBright,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = if (clip.isCut) "Đang cắt: ${clip.item.name}" else "Đang sao chép: ${clip.item.name}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = syno.textPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "Đích: $currentPath",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = syno.textSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Button(
                                    onClick = { viewModel.pasteClipboard() },
                                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White),
                                    shape = RoundedCornerShape(20.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.ContentPaste, contentDescription = null, modifier = Modifier.size(15.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Dán", fontSize = 12.sp)
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                                IconButton(onClick = { viewModel.clearClipboard() }) {
                                    Icon(Icons.Default.Close, contentDescription = "Hủy", tint = syno.textSecondary)
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
                    .padding(bottom = 76.dp, start = 16.dp, end = 16.dp)
            )
        }
    }

    selectedFile?.let { file ->
        FilePreviewDialog(
            file = file,
            streamUrl = viewModel.getStreamUrl(file),
            onDismiss = { viewModel.dismissPreview() },
            onEdit = if (!file.isdir) { {
                viewModel.dismissPreview()
                viewModel.startEditing(file)
            } } else null,
            onDownload = { viewModel.downloadFile(context, file) }
        )
    }

    editingFile?.let { file ->
        FileEditorDialog(
            file = file,
            initialContent = editingContent,
            isSaving = isSaving,
            onSave = { updatedContent -> viewModel.saveEditingContent(updatedContent) },
            onDismiss = { viewModel.cancelEditing() }
        )
    }

    shareLink?.let { link ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissShareDialog() },
            containerColor = syno.chromeSurface,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Link, contentDescription = null, tint = syno.accentBright)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Liên kết chia sẻ", color = syno.textPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column {
                    Text(
                        text = "Liên kết công khai cho:",
                        style = MaterialTheme.typography.bodySmall,
                        color = syno.textSecondary
                    )
                    Text(
                        text = link.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = syno.textPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        color = syno.cardInner,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, syno.borderSubtle),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = link.url,
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                            color = syno.textPrimary,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Row {
                    OutlinedButton(
                        onClick = {
                            val clipboardMgr = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                            clipboardMgr?.setPrimaryClip(ClipData.newPlainText("Share Link", link.url))
                            Toast.makeText(context, "Đã sao chép liên kết vào bộ nhớ tạm", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sao chép")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, link.name)
                                putExtra(Intent.EXTRA_TEXT, link.url)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Chia sẻ liên kết qua:"))
                        },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Chia sẻ")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.dismissShareDialog() }) {
                    Text("Đóng")
                }
            }
        )
    }

    if (showCreateFolderDialog) {
        AlertDialog(
            onDismissRequest = { showCreateFolderDialog = false },
            containerColor = syno.chromeSurface,
            title = { Text("Tạo thư mục mới", color = syno.textPrimary, fontWeight = FontWeight.Bold) },
            text = {
                OutlinedTextField(
                    value = newFolderName,
                    onValueChange = { newFolderName = it },
                    label = { Text("Tên thư mục") },
                    singleLine = true,
                    colors = synoOutlinedTextFieldColors(),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newFolderName.isNotBlank()) {
                            viewModel.createFolder(newFolderName.trim())
                            newFolderName = ""
                            showCreateFolderDialog = false
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                ) {
                    Text("Tạo")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCreateFolderDialog = false }, shape = RoundedCornerShape(24.dp)) {
                    Text("Hủy")
                }
            }
        )
    }

    itemToRename?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToRename = null },
            containerColor = syno.chromeSurface,
            title = { Text("Đổi tên", color = syno.textPrimary, fontWeight = FontWeight.Bold) },
            text = {
                OutlinedTextField(
                    value = renameText,
                    onValueChange = { renameText = it },
                    singleLine = true,
                    colors = synoOutlinedTextFieldColors(),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (renameText.isNotBlank()) {
                            viewModel.renameItem(item, renameText.trim())
                            itemToRename = null
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                ) {
                    Text("Lưu")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { itemToRename = null }, shape = RoundedCornerShape(24.dp)) {
                    Text("Hủy")
                }
            }
        )
    }

    itemToDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToDelete = null },
            containerColor = syno.chromeSurface,
            title = { Text("Xác nhận xóa", color = syno.textPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Bạn có chắc chắn muốn xóa \"${item.name}\" không?", color = syno.textSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteItem(item)
                        itemToDelete = null
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
                ) {
                    Text("Xóa")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { itemToDelete = null }, shape = RoundedCornerShape(24.dp)) {
                    Text("Hủy")
                }
            }
        )
    }
}

@Composable
fun FileRowItem(
    file: FileItem,
    onClick: () -> Unit,
    onDownload: () -> Unit,
    onEdit: (() -> Unit)?,
    onCut: () -> Unit,
    onCopy: () -> Unit,
    onShareLink: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit
) {
    val syno = SynoTheme.colors
    var expandedMenu by remember { mutableStateOf(false) }

    val iconTint = when {
        file.isdir -> SynologyAmber
        file.isVideo -> SynologyRose
        file.isAudio -> SynologyEmerald
        file.isImage -> SynoBlueBright
        else -> SynologyBlueLight
    }
    val iconVec = when {
        file.isdir -> Icons.Default.Folder
        file.isVideo -> Icons.Default.Videocam
        file.isAudio -> Icons.Default.AudioFile
        file.isImage -> Icons.Default.Image
        else -> Icons.Outlined.InsertDriveFile
    }

    SynoCard(
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(iconTint.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = iconVec,
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(21.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f).padding(end = 6.dp)) {
                    Text(
                        text = file.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = if (file.isdir) "Thư mục" else "${file.size / 1024} KB",
                        style = MaterialTheme.typography.labelSmall,
                        color = syno.textSecondary
                    )
                }
            }

            Box {
                IconButton(onClick = { expandedMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Tùy chọn", tint = syno.textSecondary)
                }
                DropdownMenu(
                    expanded = expandedMenu,
                    onDismissRequest = { expandedMenu = false },
                    containerColor = syno.chromeSurface
                ) {
                    if (!file.isdir) {
                        DropdownMenuItem(
                            text = { Text("Tải xuống") },
                            onClick = {
                                expandedMenu = false
                                onDownload()
                            },
                            leadingIcon = { Icon(Icons.Default.Download, contentDescription = null, tint = syno.accentBright) }
                        )
                        if (onEdit != null) {
                            DropdownMenuItem(
                                text = { Text("Chỉnh sửa nội dung") },
                                onClick = {
                                    expandedMenu = false
                                    onEdit()
                                },
                                leadingIcon = { Icon(Icons.Default.EditNote, contentDescription = null) }
                            )
                        }
                        DropdownMenuItem(
                            text = { Text("Chia sẻ liên kết DSM") },
                            onClick = {
                                expandedMenu = false
                                onShareLink()
                            },
                            leadingIcon = { Icon(Icons.Default.Link, contentDescription = null) }
                        )
                        HorizontalDivider(color = syno.borderSubtle)
                    }

                    DropdownMenuItem(
                        text = { Text("Cắt") },
                        onClick = {
                            expandedMenu = false
                            onCut()
                        },
                        leadingIcon = { Icon(Icons.Default.ContentCut, contentDescription = null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Sao chép") },
                        onClick = {
                            expandedMenu = false
                            onCopy()
                        },
                        leadingIcon = { Icon(Icons.Default.ContentCopy, contentDescription = null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Đổi tên") },
                        onClick = {
                            expandedMenu = false
                            onRename()
                        },
                        leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) }
                    )
                    HorizontalDivider(color = syno.borderSubtle)
                    DropdownMenuItem(
                        text = { Text("Xóa", color = SynologyRose) },
                        onClick = {
                            expandedMenu = false
                            onDelete()
                        },
                        leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = SynologyRose) }
                    )
                }
            }
        }
    }
}
