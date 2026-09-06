package com.khoavo.kvsynology.presentation.download

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DownloadTask
import com.khoavo.kvsynology.domain.model.DownloadTaskStatus
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun DownloadScreen(
    viewModel: DownloadViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val tasksState by viewModel.tasksState.collectAsState()
    val filterStatus by viewModel.filterStatus.collectAsState()

    var showAddTaskDialog by remember { mutableStateOf(false) }
    var newTaskUrl by remember { mutableStateOf("") }
    var selectedFileName by remember { mutableStateOf<String?>(null) }
    var inspectedTask by remember { mutableStateOf<DownloadTask?>(null) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val name = it.lastPathSegment?.substringAfterLast("/") ?: "torrent_file.torrent"
            selectedFileName = name
            newTaskUrl = it.toString()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.downloadStation, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { showAddTaskDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = strings.addDownloadTask, tint = SynologyBlue)
                    }
                    IconButton(onClick = { viewModel.loadTasks() }) {
                        Icon(Icons.Default.Refresh, contentDescription = strings.refresh)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddTaskDialog = true },
                containerColor = SynologyBlue
            ) {
                Icon(Icons.Default.Add, contentDescription = strings.addDownloadTask, tint = Color.White)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Filter chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = filterStatus == null,
                    onClick = { viewModel.setFilter(null) },
                    label = { Text(strings.all) }
                )
                FilterChip(
                    selected = filterStatus == DownloadTaskStatus.DOWNLOADING,
                    onClick = { viewModel.setFilter(DownloadTaskStatus.DOWNLOADING) },
                    label = { Text(strings.downloading) }
                )
                FilterChip(
                    selected = filterStatus == DownloadTaskStatus.PAUSED,
                    onClick = { viewModel.setFilter(DownloadTaskStatus.PAUSED) },
                    label = { Text(strings.paused) }
                )
                FilterChip(
                    selected = filterStatus == DownloadTaskStatus.FINISHED,
                    onClick = { viewModel.setFilter(DownloadTaskStatus.FINISHED) },
                    label = { Text(strings.finished) }
                )
            }

            when (val state = tasksState) {
                is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                is UiState.Empty -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Không có tác vụ tải xuống nào")
                }
                is UiState.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
                is UiState.Success -> {
                    val filtered = state.data.filter {
                        filterStatus == null || it.status == filterStatus
                    }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filtered) { task ->
                            DownloadTaskCard(
                                task = task,
                                onPause = { viewModel.toggleTask(task.id, "pause") },
                                onResume = { viewModel.toggleTask(task.id, "resume") },
                                onDelete = { viewModel.toggleTask(task.id, "delete") },
                                onViewFile = { inspectedTask = task }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showAddTaskDialog) {
        AlertDialog(
            onDismissRequest = {
                showAddTaskDialog = false
                selectedFileName = null
                newTaskUrl = ""
            },
            title = { Text(strings.addDownloadTask, fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = newTaskUrl,
                        onValueChange = {
                            newTaskUrl = it
                            selectedFileName = null
                        },
                        label = { Text(strings.enterUrlOrMagnet) },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )

                    if (selectedFileName != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = SynologyBlue.copy(alpha = 0.15f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.AttachFile, contentDescription = null, tint = SynologyBlue)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Đã chọn tệp: $selectedFileName",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = SynologyBlue
                                )
                            }
                        }
                    }

                    OutlinedButton(
                        onClick = {
                            filePickerLauncher.launch("*/*")
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(strings.selectTorrentFile)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (newTaskUrl.isNotBlank()) {
                        viewModel.addTask(newTaskUrl.trim())
                        newTaskUrl = ""
                        selectedFileName = null
                        showAddTaskDialog = false
                    }
                }) {
                    Text(strings.startDownload)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = {
                    showAddTaskDialog = false
                    selectedFileName = null
                    newTaskUrl = ""
                }) {
                    Text(strings.cancel)
                }
            }
        )
    }

    inspectedTask?.let { task ->
        CompletedFileDetailDialog(
            task = task,
            onDismiss = { inspectedTask = null }
        )
    }
}

@Composable
fun CompletedFileDetailDialog(
    task: DownloadTask,
    onDismiss: () -> Unit
) {
    val strings = LocalAppStrings.current
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val destinationFolder = task.destination ?: "/volume1/downloads"
    val fullFilePath = if (destinationFolder.endsWith("/")) "$destinationFolder${task.title}" else "$destinationFolder/${task.title}"

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SynologyEmerald)
                Spacer(modifier = Modifier.width(8.dp))
                Text(strings.completedFileTitle, fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(task.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(strings.fileSize, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${(task.size / (1024 * 1024))} MB", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(strings.status + ":", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${strings.finished} (100%)", fontSize = 12.sp, color = SynologyEmerald, fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(strings.fileType, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(task.type.uppercase(), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                        HorizontalDivider()
                        Text(strings.storageLocation, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(fullFilePath, fontSize = 12.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                clipboardManager.setText(AnnotatedString(fullFilePath))
                Toast.makeText(context, "${strings.copied}: $fullFilePath", Toast.LENGTH_SHORT).show()
                onDismiss()
            }) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(strings.copyPath)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text(strings.close)
            }
        }
    )
}

@Composable
fun DownloadTaskCard(
    task: DownloadTask,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onDelete: () -> Unit,
    onViewFile: () -> Unit = {}
) {
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
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                    maxLines = 2
                )
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = when (task.status) {
                        DownloadTaskStatus.DOWNLOADING -> SynologyBlue.copy(alpha = 0.15f)
                        DownloadTaskStatus.FINISHED -> SynologyEmerald.copy(alpha = 0.15f)
                        else -> MaterialTheme.colorScheme.outlineVariant
                    }
                ) {
                    Text(
                        text = when (task.status) {
                            DownloadTaskStatus.DOWNLOADING -> strings.downloading
                            DownloadTaskStatus.FINISHED -> strings.finished
                            DownloadTaskStatus.PAUSED -> strings.paused
                            else -> task.status.name
                        },
                        color = when (task.status) {
                            DownloadTaskStatus.DOWNLOADING -> SynologyBlue
                            DownloadTaskStatus.FINISHED -> SynologyEmerald
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            LinearProgressIndicator(
                progress = { (task.progress / 100f).toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp),
                color = when (task.status) {
                    DownloadTaskStatus.FINISHED -> SynologyEmerald
                    DownloadTaskStatus.ERROR -> SynologyRose
                    else -> SynologyBlue
                }
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${task.progress.toInt()}% • ${(task.size / (1024 * 1024))} MB",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (task.status == DownloadTaskStatus.DOWNLOADING) {
                    Text(
                        text = "↓ ${task.downloadSpeed / 1024} KB/s",
                        style = MaterialTheme.typography.labelSmall,
                        color = SynologyBlue,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (task.status == DownloadTaskStatus.FINISHED) {
                    TextButton(onClick = onViewFile) {
                        Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(strings.viewCompletedFile, fontSize = 12.sp, color = SynologyEmerald, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }

                Row {
                    if (task.status == DownloadTaskStatus.DOWNLOADING) {
                        IconButton(onClick = onPause) {
                            Icon(Icons.Default.Pause, contentDescription = strings.paused)
                        }
                    } else if (task.status == DownloadTaskStatus.PAUSED) {
                        IconButton(onClick = onResume) {
                            Icon(Icons.Default.PlayArrow, contentDescription = "Tiếp tục", tint = SynologyEmerald)
                        }
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = strings.delete, tint = SynologyRose)
                    }
                }
            }
        }
    }
}
