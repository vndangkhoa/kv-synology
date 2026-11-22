package com.khoavo.kvsynology.presentation.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ClearAll
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.NotificationItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val notifState by viewModel.notificationsState.collectAsState()
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    SynoAmbientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            SynoScreenTopBar(
                title = "Trung tâm thông báo",
                subtitle = "Cảnh báo hệ thống, bảo mật & dịch vụ DSM",
                onOpenDrawer = onOpenDrawer,
                actions = {
                    IconButton(onClick = { viewModel.clearAll() }) {
                        Icon(Icons.Default.ClearAll, contentDescription = "Xóa tất cả", tint = syno.textPrimary)
                    }
                }
            )

            Box(modifier = Modifier.weight(1f)) {
                when (val state = notifState) {
                    is UiState.Loading -> SynoStateLoading()
                    is UiState.Empty -> SynoStateEmpty(
                        message = "Không có thông báo mới",
                        icon = Icons.Default.NotificationsNone
                    )
                    is UiState.Error -> SynoStateError(message = state.message)
                    is UiState.Success -> {
                        if (state.data.isEmpty()) {
                            SynoStateEmpty(
                                message = "Không có thông báo mới",
                                icon = Icons.Default.NotificationsNone
                            )
                        } else {
                            SynoResponsiveContentContainer {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    adaptiveGridItems(
                                        items = state.data,
                                        columns = windowState.cardGridColumns
                                    ) { item ->
                                        NotificationCard(item = item)
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

@Composable
fun NotificationCard(item: NotificationItem) {
    val syno = SynoTheme.colors
    val levelColor = when (item.level) {
        "success" -> SynologyEmerald
        "warning" -> SynologyAmber
        "error" -> SynologyRose
        else -> SynoBlueBright
    }

    SynoCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Notifications,
                contentDescription = null,
                tint = levelColor,
                modifier = Modifier
                    .size(22.dp)
                    .padding(top = 2.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    item.displayTitle,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = syno.textPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                if (item.messages.isNotEmpty()) {
                    Text(
                        item.messages.joinToString("\n"),
                        fontSize = 12.sp,
                        color = syno.textSecondary,
                        lineHeight = 17.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
                SynoStatusBadge(text = item.category.uppercase(), color = levelColor)
            }
        }
    }
}
