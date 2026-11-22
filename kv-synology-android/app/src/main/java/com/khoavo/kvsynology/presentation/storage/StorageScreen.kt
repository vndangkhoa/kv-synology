package com.khoavo.kvsynology.presentation.storage

import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.DriveInfo
import com.khoavo.kvsynology.domain.model.StorageVolume
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun StorageScreen(
    viewModel: StorageViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val volumesState by viewModel.volumesState.collectAsState()
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    SynoAmbientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            SynoScreenTopBar(
                title = "Quản lý lưu trữ",
                subtitle = "Storage Pools, RAID & sức khỏe ổ đĩa",
                onOpenDrawer = onOpenDrawer,
                actions = {
                    IconButton(onClick = { viewModel.loadStorage() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = syno.textPrimary)
                    }
                }
            )

            Box(modifier = Modifier.weight(1f)) {
                when (val state = volumesState) {
                    is UiState.Loading -> SynoStateLoading()
                    is UiState.Empty -> SynoStateEmpty(
                        message = "Không tìm thấy ổ đĩa hoặc dung lượng lưu trữ",
                        icon = Icons.Default.Storage
                    )
                    is UiState.Error -> SynoStateError(
                        message = state.message,
                        onRetry = { viewModel.loadStorage() }
                    )
                    is UiState.Success -> {
                        SynoResponsiveContentContainer {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                items(state.data) { volume ->
                                    VolumeCard(
                                        volume = volume,
                                        driveColumns = windowState.cardGridColumns
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

@Composable
fun VolumeCard(
    volume: StorageVolume,
    driveColumns: Int = 1
) {
    val syno = SynoTheme.colors
    val statusColor = if (volume.usedPercent >= 90) SynologyRose else SynologyEmerald

    SynoCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Text(
                    text = volume.name,
                    style = SynoTitle03.copy(color = syno.textPrimary),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = volume.raidType ?: "RAID",
                    style = MaterialTheme.typography.labelSmall,
                    color = syno.textSecondary
                )
            }
            SynoStatusBadge(text = "Bình thường", color = statusColor)
        }

        Spacer(modifier = Modifier.height(14.dp))

        val usedGB = volume.usedBytes / (1024 * 1024 * 1024)
        val totalGB = volume.totalBytes / (1024 * 1024 * 1024)

        LinearProgressIndicator(
            progress = { (volume.usedPercent / 100f).toFloat().coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = if (volume.usedPercent >= 90) SynologyRose else SynoBlueBright,
            trackColor = syno.cardInner
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "${volume.usedPercent}% Đã sử dụng",
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                color = syno.textPrimary
            )
            Text(
                text = "$usedGB GB / $totalGB GB",
                style = MaterialTheme.typography.labelSmall,
                color = syno.textSecondary
            )
        }

        if (volume.drives.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = syno.borderSubtle)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Ổ đĩa đính kèm (${volume.drives.size})",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = syno.textPrimary
            )
            Spacer(modifier = Modifier.height(10.dp))

            if (driveColumns > 1) {
                val rows = volume.drives.chunked(driveColumns)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    rows.forEach { rowDrives ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            for (i in 0 until driveColumns) {
                                if (i < rowDrives.size) {
                                    Box(modifier = Modifier.weight(1f)) {
                                        DriveItemRow(drive = rowDrives[i])
                                    }
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    volume.drives.forEach { drive ->
                        DriveItemRow(drive = drive)
                    }
                }
            }
        }
    }
}

@Composable
fun DriveItemRow(drive: DriveInfo) {
    val syno = SynoTheme.colors
    val tempColor = when {
        drive.temp >= 55 -> SynologyRose
        drive.temp >= 45 -> SynologyAmber
        else -> SynologyEmerald
    }
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, syno.borderSubtle, RoundedCornerShape(10.dp)),
        shape = RoundedCornerShape(10.dp),
        color = syno.cardInner
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f).padding(end = 8.dp)
            ) {
                Icon(
                    Icons.Default.Storage,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = SynoBlueBright
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = drive.slotName ?: "Slot ${drive.slot}",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = drive.model,
                        fontSize = 11.sp,
                        color = syno.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            SynoStatusBadge(text = "● ${drive.temp}°C", color = tempColor)
        }
    }
}
