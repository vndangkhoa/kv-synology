package com.khoavo.kvsynology.presentation.packages

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun PackageScreen(
    viewModel: PackageViewModel,
    onOpenDrawer: () -> Unit = {},
    onOpenDocker: () -> Unit = {}
) {
    val packagesState by viewModel.packagesState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trung tâm ứng dụng", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadPackages() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = packagesState) {
            is UiState.Loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            is UiState.Empty -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Không có ứng dụng nào được cài đặt")
            }
            is UiState.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
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
                    items(state.data) { pkg ->
                        PackageRow(
                            pkg = pkg,
                            onToggle = { action -> viewModel.togglePackage(pkg.id, action) },
                            onOpenDocker = if (pkg.isContainerRelated()) onOpenDocker else null
                        )
                    }
                }
            }
        }
    }
}

/** Packages that are really the same service as a Docker screen feature. */
fun PackageItem.isContainerRelated(): Boolean {
    return id.contains("container", ignoreCase = true) ||
        id.contains("docker", ignoreCase = true) ||
        name.contains("container", ignoreCase = true) ||
        name.contains("docker", ignoreCase = true)
}

@Composable
fun PackageRow(
    pkg: PackageItem,
    onToggle: (String) -> Unit,
    onOpenDocker: (() -> Unit)? = null
) {
    val isRunning = pkg.status == "running"
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
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Apps, contentDescription = null, modifier = Modifier.size(32.dp), tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(pkg.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Phiên bản: ${pkg.version} • ${pkg.maintainer}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (isRunning) SynologyEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.outlineVariant
                ) {
                    Text(
                        text = if (isRunning) "Chạy" else "Dừng",
                        color = if (isRunning) SynologyEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                if (onOpenDocker != null) {
                    IconButton(onClick = onOpenDocker) {
                        Icon(
                            imageVector = Icons.Default.Layers,
                            contentDescription = "Mở trong Docker",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                IconButton(onClick = { onToggle(if (isRunning) "stop" else "start") }) {
                    Icon(
                        imageVector = if (isRunning) Icons.Default.Stop else Icons.Default.PlayArrow,
                        contentDescription = if (isRunning) "Dừng" else "Khởi chạy",
                        tint = if (isRunning) SynologyRose else SynologyEmerald
                    )
                }
            }
        }
    }
}
