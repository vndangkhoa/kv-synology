package com.khoavo.kvsynology.presentation.notifications

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.khoavo.kvsynology.domain.model.NotificationItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.SynoCard
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun NotificationsPopup(
    notificationsState: UiState<List<NotificationItem>>,
    onDismiss: () -> Unit,
    onMarkAllRead: () -> Unit,
    onClearAll: () -> Unit,
    onNavigateToFullNotifications: () -> Unit
) {
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(if (windowState.isWide) 0.72f else 0.92f)
                .widthIn(max = 520.dp)
                .fillMaxHeight(0.72f),
            shape = RoundedCornerShape(20.dp),
            color = syno.chromeSurface,
            border = BorderStroke(1.dp, syno.borderStrong)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                val unreadCount = if (notificationsState is UiState.Success) {
                    notificationsState.data.count { !it.read }
                } else 0

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = syno.accentDim,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Notifications,
                                    contentDescription = null,
                                    tint = syno.accentBright,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Thông báo DSM",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = syno.textPrimary
                            )
                            if (unreadCount > 0) {
                                Text(
                                    text = "$unreadCount thông báo chưa đọc",
                                    fontSize = 11.sp,
                                    color = SynologyAmber,
                                    fontWeight = FontWeight.SemiBold
                                )
                            } else {
                                Text(
                                    text = "Đã cập nhật",
                                    fontSize = 11.sp,
                                    color = syno.textSecondary
                                )
                            }
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (unreadCount > 0) {
                            IconButton(onClick = onMarkAllRead, modifier = Modifier.size(32.dp)) {
                                Icon(
                                    Icons.Default.DoneAll,
                                    contentDescription = "Đã đọc tất cả",
                                    tint = SynologyEmerald,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                        IconButton(onClick = onClearAll, modifier = Modifier.size(32.dp)) {
                            Icon(
                                Icons.Default.DeleteSweep,
                                contentDescription = "Xóa tất cả",
                                tint = SynologyRose,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Đóng",
                                tint = syno.textSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                HorizontalDivider(color = syno.borderSubtle)

                Box(modifier = Modifier.weight(1f)) {
                    when (notificationsState) {
                        is UiState.Loading -> {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = syno.accentBright, modifier = Modifier.size(32.dp))
                            }
                        }
                        is UiState.Empty -> {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.NotificationsNone, contentDescription = null, tint = syno.textSecondary, modifier = Modifier.size(44.dp))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text("Không có thông báo mới nào", color = syno.textSecondary, fontSize = 13.sp)
                                }
                            }
                        }
                        is UiState.Error -> {
                            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                                Text(notificationsState.message, color = SynologyRose, fontSize = 12.sp)
                            }
                        }
                        is UiState.Success -> {
                            if (notificationsState.data.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.NotificationsNone, contentDescription = null, tint = syno.textSecondary, modifier = Modifier.size(44.dp))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Không có thông báo nào", color = syno.textSecondary, fontSize = 13.sp)
                                    }
                                }
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(notificationsState.data) { item ->
                                        PopupNotificationItem(item = item)
                                    }
                                }
                            }
                        }
                    }
                }

                HorizontalDivider(color = syno.borderSubtle)

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = syno.chromeSurface
                ) {
                    TextButton(
                        onClick = onNavigateToFullNotifications,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Text("Xem tất cả trong trang Thông báo", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = syno.accentBright)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp), tint = syno.accentBright)
                    }
                }
            }
        }
    }
}

@Composable
private fun PopupNotificationItem(item: NotificationItem) {
    val syno = SynoTheme.colors
    val indicatorColor = when (item.level.lowercase()) {
        "warning" -> SynologyAmber
        "error", "danger" -> SynologyRose
        "success" -> SynologyEmerald
        else -> SynoBlueBright
    }

    SynoCard(
        containerColor = if (item.read) syno.cardInner.copy(alpha = 0.65f) else syno.card,
        contentPadding = PaddingValues(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                shape = CircleShape,
                color = indicatorColor.copy(alpha = 0.16f),
                modifier = Modifier
                    .size(28.dp)
                    .padding(top = 2.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = when (item.level.lowercase()) {
                            "warning" -> Icons.Default.Warning
                            "error", "danger" -> Icons.Default.Error
                            "success" -> Icons.Default.CheckCircle
                            else -> Icons.Default.Info
                        },
                        contentDescription = null,
                        tint = indicatorColor,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.title,
                        fontWeight = if (item.read) FontWeight.Normal else FontWeight.Bold,
                        fontSize = 13.sp,
                        color = syno.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (!item.read) {
                        Surface(
                            shape = CircleShape,
                            color = SynologyAmber,
                            modifier = Modifier.size(7.dp)
                        ) {}
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                val messageText = item.messages.joinToString(" ").ifBlank { item.displayTitle }
                Text(
                    text = messageText,
                    fontSize = 11.sp,
                    color = syno.textSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 15.sp
                )
            }
        }
    }
}
