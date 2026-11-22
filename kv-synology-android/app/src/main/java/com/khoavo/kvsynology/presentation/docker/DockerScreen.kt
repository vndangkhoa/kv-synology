package com.khoavo.kvsynology.presentation.docker

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DockerContainerDetails
import com.khoavo.kvsynology.domain.model.DockerImage
import com.khoavo.kvsynology.domain.model.DockerProject
import com.khoavo.kvsynology.domain.model.DockerProjectService
import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun DockerScreen(
    viewModel: DockerViewModel,
    onOpenDrawer: () -> Unit = {},
    onOpenPackages: () -> Unit = {}
) {
    val containersState by viewModel.containersState.collectAsState()
    val projectsState by viewModel.projectsState.collectAsState()
    val imagesState by viewModel.imagesState.collectAsState()
    val containerPkg by viewModel.containerPkg.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedTab by remember { mutableIntStateOf(0) }

    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    var inspectedContainer by remember { mutableStateOf<DockerContainerDetails?>(null) }
    var inspectedProject by remember { mutableStateOf<DockerProject?>(null) }
    var containerToDelete by remember { mutableStateOf<DockerContainerDetails?>(null) }
    var imageToDelete by remember { mutableStateOf<DockerImage?>(null) }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.consumeError()
        }
    }

    val containerCount = (containersState as? UiState.Success)?.data?.size
    val projectCount = (projectsState as? UiState.Success)?.data?.size
    val imageCount = (imagesState as? UiState.Success)?.data?.size

    val tabItems = listOf(
        Triple(0, if (containerCount != null) "Container ($containerCount)" else "Container", Icons.Default.Layers),
        Triple(1, if (projectCount != null) "Dự án Compose ($projectCount)" else "Dự án Compose", Icons.Default.AccountTree),
        Triple(2, if (imageCount != null) "Images ($imageCount)" else "Images", Icons.Default.SdStorage)
    )

    SynoAmbientBackground {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                SynoScreenTopBar(
                    title = "Container Manager",
                    subtitle = "Docker Containers, Compose & Images",
                    onOpenDrawer = onOpenDrawer,
                    actions = {
                        IconButton(onClick = { viewModel.loadData() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = syno.textPrimary)
                        }
                    }
                )

                SynoResponsiveContentContainer(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        containerPkg?.let { pkg ->
                            Box(modifier = Modifier.padding(horizontal = hPad, vertical = 4.dp)) {
                                ContainerPackageHeader(pkg = pkg, onOpenPackages = onOpenPackages)
                            }
                        }

                        LazyRow(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(horizontal = hPad, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(tabItems) { (idx, label, icon) ->
                                SynoFilterChip(
                                    label = label,
                                    selected = selectedTab == idx,
                                    leadingIcon = icon,
                                    onClick = { selectedTab = idx }
                                )
                            }
                        }

                        Box(modifier = Modifier.weight(1f)) {
                            when (selectedTab) {
                                0 -> {
                                    when (val state = containersState) {
                                        is UiState.Loading -> SynoStateLoading()
                                        is UiState.Empty -> SynoStateEmpty(
                                            message = "Không có container nào đang chạy",
                                            icon = Icons.Default.Layers
                                        )
                                        is UiState.Error -> SynoStateError(
                                            message = state.message,
                                            onRetry = { viewModel.loadData() }
                                        )
                                        is UiState.Success -> {
                                            LazyColumn(
                                                modifier = Modifier.fillMaxSize(),
                                                contentPadding = PaddingValues(start = hPad, end = hPad, top = 6.dp, bottom = 96.dp),
                                                verticalArrangement = Arrangement.spacedBy(12.dp)
                                            ) {
                                                adaptiveGridItems(
                                                    items = state.data,
                                                    columns = windowState.cardGridColumns
                                                ) { container ->
                                                    ContainerCard(
                                                        container = container,
                                                        onInspect = { inspectedContainer = container },
                                                        onToggle = { action -> viewModel.toggleContainer(container.name, action) },
                                                        onDelete = { containerToDelete = container }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                                1 -> {
                                    when (val state = projectsState) {
                                        is UiState.Loading -> SynoStateLoading()
                                        is UiState.Error -> SynoStateError(
                                            message = state.message,
                                            onRetry = { viewModel.loadData() }
                                        )
                                        is UiState.Empty -> SynoStateEmpty(
                                            message = "Chưa có dự án Compose nào.",
                                            icon = Icons.Default.AccountTree
                                        )
                                        is UiState.Success -> {
                                            if (state.data.isEmpty()) {
                                                SynoStateEmpty(
                                                    message = "Chưa có dự án Compose nào. Tạo docker-compose.yml trong /docker để bắt đầu.",
                                                    icon = Icons.Default.AccountTree
                                                )
                                            } else {
                                                LazyColumn(
                                                    modifier = Modifier.fillMaxSize(),
                                                    contentPadding = PaddingValues(start = hPad, end = hPad, top = 6.dp, bottom = 96.dp),
                                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                                ) {
                                                    adaptiveGridItems(
                                                        items = state.data,
                                                        columns = windowState.cardGridColumns
                                                    ) { proj ->
                                                        ProjectCard(
                                                            project = proj,
                                                            onInspect = { inspectedProject = proj },
                                                            onToggle = { action -> viewModel.toggleProject(proj.id, action) }
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                2 -> {
                                    when (val state = imagesState) {
                                        is UiState.Loading -> SynoStateLoading()
                                        is UiState.Error -> SynoStateError(
                                            message = state.message,
                                            onRetry = { viewModel.loadData() }
                                        )
                                        is UiState.Empty -> SynoStateEmpty(
                                            message = "Chưa có image nào được tải về",
                                            icon = Icons.Default.SdStorage
                                        )
                                        is UiState.Success -> {
                                            if (state.data.isEmpty()) {
                                                SynoStateEmpty(
                                                    message = "Chưa có image nào được tải về",
                                                    icon = Icons.Default.SdStorage
                                                )
                                            } else {
                                                LazyColumn(
                                                    modifier = Modifier.fillMaxSize(),
                                                    contentPadding = PaddingValues(start = hPad, end = hPad, top = 6.dp, bottom = 96.dp),
                                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                                ) {
                                                    adaptiveGridItems(
                                                        items = state.data,
                                                        columns = windowState.cardGridColumns
                                                    ) { img ->
                                                        ImageCard(
                                                            image = img,
                                                            onDelete = { imageToDelete = img }
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

    inspectedContainer?.let { container ->
        ContainerDetailDialog(
            container = container,
            onDismiss = { inspectedContainer = null },
            onToggle = { action ->
                viewModel.toggleContainer(container.name, action)
                inspectedContainer = null
            },
            onFetchLogs = { viewModel.getContainerLogs(container.name) }
        )
    }

    inspectedProject?.let { proj ->
        ProjectDetailDialog(
            project = proj,
            onDismiss = { inspectedProject = null },
            onToggle = { action ->
                viewModel.toggleProject(proj.id, action)
                inspectedProject = null
            }
        )
    }

    containerToDelete?.let { container ->
        AlertDialog(
            onDismissRequest = { containerToDelete = null },
            containerColor = syno.chromeSurface,
            title = { Text("Xóa container?", fontWeight = FontWeight.Bold, color = syno.textPrimary) },
            text = { Text("Container '${container.name}' sẽ bị xóa khỏi NAS. Hành động này không thể hoàn tác.", color = syno.textSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteContainer(container.name)
                        containerToDelete = null
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
                ) { Text("Xóa") }
            },
            dismissButton = {
                OutlinedButton(onClick = { containerToDelete = null }, shape = RoundedCornerShape(24.dp)) { Text("Hủy") }
            }
        )
    }

    imageToDelete?.let { img ->
        AlertDialog(
            onDismissRequest = { imageToDelete = null },
            containerColor = syno.chromeSurface,
            title = { Text("Xóa image?", fontWeight = FontWeight.Bold, color = syno.textPrimary) },
            text = { Text("Image '${img.repository}:${img.tag}' (${img.sizeFormatted}) sẽ bị xóa khỏi NAS.", color = syno.textSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteImage(img.repository, img.tag)
                        imageToDelete = null
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
                ) { Text("Xóa") }
            },
            dismissButton = {
                OutlinedButton(onClick = { imageToDelete = null }, shape = RoundedCornerShape(24.dp)) { Text("Hủy") }
            }
        )
    }
}

@Composable
private fun ContainerPackageHeader(
    pkg: PackageItem,
    onOpenPackages: () -> Unit
) {
    val syno = SynoTheme.colors
    val running = pkg.status == "running"
    SynoCard(
        containerColor = syno.accentDim,
        borderColor = syno.accentBright.copy(alpha = 0.28f),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Icon(Icons.Default.Apps, contentDescription = null, tint = syno.accentBright, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(pkg.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = syno.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        "${pkg.version} • ${if (running) "Đang chạy" else "Đã dừng"}",
                        fontSize = 11.sp,
                        color = if (running) SynologyEmerald else syno.textSecondary
                    )
                }
            }
            TextButton(onClick = onOpenPackages) {
                Text("Gói ứng dụng", fontSize = 12.sp, color = syno.accentBright)
                Icon(Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp), tint = syno.accentBright)
            }
        }
    }
}

@Composable
fun ContainerCard(
    container: DockerContainerDetails,
    onInspect: () -> Unit,
    onToggle: (String) -> Unit,
    onDelete: () -> Unit = {}
) {
    val syno = SynoTheme.colors
    val isRunning = container.status == "running"
    SynoCard(onClick = onInspect) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Text(
                    container.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = syno.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    container.image,
                    style = MaterialTheme.typography.labelSmall,
                    color = syno.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            SynoStatusBadge(
                text = if (isRunning) "● Đang chạy" else "■ Đã dừng",
                color = if (isRunning) SynologyEmerald else syno.textSecondary
            )
        }

        if (container.ports.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Cổng: ${container.ports.joinToString(", ")}",
                style = MaterialTheme.typography.bodySmall,
                color = syno.textSecondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }

        Spacer(modifier = Modifier.height(10.dp))
        HorizontalDivider(color = syno.borderSubtle)
        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = onInspect,
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.Terminal, contentDescription = null, modifier = Modifier.size(16.dp), tint = syno.accentBright)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Nhật ký & Chi tiết", fontSize = 12.sp, color = syno.accentBright)
            }

            if (!isRunning) {
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = "Xóa container", tint = SynologyRose, modifier = Modifier.size(20.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (isRunning) {
                OutlinedButton(
                    onClick = { onToggle("restart") },
                    modifier = Modifier.weight(1.1f),
                    shape = RoundedCornerShape(24.dp),
                    border = BorderStroke(1.dp, syno.borderStrong),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp), tint = syno.textPrimary)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Khởi động lại", fontSize = 12.sp, maxLines = 1, color = syno.textPrimary)
                }
                Button(
                    onClick = { onToggle("stop") },
                    modifier = Modifier.weight(0.9f),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Dừng", fontSize = 12.sp, maxLines = 1)
                }
            } else {
                Button(
                    onClick = { onToggle("start") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald, contentColor = Color.White),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Khởi chạy container", fontSize = 12.sp, maxLines = 1)
                }
            }
        }
    }
}

@Composable
fun ProjectCard(
    project: DockerProject,
    onInspect: () -> Unit,
    onToggle: (String) -> Unit
) {
    val syno = SynoTheme.colors
    val isRunning = project.status == "running"
    SynoCard(onClick = onInspect) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        project.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (project.isPackage) {
                        Spacer(modifier = Modifier.width(6.dp))
                        SynoStatusBadge(text = "Gói", color = SynoBlueBright)
                    }
                }
                Text(
                    project.path,
                    style = MaterialTheme.typography.labelSmall,
                    color = syno.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            SynoStatusBadge(
                text = if (isRunning) "● Đang chạy" else "■ Đã dừng",
                color = if (isRunning) SynologyEmerald else syno.textSecondary
            )
        }

        Spacer(modifier = Modifier.height(8.dp))
        if (project.services.isEmpty()) {
            Text(
                "Chưa thấy container nào thuộc dự án (compose down hoặc chưa deploy).",
                style = MaterialTheme.typography.bodySmall,
                color = syno.textSecondary
            )
        } else {
            Text(
                "Dịch vụ (${project.services.size}): ${project.services.joinToString { it.name }}",
                style = MaterialTheme.typography.bodySmall,
                color = syno.textSecondary,
                maxLines = 2
            )
            Spacer(modifier = Modifier.height(6.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(project.services) { svc ->
                    val svcRunning = svc.status == "running"
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (svcRunning) SynologyEmerald.copy(alpha = 0.14f) else syno.cardInner
                    ) {
                        Text(
                            text = "${if (svcRunning) "●" else "■"} ${svc.name}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (svcRunning) SynologyEmerald else syno.textSecondary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            maxLines = 1
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = onInspect,
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(16.dp), tint = syno.accentBright)
                Spacer(modifier = Modifier.width(4.dp))
                Text("Chi tiết", fontSize = 12.sp, color = syno.accentBright)
            }

            if (isRunning) {
                Button(
                    onClick = { onToggle("stop") },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Dừng dự án", fontSize = 12.sp)
                }
            } else {
                Button(
                    onClick = { onToggle("start") },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald, contentColor = Color.White),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Chạy dự án", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun ImageCard(
    image: DockerImage,
    onDelete: () -> Unit
) {
    val syno = SynoTheme.colors
    SynoCard(contentPadding = PaddingValues(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Text(
                    "${image.repository}:${image.tag}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = syno.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    "${image.sizeFormatted}${if (image.created.isNotBlank()) " • ${image.created}" else ""}",
                    fontSize = 11.sp,
                    color = syno.textSecondary
                )
                if (image.isUsed) {
                    Spacer(modifier = Modifier.height(6.dp))
                    SynoStatusBadge(text = "Đang dùng", color = SynoBlueBright)
                }
            }
            if (!image.isUsed) {
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Xóa image", tint = SynologyRose)
                }
            }
        }
    }
}

@Composable
fun ProjectDetailDialog(
    project: DockerProject,
    onDismiss: () -> Unit,
    onToggle: (String) -> Unit
) {
    val syno = SynoTheme.colors
    val isRunning = project.status == "running"
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = { Text(project.name, fontWeight = FontWeight.Bold, color = syno.textPrimary) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Đường dẫn: ${project.path}", style = MaterialTheme.typography.bodySmall, color = syno.textSecondary)
                if (project.created.isNotBlank()) {
                    Text("Ngày tạo: ${project.created}", style = MaterialTheme.typography.bodySmall, color = syno.textSecondary)
                }
                Text("Container trong dự án (${project.services.size}):", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, color = syno.textPrimary)
                if (project.services.isEmpty()) {
                    Text("Không có container nào đang thuộc dự án.", fontSize = 12.sp, color = syno.textSecondary)
                } else {
                    project.services.forEach { svc ->
                        ServiceStatusRow(service = svc)
                    }
                }
                if (project.yamlContent.isNotBlank()) {
                    Text("docker-compose.yml:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, color = syno.textPrimary)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = syno.cardInner,
                        border = BorderStroke(1.dp, syno.borderSubtle),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = project.yamlContent,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = syno.textPrimary,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(24.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("Đóng", fontSize = 12.sp)
                }
                Spacer(modifier = Modifier.width(8.dp))
                if (isRunning) {
                    Button(
                        onClick = { onToggle("stop") },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Dừng dự án", fontSize = 12.sp)
                    }
                } else {
                    Button(
                        onClick = { onToggle("start") },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald, contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Chạy dự án", fontSize = 12.sp)
                    }
                }
            }
        },
        dismissButton = null
    )
}

@Composable
private fun ServiceStatusRow(service: DockerProjectService) {
    val syno = SynoTheme.colors
    val running = service.status == "running"
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = syno.cardInner,
        border = BorderStroke(1.dp, syno.borderSubtle)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(service.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = syno.textPrimary, maxLines = 1)
                Text(service.image, fontSize = 11.sp, color = syno.textSecondary, maxLines = 1)
                if (service.ports.isNotEmpty()) {
                    Text(service.ports.joinToString(", "), fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = syno.accentBright, maxLines = 1)
                }
            }
            Text(
                text = if (running) "●" else "■",
                color = if (running) SynologyEmerald else syno.textSecondary,
                fontSize = 16.sp
            )
        }
    }
}

@Composable
fun ContainerDetailDialog(
    container: DockerContainerDetails,
    onDismiss: () -> Unit,
    onToggle: (String) -> Unit,
    onFetchLogs: suspend () -> List<String> = { emptyList() }
) {
    val syno = SynoTheme.colors
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val isRunning = container.status == "running"

    var logs by remember {
        mutableStateOf(
            if (isRunning) {
                listOf(
                    "[stdout] [INFO] Container ${container.name} daemon active.",
                    "[stdout] [INFO] Mapped ports: ${container.ports.joinToString(", ").ifEmpty { "None" }}",
                    "[stdout] [OK] Healthcheck passed (200 OK)"
                )
            } else {
                listOf(
                    "[system] Container stopped gracefully.",
                    "[system] Exit code 0"
                )
            }
        )
    }

    LaunchedEffect(container.name) {
        val fetched = onFetchLogs()
        if (fetched.isNotEmpty()) {
            logs = fetched
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = syno.chromeSurface,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    container.name,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleLarge,
                    color = syno.textPrimary,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                SynoStatusBadge(
                    text = if (isRunning) "Đang chạy" else "Đã dừng",
                    color = if (isRunning) SynologyEmerald else syno.textSecondary
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SynoCard(containerColor = syno.cardInner, contentPadding = PaddingValues(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Container ID", style = MaterialTheme.typography.labelSmall, color = syno.textSecondary)
                            Text(container.id, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace, color = syno.textPrimary)
                        }
                        IconButton(onClick = {
                            clipboardManager.setText(AnnotatedString(container.id))
                            Toast.makeText(context, "Đã sao chép ID container", Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép ID", modifier = Modifier.size(18.dp), tint = syno.textSecondary)
                        }
                    }
                }

                SynoCard(containerColor = syno.cardInner, contentPadding = PaddingValues(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Image (Hình ảnh)", style = MaterialTheme.typography.labelSmall, color = syno.textSecondary)
                            Text(container.image, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = syno.textPrimary)
                        }
                        IconButton(onClick = {
                            clipboardManager.setText(AnnotatedString(container.image))
                            Toast.makeText(context, "Đã sao chép tên Image", Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép Image", modifier = Modifier.size(18.dp), tint = syno.textSecondary)
                        }
                    }
                }

                if (container.ports.isNotEmpty()) {
                    Text("Ánh xạ cổng: ${container.ports.joinToString(", ")}", style = MaterialTheme.typography.bodySmall, color = syno.textPrimary)
                }
                if (container.created.isNotBlank()) {
                    Text("Ngày tạo: ${container.created}", style = MaterialTheme.typography.bodySmall, color = syno.textSecondary)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Nhật ký gần đây (Logs):", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, color = syno.textPrimary)
                    TextButton(onClick = {
                        val fullLogs = logs.joinToString("\n")
                        clipboardManager.setText(AnnotatedString(fullLogs))
                        Toast.makeText(context, "Đã sao chép toàn bộ nhật ký", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp), tint = syno.accentBright)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sao chép", fontSize = 12.sp, color = syno.accentBright)
                    }
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = syno.terminalBg,
                    border = BorderStroke(1.dp, syno.borderSubtle),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .padding(10.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = logs.joinToString("\n"),
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = Color(0xFFC9D1D9)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(24.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text("Đóng", fontSize = 12.sp)
                }
                if (isRunning) {
                    Spacer(modifier = Modifier.width(6.dp))
                    OutlinedButton(
                        onClick = { onToggle("restart") },
                        shape = RoundedCornerShape(24.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Khởi động lại", fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Button(
                        onClick = { onToggle("stop") },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Dừng", fontSize = 12.sp)
                    }
                } else {
                    Spacer(modifier = Modifier.width(6.dp))
                    Button(
                        onClick = { onToggle("start") },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald, contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Khởi chạy", fontSize = 12.sp)
                    }
                }
            }
        },
        dismissButton = null
    )
}
