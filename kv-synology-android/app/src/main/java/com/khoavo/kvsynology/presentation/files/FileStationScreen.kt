package com.khoavo.kvsynology.presentation.files

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.FileItem
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.theme.SynologyAmber
import com.khoavo.kvsynology.presentation.theme.SynologyBlue

@Composable
fun FileStationScreen(
    viewModel: FileStationViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
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

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("File Station", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    if (clipboard != null) {
                        IconButton(onClick = { viewModel.pasteClipboard() }) {
                            Icon(Icons.Default.ContentPaste, contentDescription = "Dán vào đây", tint = SynologyBlue)
                        }
                    }
                    IconButton(onClick = { showCreateFolderDialog = true }) {
                        Icon(Icons.Default.CreateNewFolder, contentDescription = "Tạo thư mục")
                    }
                    IconButton(onClick = { viewModel.loadDirectory(currentPath) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Tải lại")
                    }
                }
            )
        },
        floatingActionButton = {
            if (clipboard == null) {
                FloatingActionButton(
                    onClick = { showCreateFolderDialog = true },
                    containerColor = SynologyBlue
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Thêm", tint = androidx.compose.ui.graphics.Color.White)
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Breadcrumbs bar
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (currentPath != "/" && currentPath.isNotEmpty()) {
                            IconButton(
                                onClick = { viewModel.navigateUp() },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Lên thư mục cha")
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = currentPath,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Search input
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.setSearch(it) },
                    placeholder = { Text("Tìm kiếm tệp trong thư mục...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                // Files list
                when (val state = filesState) {
                    is UiState.Loading -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = SynologyBlue)
                        }
                    }
                    is UiState.Empty -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Thư mục trống", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    is UiState.Error -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(state.message, color = MaterialTheme.colorScheme.error)
                        }
                    }
                    is UiState.Success -> {
                        val filtered = state.data.filter {
                            if (searchQuery.isBlank()) true else it.name.contains(searchQuery, ignoreCase = true)
                        }

                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(filtered) { file ->
                                FileRowItem(
                                    file = file,
                                    onClick = { viewModel.navigateInto(file) },
                                    onDownload = { viewModel.downloadFile(context, file) },
                                    onEdit = if (!file.isdir) { { viewModel.startEditing(file) } } else null,
                                    onCut = { viewModel.cutItem(file) },
                                    onCopy = { viewModel.copyItem(file) },
                                    onShareFile = { viewModel.shareFileDirectly(context, file) },
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

            // Floating Clipboard Action Bar
            AnimatedVisibility(
                visible = clipboard != null,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
            ) {
                clipboard?.let { clip ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
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
                                    tint = SynologyBlue,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = if (clip.isCut) "Đang cắt: ${clip.item.name}" else "Đang sao chép: ${clip.item.name}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1
                                    )
                                    Text(
                                        text = "Đích: $currentPath",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1
                                    )
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Button(
                                    onClick = { viewModel.pasteClipboard() },
                                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.ContentPaste, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Dán")
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                IconButton(onClick = { viewModel.clearClipboard() }) {
                                    Icon(Icons.Default.Close, contentDescription = "Hủy", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Media / File Preview Dialog
    selectedFile?.let { file ->
        FilePreviewDialog(
            file = file,
            streamUrl = viewModel.getStreamUrl(file),
            onDismiss = { viewModel.dismissPreview() },
            onEdit = if (!file.isdir) { {
                viewModel.dismissPreview()
                viewModel.startEditing(file)
            } } else null,
            onDownload = { viewModel.downloadFile(context, file) },
            onShare = { viewModel.shareFileDirectly(context, file) }
        )
    }

    // File Editor Dialog
    editingFile?.let { file ->
        FileEditorDialog(
            file = file,
            initialContent = editingContent,
            isSaving = isSaving,
            onSave = { updatedContent -> viewModel.saveEditingContent(updatedContent) },
            onDismiss = { viewModel.cancelEditing() }
        )
    }

    // Share link dialog
    shareLink?.let { link ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissShareDialog() },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Link, contentDescription = null, tint = SynologyBlue)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Liên kết chia sẻ")
                }
            },
            text = {
                Column {
                    Text(
                        text = "Liên kết công khai cho:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = link.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = link.url,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Row {
                    OutlinedButton(onClick = {
                        val clipboardMgr = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                        clipboardMgr?.setPrimaryClip(ClipData.newPlainText("Share Link", link.url))
                        Toast.makeText(context, "Đã sao chép liên kết vào bộ nhớ tạm", Toast.LENGTH_SHORT).show()
                    }) {
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
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue)
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

    // Create Folder Dialog
    if (showCreateFolderDialog) {
        AlertDialog(
            onDismissRequest = { showCreateFolderDialog = false },
            title = { Text("Tạo thư mục mới") },
            text = {
                OutlinedTextField(
                    value = newFolderName,
                    onValueChange = { newFolderName = it },
                    label = { Text("Tên thư mục") },
                    singleLine = true
                )
            },
            confirmButton = {
                Button(onClick = {
                    if (newFolderName.isNotBlank()) {
                        viewModel.createFolder(newFolderName.trim())
                        newFolderName = ""
                        showCreateFolderDialog = false
                    }
                }) {
                    Text("Tạo")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showCreateFolderDialog = false }) {
                    Text("Hủy")
                }
            }
        )
    }

    // Rename Dialog
    itemToRename?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToRename = null },
            title = { Text("Đổi tên") },
            text = {
                OutlinedTextField(
                    value = renameText,
                    onValueChange = { renameText = it },
                    singleLine = true
                )
            },
            confirmButton = {
                Button(onClick = {
                    if (renameText.isNotBlank()) {
                        viewModel.renameItem(item, renameText.trim())
                        itemToRename = null
                    }
                }) {
                    Text("Lưu")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { itemToRename = null }) {
                    Text("Hủy")
                }
            }
        )
    }

    // Delete Confirmation Dialog
    itemToDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToDelete = null },
            title = { Text("Xác nhận xóa") },
            text = { Text("Bạn có chắc chắn muốn xóa \"${item.name}\" không?") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteItem(item)
                        itemToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Xóa")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { itemToDelete = null }) {
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
    onShareFile: () -> Unit,
    onShareLink: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit
) {
    var expandedMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = when {
                        file.isdir -> Icons.Default.Folder
                        file.isVideo -> Icons.Default.Videocam
                        file.isAudio -> Icons.Default.AudioFile
                        file.isImage -> Icons.Default.Image
                        else -> Icons.Outlined.InsertDriveFile
                    },
                    contentDescription = null,
                    tint = if (file.isdir) SynologyAmber else SynologyBlue,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = file.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1
                    )
                    Text(
                        text = if (file.isdir) "Thư mục" else "${file.size / 1024} KB",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Box {
                IconButton(onClick = { expandedMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Tùy chọn")
                }
                DropdownMenu(
                    expanded = expandedMenu,
                    onDismissRequest = { expandedMenu = false }
                ) {
                    if (!file.isdir) {
                        DropdownMenuItem(
                            text = { Text("Tải xuống") },
                            onClick = {
                                expandedMenu = false
                                onDownload()
                            },
                            leadingIcon = { Icon(Icons.Default.Download, contentDescription = null, tint = SynologyBlue) }
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
                            text = { Text("Chia sẻ tệp") },
                            onClick = {
                                expandedMenu = false
                                onShareFile()
                            },
                            leadingIcon = { Icon(Icons.Default.Share, contentDescription = null) }
                        )
                        DropdownMenuItem(
                            text = { Text("Chia sẻ liên kết DSM") },
                            onClick = {
                                expandedMenu = false
                                onShareLink()
                            },
                            leadingIcon = { Icon(Icons.Default.Link, contentDescription = null) }
                        )
                        HorizontalDivider()
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
                    HorizontalDivider()
                    DropdownMenuItem(
                        text = { Text("Xóa", color = MaterialTheme.colorScheme.error) },
                        onClick = {
                            expandedMenu = false
                            onDelete()
                        },
                        leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) }
                    )
                }
            }
        }
    }
}
