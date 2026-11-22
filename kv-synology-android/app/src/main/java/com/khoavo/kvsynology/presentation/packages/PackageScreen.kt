package com.khoavo.kvsynology.presentation.packages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun PackageScreen(
    viewModel: PackageViewModel,
    onOpenDrawer: () -> Unit = {},
    onOpenDocker: () -> Unit = {}
) {
    val packagesState by viewModel.packagesState.collectAsState()
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    SynoAmbientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            SynoScreenTopBar(
                title = "Trung tâm ứng dụng",
                subtitle = "Các gói Synology DSM đã cài đặt",
                onOpenDrawer = onOpenDrawer,
                actions = {
                    IconButton(onClick = { viewModel.loadPackages() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = syno.textPrimary)
                    }
                }
            )

            Box(modifier = Modifier.weight(1f)) {
                when (val state = packagesState) {
                    is UiState.Loading -> SynoStateLoading()
                    is UiState.Empty -> SynoStateEmpty(
                        message = "Không có ứng dụng nào được cài đặt",
                        icon = Icons.Default.Apps
                    )
                    is UiState.Error -> SynoStateError(
                        message = state.message,
                        onRetry = { viewModel.loadPackages() }
                    )
                    is UiState.Success -> {
                        SynoResponsiveContentContainer {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                adaptiveGridItems(
                                    items = state.data,
                                    columns = windowState.cardGridColumns
                                ) { pkg ->
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
        }
    }
}

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
    val syno = SynoTheme.colors
    val isRunning = pkg.status == "running"
    SynoCard(contentPadding = PaddingValues(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f).padding(end = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Apps,
                    contentDescription = null,
                    modifier = Modifier.size(30.dp),
                    tint = syno.accentBright
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        pkg.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "v${pkg.version} • ${pkg.maintainer}",
                        fontSize = 11.sp,
                        color = syno.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                SynoStatusBadge(
                    text = if (isRunning) "Chạy" else "Dừng",
                    color = if (isRunning) SynologyEmerald else syno.textSecondary
                )
                Spacer(modifier = Modifier.width(4.dp))
                if (onOpenDocker != null) {
                    IconButton(onClick = onOpenDocker, modifier = Modifier.size(34.dp)) {
                        Icon(
                            imageVector = Icons.Default.Layers,
                            contentDescription = "Mở trong Docker",
                            tint = syno.accentBright,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                IconButton(onClick = { onToggle(if (isRunning) "stop" else "start") }, modifier = Modifier.size(34.dp)) {
                    Icon(
                        imageVector = if (isRunning) Icons.Default.Stop else Icons.Default.PlayArrow,
                        contentDescription = if (isRunning) "Dừng" else "Khởi chạy",
                        tint = if (isRunning) SynologyRose else SynologyEmerald,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }
    }
}
