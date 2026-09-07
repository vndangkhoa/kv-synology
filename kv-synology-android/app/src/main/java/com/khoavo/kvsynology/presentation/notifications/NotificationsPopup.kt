package com.khoavo.kvsynology.presentation.notifications

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.khoavo.kvsynology.domain.model.NotificationItem
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.theme.SynologyAmber
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun NotificationsPopup(
    notificationsState: UiState<List<NotificationItem>>,
    onDismiss: () -> Unit,
    onMarkAllRead: () -> Unit,
    onClearAll: () -> Unit,
    onNavigateToFullNotifications: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .fillMaxHeight(0.72f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
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
                            color = SynologyBlue.copy(alpha = 0.12f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Notifications,
                                    contentDescription = null,
                                    tint = SynologyBlue,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Thông báo DSM",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
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
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                HorizontalDivider()

                // Body: notifications list
                Box(modifier = Modifier.weight(1f)) {
                    when (notificationsState) {
                        is UiState.Loading -> {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = SynologyBlue, modifier = Modifier.size(32.dp))
                            }
                        }
                        is UiState.Empty -> {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.NotificationsNone, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(44.dp))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text("Không có thông báo mới nào", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                                }
                            }
                        }
                        is UiState.Error -> {
                            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                                Text(notificationsState.message, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                            }
                        }
                        is UiState.Success -> {
                            if (notificationsState.data.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.NotificationsNone, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(44.dp))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Không có thông báo nào", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
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

                HorizontalDivider()

                // Footer button to open full notifications screen
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surface
                ) {
                    TextButton(
                        onClick = onNavigateToFullNotifications,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Text("Xem tất cả trong trang Thông báo", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = SynologyBlue)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp), tint = SynologyBlue)
                    }
                }
            }
        }
    }
}

@Composable
private fun PopupNotificationItem(item: NotificationItem) {
    val indicatorColor = when (item.level.lowercase()) {
        "warning" -> SynologyAmber
        "error", "danger" -> SynologyRose
        "success" -> SynologyEmerald
        else -> SynologyBlue
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (item.read) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                shape = CircleShape,
                color = indicatorColor.copy(alpha = 0.15f),
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
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 15.sp
                )
            }
        }
    }
}
