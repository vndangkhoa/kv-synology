package com.khoavo.kvsynology.presentation.settings

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.BuildConfig
import com.khoavo.kvsynology.domain.model.AppUpdateInfo
import com.khoavo.kvsynology.domain.model.VersionChangelog
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyAmber
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onLogout: () -> Unit,
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
    val strings = LocalAppStrings.current
    val language by viewModel.language.collectAsState()
    val theme by viewModel.theme.collectAsState()
    val expMode by viewModel.experienceMode.collectAsState()
    val isDemo by viewModel.demoMode.collectAsState()
    val showAiBubble by viewModel.showAiBubble.collectAsState()
    val aiModel by viewModel.aiModel.collectAsState()
    val sessionIsDemo by viewModel.sessionIsDemo.collectAsState()
    val sessionHost by viewModel.sessionHost.collectAsState()
    val updateState by viewModel.updateState.collectAsState()

    var showLogoutDialog by remember { mutableStateOf(false) }
    var showChangelogDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.systemSettings, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Language Section
            item {
                Text(strings.languageSetting, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            FilterChip(
                                selected = language == "vi",
                                onClick = { viewModel.setLanguage("vi") },
                                label = { Text("🇻🇳 Tiếng Việt") }
                            )
                            FilterChip(
                                selected = language == "en",
                                onClick = { viewModel.setLanguage("en") },
                                label = { Text("🇬🇧 English") }
                            )
                        }
                    }
                }
            }

            // 2. Theme Section
            item {
                Text(strings.themeSetting, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = theme == "system",
                                onClick = { viewModel.setTheme("system") },
                                label = { Text(strings.themeSystem) }
                            )
                            FilterChip(
                                selected = theme == "light",
                                onClick = { viewModel.setTheme("light") },
                                label = { Text(strings.themeLight) }
                            )
                            FilterChip(
                                selected = theme == "dark",
                                onClick = { viewModel.setTheme("dark") },
                                label = { Text(strings.themeDark) }
                            )
                        }
                    }
                }
            }

            // 3. Experience Mode Section
            item {
                Text(strings.experienceMode, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            FilterChip(
                                selected = expMode == "beginner",
                                onClick = { viewModel.setExperienceMode("beginner") },
                                label = { Text(strings.expBeginner) }
                            )
                            FilterChip(
                                selected = expMode == "advance",
                                onClick = { viewModel.setExperienceMode("advance") },
                                label = { Text(strings.expAdvanced) }
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (expMode == "beginner") strings.expBeginnerDesc else strings.expAdvancedDesc,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // 4. Local AI Assistant (cloud providers removed — local mode only)
            item {
                Text(strings.aiCopilotConfig, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        // AI Bubble Visibility Switch
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(strings.aiChatBubbleToggle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(strings.aiChatBubbleDesc, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = showAiBubble,
                                onCheckedChange = { viewModel.setShowAiBubble(it) }
                            )
                        }

                        HorizontalDivider()

                        // Local mode badge + model
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = SynologyEmerald.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = "💻 ${strings.aiLocalMode}",
                                    color = SynologyEmerald,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    text = aiModel,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                )
                            }
                        }

                        Text(
                            text = strings.aiLocalModeDesc,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 17.sp
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = SynologyEmerald,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = strings.aiLocalReady,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = SynologyEmerald
                            )
                        }
                    }
                }
            }

            // 5. Connection / Session Status (Demo mode toggle switch removed as requested)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Trạng thái phiên làm việc",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                        // Live data-source badge: tells at a glance whether the
                        // numbers on every screen right now are REAL or MOCK.
                        val liveDemo = sessionIsDemo
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = when (liveDemo) {
                                    true -> SynologyAmber.copy(alpha = 0.15f)
                                    false -> SynologyEmerald.copy(alpha = 0.15f)
                                    null -> MaterialTheme.colorScheme.surfaceVariant
                                }
                            ) {
                                Text(
                                    text = when (liveDemo) {
                                        true -> "● DEMO — đang xem dữ liệu mô phỏng"
                                        false -> "● NAS THẬT${if (sessionHost.isNotBlank()) " (${sessionHost})" else ""} — dữ liệu trực tiếp"
                                        null -> "● Chưa đăng nhập"
                                    },
                                    color = when (liveDemo) {
                                        true -> SynologyAmber
                                        false -> SynologyEmerald
                                        null -> MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                        }
                        Text(
                            text = if (liveDemo == true) {
                                "Đang trong chế độ trải nghiệm Demo. Bạn có thể đăng xuất và kết nối với máy chủ Synology NAS thật tại màn hình đăng nhập."
                            } else {
                                "Đang kết nối bảo mật trực tiếp với máy chủ Synology NAS."
                            },
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // 6. App Update & Changelog Section
            item {
                Text("Cập nhật ứng dụng APK", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Phiên bản hiện tại", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("v${BuildConfig.VERSION_NAME}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = SynologyBlue)
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = SynologyEmerald.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = "Đã cài đặt",
                                    color = SynologyEmerald,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Text(
                            text = "Kiểm tra phiên bản APK mới nhất, xem nhật ký cập nhật (Changelog) và tải trực tiếp file cài đặt APK.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 17.sp
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { viewModel.checkForUpdate() },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue),
                                enabled = updateState !is UiState.Loading
                            ) {
                                if (updateState is UiState.Loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = androidx.compose.ui.graphics.Color.White, strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Đang kiểm tra...", fontSize = 12.sp)
                                } else {
                                    Icon(Icons.Default.SystemUpdate, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Kiểm tra APK", fontSize = 12.sp)
                                }
                            }

                            OutlinedButton(
                                onClick = { showChangelogDialog = true },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.HistoryEdu, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Nhật ký (Log)", fontSize = 12.sp)
                            }
                        }

                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://pkg.khoavo.myds.me/package/kvsynology")).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                runCatching { context.startActivity(intent) }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp), tint = SynologyEmerald)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Tải trực tiếp APK (pkg.khoavo.myds.me)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }

            // 7. About & KV Ecosystem Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Surface(
                                modifier = Modifier.size(44.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = SynologyBlue
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Default.Dns,
                                        contentDescription = null,
                                        tint = androidx.compose.ui.graphics.Color.White,
                                        modifier = Modifier.size(26.dp)
                                    )
                                }
                            }
                            Column {
                                Text(
                                    text = "KV Synology Manager",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "Phiên bản v${BuildConfig.VERSION_NAME} • Hệ sinh thái KV",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Text(
                            text = "Ứng dụng quản trị Synology NAS chuyên nghiệp và toàn diện cho Android. Tích hợp giám sát phần cứng thời gian thực, quản lý tệp tin File Station (tải về, chỉnh sửa văn bản, chia sẻ liên kết, cắt, sao chép), quản lý Docker Container, Download Station, cấu hình tường lửa (Firewall Rules), Reverse Proxy và trợ lý AI thông minh tích hợp.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 18.sp
                        )

                        HorizontalDivider()

                        Text(
                            text = "CỔNG KẾT NỐI & HỖ TRỢ",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.primary
                        )

                        // Portal button: https://syno.vndns.net
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://syno.vndns.net")).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                runCatching { context.startActivity(intent) }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(
                                Icons.Default.Public,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = SynologyBlue
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Cổng ứng dụng KV (Portal)",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "https://syno.vndns.net",
                                    fontSize = 11.sp,
                                    color = SynologyBlue
                                )
                            }
                            Icon(
                                Icons.Default.OpenInNew,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // Facebook page button: fb.com/syno.vndns.net
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://fb.com/syno.vndns.net")).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                runCatching { context.startActivity(intent) }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(
                                Icons.Default.ThumbUp,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = SynologyBlue
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Facebook Fanpage",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "fb.com/syno.vndns.net",
                                    fontSize = 11.sp,
                                    color = SynologyBlue
                                )
                            }
                            Icon(
                                Icons.Default.OpenInNew,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // 6. Logout Button
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { showLogoutDialog = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose)
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(strings.logout, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(strings.logoutConfirmTitle) },
            text = { Text(strings.logoutConfirmMsg) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.logout {
                            showLogoutDialog = false
                            onLogout()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose)
                ) {
                    Text(strings.logout)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showLogoutDialog = false }) {
                    Text(strings.cancel)
                }
            }
        )
    }

    // Update Result Dialog
    when (val state = updateState) {
        is UiState.Success -> {
            val info = state.data
            AlertDialog(
                onDismissRequest = { viewModel.dismissUpdateDialog() },
                icon = {
                    Icon(
                        if (info.isUpdateAvailable) Icons.Default.NewReleases else Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = if (info.isUpdateAvailable) SynologyAmber else SynologyEmerald,
                        modifier = Modifier.size(32.dp)
                    )
                },
                title = {
                    Text(
                        text = if (info.isUpdateAvailable) "Đã có bản cập nhật mới!" else "Phiên bản mới nhất",
                        fontWeight = FontWeight.Bold
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Phiên bản hiện tại:", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("v${info.currentVersion}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Bản mới nhất:", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("v${info.latestVersion}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (info.isUpdateAvailable) SynologyAmber else SynologyEmerald)
                        }
                        if (info.releaseDate.isNotBlank()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Ngày phát hành:", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(info.releaseDate, fontSize = 12.sp)
                            }
                        }
                        HorizontalDivider()
                        Text("Điểm nổi bật trong bản v${info.latestVersion}:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        val latestNotes = info.changelog.firstOrNull()?.highlights ?: emptyList()
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            latestNotes.take(4).forEach { note ->
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("•", color = SynologyBlue, fontWeight = FontWeight.Bold)
                                    Text(note, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 15.sp)
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(info.packagePortalUrl)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            runCatching { context.startActivity(intent) }
                            viewModel.dismissUpdateDialog()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = if (info.isUpdateAvailable) SynologyAmber else SynologyBlue)
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (info.isUpdateAvailable) "Tải bản mới" else "Tải lại APK")
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = { viewModel.dismissUpdateDialog() }) {
                        Text("Đóng")
                    }
                }
            )
        }
        is UiState.Error -> {
            AlertDialog(
                onDismissRequest = { viewModel.dismissUpdateDialog() },
                icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = SynologyRose) },
                title = { Text("Lỗi kiểm tra cập nhật") },
                text = { Text(state.message) },
                confirmButton = {
                    Button(onClick = { viewModel.dismissUpdateDialog() }) { Text("Đóng") }
                }
            )
        }
        else -> {}
    }

    // Full Changelog Dialog
    if (showChangelogDialog) {
        AlertDialog(
            onDismissRequest = { showChangelogDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.HistoryEdu, contentDescription = null, tint = SynologyBlue, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Nhật ký thay đổi (Changelog)", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                androidx.compose.foundation.lazy.LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(viewModel.changelogs) { ver ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Phiên bản v${ver.version}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = SynologyBlue
                                    )
                                    Text(
                                        text = ver.releaseDate,
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ver.highlights.forEach { h ->
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("✔", fontSize = 11.sp, color = SynologyEmerald)
                                        Text(h, fontSize = 11.sp, lineHeight = 16.sp)
                                    }
                                }
                                if (ver.details.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    ver.details.forEach { d ->
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Text("–", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(d, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 15.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { showChangelogDialog = false }) {
                    Text("Đóng")
                }
            }
        )
    }
}
