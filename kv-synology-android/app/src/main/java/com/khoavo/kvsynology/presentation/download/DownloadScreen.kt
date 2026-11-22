package com.khoavo.kvsynology.presentation.download

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DownloadTask
import com.khoavo.kvsynology.domain.model.DownloadTaskStatus
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun DownloadScreen(
    viewModel: DownloadViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

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

    val filterOptions = listOf(
        null to strings.all,
        DownloadTaskStatus.DOWNLOADING to strings.downloading,
        DownloadTaskStatus.PAUSED to strings.paused,
        DownloadTaskStatus.FINISHED to strings.finished
    )

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = strings.downloadStation,
                    subtitle = "Quản lý tác vụ tải torrent, HTTP & magnet",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { showAddTaskDialog = true }) {
                            Icon(Icons.Default.Add, contentDescription = strings.addDownloadTask, tint = syno.accentBright)
                        }
                        IconButton(onClick = { viewModel.loadTasks() }) {
                            Icon(Icons.Default.Refresh, contentDescription = strings.refresh, tint = syno.textPrimary)
                        }
                    }
                )

                // Scrollable filter chip row (prevents overflow/clipping on narrow screens)
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = hPad, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filterOptions) { (status, label) ->
                        SynoFilterChip(
                            label = label,
                            selected = filterStatus == status,
                            onClick = { viewModel.setFilter(status) }
                        )
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    when (val state = tasksState) {
                        is UiState.Loading -> SynoStateLoading()
                        is UiState.Empty -> SynoStateEmpty(
                            message = "Không có tác vụ tải xuống nào",
                            icon = Icons.Default.Download
                        )
                        is UiState.Error -> SynoStateError(
                            message = state.message,
                            onRetry = { viewModel.loadTasks() }
                        )
                        is UiState.Success -> {
                            val filtered = state.data.filter {
                                filterStatus == null || it.status == filterStatus
                            }
                            if (filtered.isEmpty()) {
                                SynoStateEmpty(
                                    message = "Không có tác vụ khớp bộ lọc",
                                    icon = Icons.Default.DownloadDone
                                )
                            } else {
                                SynoResponsiveContentContainer {
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                        verticalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        adaptiveGridItems(
                                            items = filtered,
                                            columns = windowState.cardGridColumns
                                        ) { task ->
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
                }
            }

            FloatingActionButton(
                onClick = { showAddTaskDialog = true },
                shape = CircleShape,
                containerColor = SynologyBlue,
                contentColor = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = strings.addDownloadTask)
            }
        }
    }

    if (showAddTaskDialog) {
        val fieldColors = synoOutlinedTextFieldColors()
        AlertDialog(
            onDismissRequest = {
                showAddTaskDialog = false
                selectedFileName = null
                newTaskUrl = ""
            },
            containerColor = syno.chromeSurface,
            title = { Text(strings.addDownloadTask, fontWeight = FontWeight.Bold, color = syno.textPrimary) },
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
                        colors = fieldColors,
                        shape = RoundedCornerShape(10.dp),
                        maxLines = 3
                    )

                    if (selectedFileName != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = SynologyBlue.copy(alpha = 0.16f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.AttachFile, contentDescription = null, tint = SynoBlueBright)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Đã chọn tệp: $selectedFileName",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = SynoBlueBright
                                )
                            }
                        }
                    }

                    OutlinedButton(
                        onClick = { filePickerLauncher.launch("*/*") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(strings.selectTorrentFile)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newTaskUrl.isNotBlank()) {
                            viewModel.addTask(newTaskUrl.trim())
                            newTaskUrl = ""
                            selectedFileName = null
                            showAddTaskDialog = false
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                ) {
                    Text(strings.startDownload)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        showAddTaskDialog = false
                        selectedFileName = null
                        newTaskUrl = ""
                    },
                    shape = RoundedCornerShape(24.dp)
                ) {
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
    val syno = SynoTheme.colors
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val destinationFolder = task.destination ?: "/volume1/downloads"
    val fullFilePath = if (destinationFolder.endsWith("/")) "$destinationFolder${task.title}" else "$destinationFolder/${task.title}"

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SynologyEmerald)
                Spacer(modifier = Modifier.width(8.dp))
                Text(strings.completedFileTitle, fontWeight = FontWeight.Bold, color = syno.textPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(task.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = syno.textPrimary)

                SynoCard(containerColor = syno.cardInner, contentPadding = PaddingValues(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(strings.fileSize, fontSize = 12.sp, color = syno.textSecondary)
                        Text("${(task.size / (1024 * 1024))} MB", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = syno.textPrimary)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(strings.status + ":", fontSize = 12.sp, color = syno.textSecondary)
                        Text("${strings.finished} (100%)", fontSize = 12.sp, color = SynologyEmerald, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(strings.fileType, fontSize = 12.sp, color = syno.textSecondary)
                        Text(task.type.uppercase(), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = syno.textPrimary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(color = syno.borderSubtle)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(strings.storageLocation, fontSize = 11.sp, color = syno.textSecondary)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(fullFilePath, fontSize = 12.sp, fontFamily = FontFamily.Monospace, color = syno.textPrimary)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    clipboardManager.setText(AnnotatedString(fullFilePath))
                    Toast.makeText(context, "${strings.copied}: $fullFilePath", Toast.LENGTH_SHORT).show()
                    onDismiss()
                },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(strings.copyPath)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(24.dp)) {
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
    val syno = SynoTheme.colors
    val statusColor = when (task.status) {
        DownloadTaskStatus.DOWNLOADING -> SynoBlueBright
        DownloadTaskStatus.FINISHED -> SynologyEmerald
        DownloadTaskStatus.ERROR -> SynologyRose
        else -> syno.textSecondary
    }
    val statusText = when (task.status) {
        DownloadTaskStatus.DOWNLOADING -> strings.downloading
        DownloadTaskStatus.FINISHED -> strings.finished
        DownloadTaskStatus.PAUSED -> strings.paused
        else -> task.status.name
    }

    SynoCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = task.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = syno.textPrimary,
                modifier = Modifier.weight(1f).padding(end = 8.dp),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            SynoStatusBadge(text = statusText, color = statusColor)
        }

        Spacer(modifier = Modifier.height(10.dp))

        LinearProgressIndicator(
            progress = { (task.progress / 100f).toFloat().coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = statusColor,
            trackColor = syno.cardInner
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
                color = syno.textSecondary
            )
            if (task.status == DownloadTaskStatus.DOWNLOADING) {
                Text(
                    text = "↓ ${task.downloadSpeed / 1024} KB/s",
                    style = MaterialTheme.typography.labelSmall,
                    color = SynoBlueBright,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))
        HorizontalDivider(color = syno.borderSubtle)
        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (task.status == DownloadTaskStatus.FINISHED) {
                TextButton(onClick = onViewFile) {
                    Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp), tint = SynologyEmerald)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(strings.viewCompletedFile, fontSize = 12.sp, color = SynologyEmerald, fontWeight = FontWeight.Bold)
                }
            } else {
                Spacer(modifier = Modifier.weight(1f))
            }

            Row {
                if (task.status == DownloadTaskStatus.DOWNLOADING) {
                    IconButton(onClick = onPause) {
                        Icon(Icons.Default.Pause, contentDescription = strings.paused, tint = syno.textPrimary)
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
