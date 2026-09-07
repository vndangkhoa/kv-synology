package com.khoavo.kvsynology.presentation.docker

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DockerContainerDetails
import com.khoavo.kvsynology.domain.model.DockerImage
import com.khoavo.kvsynology.domain.model.DockerProject
import com.khoavo.kvsynology.domain.model.DockerProjectService
import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

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
                title = { Text("Container Manager", fontWeight = FontWeight.Bold) },
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
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Linked Container Manager package (Package Center ↔ Docker).
            containerPkg?.let { pkg ->
                ContainerPackageHeader(pkg = pkg, onOpenPackages = onOpenPackages)
            }

            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Container") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Dự án (Compose)") }
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = { Text("Images") }
                )
            }

            var inspectedContainer by remember { mutableStateOf<DockerContainerDetails?>(null) }
            var inspectedProject by remember { mutableStateOf<DockerProject?>(null) }
            var containerToDelete by remember { mutableStateOf<DockerContainerDetails?>(null) }
            var imageToDelete by remember { mutableStateOf<DockerImage?>(null) }

            when (selectedTab) {
                0 -> {
                    when (val state = containersState) {
                        is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                        is UiState.Empty -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Không có container nào đang chạy")
                        }
                        is UiState.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(state.message, color = MaterialTheme.colorScheme.error)
                        }
                        is UiState.Success -> {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(state.data) { container ->
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
                        is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                        is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                            Text(state.message, color = MaterialTheme.colorScheme.error)
                        }
                        is UiState.Empty -> Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                            Text("Chưa có dự án Compose nào.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        is UiState.Success -> {
                            if (state.data.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                                    Text(
                                        "Chưa có dự án Compose nào.\nTạo file docker-compose.yml trong /docker trên NAS để bắt đầu.",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 13.sp
                                    )
                                }
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(state.data) { proj ->
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
                        is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                        is UiState.Error -> Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                            Text(state.message, color = MaterialTheme.colorScheme.error)
                        }
                        is UiState.Empty -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Chưa có image nào được tải về")
                        }
                        is UiState.Success -> {
                            if (state.data.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("Chưa có image nào được tải về")
                                }
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(state.data) { img ->
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
                    title = { Text("Xóa container?", fontWeight = FontWeight.Bold) },
                    text = { Text("Container '${container.name}' sẽ bị xóa khỏi NAS. Hành động này không thể hoàn tác.") },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.deleteContainer(container.name)
                                containerToDelete = null
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = SynologyRose)
                        ) { Text("Xóa") }
                    },
                    dismissButton = {
                        OutlinedButton(onClick = { containerToDelete = null }) { Text("Hủy") }
                    }
                )
            }

            imageToDelete?.let { img ->
                AlertDialog(
                    onDismissRequest = { imageToDelete = null },
                    title = { Text("Xóa image?", fontWeight = FontWeight.Bold) },
                    text = { Text("Image '${img.repository}:${img.tag}' (${img.sizeFormatted}) sẽ bị xóa khỏi NAS.") },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.deleteImage(img.repository, img.tag)
                                imageToDelete = null
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = SynologyRose)
                        ) { Text("Xóa") }
                    },
                    dismissButton = {
                        OutlinedButton(onClick = { imageToDelete = null }) { Text("Hủy") }
                    }
                )
            }
        }
    }
}

@Composable
private fun ContainerPackageHeader(
    pkg: PackageItem,
    onOpenPackages: () -> Unit
) {
    val running = pkg.status == "running"
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SynologyBlue.copy(alpha = 0.08f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Icon(Icons.Default.Apps, contentDescription = null, tint = SynologyBlue, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(pkg.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1)
                    Text(
                        "${pkg.version} • ${if (running) "Đang chạy" else "Đã dừng"}",
                        fontSize = 11.sp,
                        color = if (running) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            TextButton(onClick = onOpenPackages) {
                Text("Gói ứng dụng", fontSize = 12.sp)
                Icon(Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
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
    val isRunning = container.status == "running"
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onInspect),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(container.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1)
                    Text(container.image, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isRunning) SynologyEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.outlineVariant
                ) {
                    Text(
                        text = if (isRunning) "● Đang chạy" else "■ Đã dừng",
                        color = if (isRunning) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            if (container.ports.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Cổng: ${container.ports.joinToString(", ")}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onInspect,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.Terminal, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Nhật ký & Chi tiết", fontSize = 12.sp)
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

            // Action buttons row: responsive layout that fits all mobile widths without overflow
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isRunning) {
                    OutlinedButton(
                        onClick = { onToggle("restart") },
                        modifier = Modifier.weight(1.1f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Khởi động lại", fontSize = 12.sp, maxLines = 1)
                    }
                    Button(
                        onClick = { onToggle("stop") },
                        modifier = Modifier.weight(0.9f),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyRose),
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
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald),
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
}

@Composable
fun ProjectCard(
    project: DockerProject,
    onInspect: () -> Unit,
    onToggle: (String) -> Unit
) {
    val isRunning = project.status == "running"
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onInspect),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(project.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1)
                        if (project.isPackage) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(shape = RoundedCornerShape(4.dp), color = SynologyBlue.copy(alpha = 0.12f)) {
                                Text("Gói", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = SynologyBlue, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                    }
                    Text(project.path, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isRunning) SynologyEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.outlineVariant
                ) {
                    Text(
                        text = if (isRunning) "● Đang chạy" else "■ Đã dừng",
                        color = if (isRunning) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            if (project.services.isEmpty()) {
                Text(
                    "Chưa thấy container nào thuộc dự án (compose down hoặc chưa deploy).",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    "Dịch vụ (${project.services.size}): ${project.services.joinToString { it.name }}",
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2
                )
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(project.services) { svc ->
                        val svcRunning = svc.status == "running"
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (svcRunning) SynologyEmerald.copy(alpha = 0.12f)
                            else MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = "${if (svcRunning) "●" else "■"} ${svc.name}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (svcRunning) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
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
                    Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Chi tiết", fontSize = 12.sp)
                }

                if (isRunning) {
                    Button(
                        onClick = { onToggle("stop") },
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyRose),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Dừng dự án", fontSize = 12.sp)
                    }
                } else {
                    Button(
                        onClick = { onToggle("start") },
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald),
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
}

@Composable
fun ImageCard(
    image: DockerImage,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("${image.repository}:${image.tag}", fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    "${image.sizeFormatted}${if (image.created.isNotBlank()) " • ${image.created}" else ""}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (image.isUsed) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(shape = RoundedCornerShape(4.dp), color = SynologyBlue.copy(alpha = 0.12f)) {
                        Text("Đang dùng", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = SynologyBlue, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                    }
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
    val isRunning = project.status == "running"
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(project.name, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Đường dẫn: ${project.path}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (project.created.isNotBlank()) {
                    Text("Ngày tạo: ${project.created}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("Container trong dự án (${project.services.size}):", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                if (project.services.isEmpty()) {
                    Text("Không có container nào đang thuộc dự án.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    project.services.forEach { svc ->
                        ServiceStatusRow(service = svc)
                    }
                }
                if (project.yamlContent.isNotBlank()) {
                    Text("docker-compose.yml:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = project.yamlContent,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
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
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("Đóng", fontSize = 12.sp)
                }
                Spacer(modifier = Modifier.width(8.dp))
                if (isRunning) {
                    Button(
                        onClick = { onToggle("stop") },
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyRose),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Dừng dự án", fontSize = 12.sp)
                    }
                } else {
                    Button(
                        onClick = { onToggle("start") },
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald),
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
    val running = service.status == "running"
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(service.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1)
                Text(service.image, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                if (service.ports.isNotEmpty()) {
                    Text(service.ports.joinToString(", "), fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = SynologyBlue, maxLines = 1)
                }
            }
            Text(
                text = if (running) "●" else "■",
                color = if (running) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
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
    val context = androidx.compose.ui.platform.LocalContext.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
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
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(container.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isRunning) SynologyEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.outlineVariant
                ) {
                    Text(
                        text = if (isRunning) "Đang chạy" else "Đã dừng",
                        color = if (isRunning) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Container ID
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Container ID", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(container.id, style = MaterialTheme.typography.bodySmall, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                        }
                        IconButton(onClick = {
                            clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(container.id))
                            android.widget.Toast.makeText(context, "Đã sao chép ID container", android.widget.Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép ID", modifier = Modifier.size(18.dp))
                        }
                    }
                }

                // Image
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Image (Hình ảnh)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(container.image, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                        }
                        IconButton(onClick = {
                            clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(container.image))
                            android.widget.Toast.makeText(context, "Đã sao chép tên Image", android.widget.Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép Image", modifier = Modifier.size(18.dp))
                        }
                    }
                }

                // Ports & Created
                if (container.ports.isNotEmpty()) {
                    Text("Ánh xạ cổng: ${container.ports.joinToString(", ")}", style = MaterialTheme.typography.bodySmall)
                }
                if (container.created.isNotBlank()) {
                    Text("Ngày tạo: ${container.created}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Logs Header + Copy Logs button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Nhật ký gần đây (Logs):", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    TextButton(onClick = {
                        val fullLogs = logs.joinToString("\n")
                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(fullLogs))
                        android.widget.Toast.makeText(context, "Đã sao chép toàn bộ nhật ký", android.widget.Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sao chép", fontSize = 12.sp)
                    }
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .padding(8.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = logs.joinToString("\n"),
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            fontSize = 11.sp
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
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text("Đóng", fontSize = 12.sp)
                }
                if (isRunning) {
                    Spacer(modifier = Modifier.width(6.dp))
                    OutlinedButton(
                        onClick = { onToggle("restart") },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Khởi động lại", fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Button(
                        onClick = { onToggle("stop") },
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyRose),
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
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyEmerald),
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
