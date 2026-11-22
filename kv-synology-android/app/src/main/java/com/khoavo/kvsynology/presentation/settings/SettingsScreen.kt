package com.khoavo.kvsynology.presentation.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.BuildConfig
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.*
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onLogout: () -> Unit,
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
    val strings = LocalAppStrings.current
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val hPad = windowState.contentHorizontalPaddingDp.dp

    val language by viewModel.language.collectAsState()
    val theme by viewModel.theme.collectAsState()
    val expMode by viewModel.experienceMode.collectAsState()
    val showAiBubble by viewModel.showAiBubble.collectAsState()
    val aiModel by viewModel.aiModel.collectAsState()
    val sessionIsDemo by viewModel.sessionIsDemo.collectAsState()
    val sessionHost by viewModel.sessionHost.collectAsState()
    val updateState by viewModel.updateState.collectAsState()

    var showLogoutDialog by remember { mutableStateOf(false) }
    var showChangelogDialog by remember { mutableStateOf(false) }

    val cards: List<@Composable () -> Unit> = listOf(
        // 1. Language Card
        {
            SynoCard {
                SettingsCardHeader(icon = Icons.Default.Translate, title = strings.languageSetting)
                Spacer(modifier = Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SynoFilterChip(
                        label = "🇻🇳 Tiếng Việt",
                        selected = language == "vi",
                        onClick = { viewModel.setLanguage("vi") }
                    )
                    SynoFilterChip(
                        label = "🇬🇧 English",
                        selected = language == "en",
                        onClick = { viewModel.setLanguage("en") }
                    )
                }
            }
        },
        // 2. Theme Card
        {
            SynoCard {
                SettingsCardHeader(icon = Icons.Default.Palette, title = strings.themeSetting)
                Spacer(modifier = Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SynoFilterChip(
                        label = strings.themeDark,
                        selected = theme == "dark" || theme == "oled",
                        onClick = { viewModel.setTheme("dark") }
                    )
                    SynoFilterChip(
                        label = strings.themeSystem,
                        selected = theme == "system",
                        onClick = { viewModel.setTheme("system") }
                    )
                    SynoFilterChip(
                        label = strings.themeLight,
                        selected = theme == "light",
                        onClick = { viewModel.setTheme("light") }
                    )
                }
            }
        },
        // 3. Experience Mode Card
        {
            SynoCard {
                SettingsCardHeader(icon = Icons.Default.Tune, title = strings.experienceMode)
                Spacer(modifier = Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SynoFilterChip(
                        label = strings.expBeginner,
                        selected = expMode == "beginner",
                        onClick = { viewModel.setExperienceMode("beginner") }
                    )
                    SynoFilterChip(
                        label = strings.expAdvanced,
                        selected = expMode == "advance",
                        onClick = { viewModel.setExperienceMode("advance") }
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (expMode == "beginner") strings.expBeginnerDesc else strings.expAdvancedDesc,
                    style = MaterialTheme.typography.bodySmall,
                    color = syno.textSecondary
                )
            }
        },
        // 4. Session Status Card
        {
            val liveDemo = sessionIsDemo
            SynoCard {
                SettingsCardHeader(icon = Icons.Default.Dns, title = "Trạng thái phiên làm việc")
                Spacer(modifier = Modifier.height(10.dp))
                SynoStatusBadge(
                    text = when (liveDemo) {
                        true -> "● DEMO — dữ liệu mô phỏng"
                        false -> "● NAS THẬT${if (sessionHost.isNotBlank()) " ($sessionHost)" else ""}"
                        null -> "● Chưa đăng nhập"
                    },
                    color = when (liveDemo) {
                        true -> SynologyAmber
                        false -> SynologyEmerald
                        null -> syno.textSecondary
                    }
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (liveDemo == true) {
                        "Đang trong chế độ trải nghiệm Demo. Bạn có thể đăng xuất và kết nối với máy chủ Synology NAS thật tại màn hình đăng nhập."
                    } else {
                        "Đang kết nối bảo mật trực tiếp với máy chủ Synology NAS."
                    },
                    fontSize = 12.sp,
                    color = syno.textSecondary
                )
            }
        },
        // 5. Local AI Assistant Card
        {
            SynoCard {
                SettingsCardHeader(icon = Icons.Default.AutoAwesome, title = strings.aiCopilotConfig)
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 10.dp)) {
                        Text(strings.aiChatBubbleToggle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = syno.textPrimary)
                        Text(strings.aiChatBubbleDesc, fontSize = 12.sp, color = syno.textSecondary)
                    }
                    Switch(
                        checked = showAiBubble,
                        onCheckedChange = { viewModel.setShowAiBubble(it) }
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))
                HorizontalDivider(color = syno.borderSubtle)
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SynoStatusBadge(text = "💻 ${strings.aiLocalMode}", color = SynologyEmerald)
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = syno.cardInner
                    ) {
                        Text(
                            text = aiModel,
                            fontSize = 11.sp,
                            color = syno.textSecondary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = strings.aiLocalModeDesc,
                    fontSize = 12.sp,
                    color = syno.textSecondary,
                    lineHeight = 17.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SynologyEmerald, modifier = Modifier.size(15.dp))
                    Text(
                        text = strings.aiLocalReady,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = SynologyEmerald
                    )
                }
            }
        },
        // 6. App Update & Changelog Card
        {
            SynoCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SettingsCardHeader(
                        icon = Icons.Default.SystemUpdate,
                        title = "Cập nhật ứng dụng APK",
                        modifier = Modifier.weight(1f)
                    )
                    SynoStatusBadge(text = "v${BuildConfig.VERSION_NAME}", color = SynologyEmerald)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Kiểm tra phiên bản APK mới nhất, xem nhật ký cập nhật và tải trực tiếp từ syno.vndns.net.",
                    fontSize = 12.sp,
                    color = syno.textSecondary,
                    lineHeight = 17.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.checkForUpdate() },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                        enabled = updateState !is UiState.Loading
                    ) {
                        if (updateState is UiState.Loading) {
                            CircularProgressIndicator(modifier = Modifier.size(15.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Đang kiểm...", fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        } else {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Kiểm tra", fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }

                    OutlinedButton(
                        onClick = { showChangelogDialog = true },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        border = BorderStroke(1.dp, syno.borderStrong),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Default.HistoryEdu, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Nhật ký", fontSize = 12.sp, color = syno.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(SettingsViewModel.DIRECT_APK_URL)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        runCatching { context.startActivity(intent) }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    border = BorderStroke(1.dp, syno.borderStrong)
                ) {
                    Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp), tint = SynologyEmerald)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Tải APK trực tiếp (syno.vndns.net)", fontSize = 12.sp, color = syno.textPrimary)
                }
            }
        },
        // 7. About & KV Ecosystem Card
        {
            SynoCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SynoBrandMark(size = 42.dp)
                    Column {
                        Text(
                            text = "KV Synology Manager",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = syno.textPrimary
                        )
                        Text(
                            text = "Phiên bản v${BuildConfig.VERSION_NAME} • Phone / Foldable / Tablet",
                            fontSize = 12.sp,
                            color = syno.textSecondary
                        )
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "Ứng dụng quản trị Synology NAS chuyên nghiệp cho Android. Hỗ trợ màn hình gập & máy tính bảng, giám sát phần cứng thời gian thực, File Station, Docker, Download Station, Firewall, Reverse Proxy và Trợ lý AI.",
                    fontSize = 12.sp,
                    color = syno.textSecondary,
                    lineHeight = 18.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = syno.borderSubtle)
                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "CỔNG KẾT NỐI & HỖ TRỢ",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = syno.accentBright
                )
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://syno.vndns.net")).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        runCatching { context.startActivity(intent) }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, syno.borderSubtle)
                ) {
                    Icon(Icons.Default.Public, contentDescription = null, modifier = Modifier.size(18.dp), tint = syno.accentBright)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Cổng ứng dụng KV (Portal)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = syno.textPrimary)
                        Text("https://syno.vndns.net", fontSize = 11.sp, color = syno.accentBright)
                    }
                    Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(16.dp), tint = syno.textSecondary)
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://fb.com/syno.vndns.net")).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        runCatching { context.startActivity(intent) }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, syno.borderSubtle)
                ) {
                    Icon(Icons.Default.ThumbUp, contentDescription = null, modifier = Modifier.size(18.dp), tint = syno.accentBright)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Facebook Fanpage", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = syno.textPrimary)
                        Text("fb.com/syno.vndns.net", fontSize = 11.sp, color = syno.accentBright)
                    }
                    Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(16.dp), tint = syno.textSecondary)
                }
            }
        }
    )

    SynoAmbientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            SynoScreenTopBar(
                title = strings.systemSettings,
                subtitle = "Giao diện, ngôn ngữ, chế độ & cập nhật ứng dụng",
                onOpenDrawer = onOpenDrawer
            )

            SynoResponsiveContentContainer(
                maxWidth = 1080.dp,
                modifier = Modifier.weight(1f)
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = hPad, end = hPad, top = 8.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    adaptiveGridItems(
                        items = cards,
                        columns = windowState.cardGridColumns
                    ) { renderCard ->
                        renderCard()
                    }

                    item {
                        Spacer(modifier = Modifier.height(4.dp))
                        Button(
                            onClick = { showLogoutDialog = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
                        ) {
                            Icon(Icons.Default.Logout, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(strings.logout, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = syno.chromeSurface,
            title = { Text(strings.logoutConfirmTitle, color = syno.textPrimary, fontWeight = FontWeight.Bold) },
            text = { Text(strings.logoutConfirmMsg, color = syno.textSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.logout {
                            showLogoutDialog = false
                            onLogout()
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White)
                ) {
                    Text(strings.logout)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showLogoutDialog = false }, shape = RoundedCornerShape(24.dp)) {
                    Text(strings.cancel)
                }
            }
        )
    }

    when (val state = updateState) {
        is UiState.Success -> {
            val info = state.data
            AlertDialog(
                onDismissRequest = { viewModel.dismissUpdateDialog() },
                containerColor = syno.chromeSurface,
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
                        fontWeight = FontWeight.Bold,
                        color = syno.textPrimary
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Phiên bản hiện tại:", fontSize = 13.sp, color = syno.textSecondary)
                            Text("v${info.currentVersion}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = syno.textPrimary)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Bản mới nhất:", fontSize = 13.sp, color = syno.textSecondary)
                            Text("v${info.latestVersion}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (info.isUpdateAvailable) SynologyAmber else SynologyEmerald)
                        }
                        if (info.releaseDate.isNotBlank()) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Ngày phát hành:", fontSize = 13.sp, color = syno.textSecondary)
                                Text(info.releaseDate, fontSize = 12.sp, color = syno.textPrimary)
                            }
                        }
                        HorizontalDivider(color = syno.borderSubtle)
                        Text("Điểm nổi bật trong bản v${info.latestVersion}:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = syno.textPrimary)
                        val latestNotes = info.changelog.firstOrNull()?.highlights ?: emptyList()
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            latestNotes.take(4).forEach { note ->
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("•", color = syno.accentBright, fontWeight = FontWeight.Bold)
                                    Text(note, fontSize = 11.sp, color = syno.textSecondary, lineHeight = 15.sp)
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val targetUrl = if (info.isUpdateAvailable) info.apkDownloadUrl else info.packagePortalUrl
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            runCatching { context.startActivity(intent) }
                            viewModel.dismissUpdateDialog()
                        },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (info.isUpdateAvailable) SynologyAmber else SynologyBlue,
                            contentColor = Color.White
                        )
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (info.isUpdateAvailable) "Tải bản mới" else "Mở trang tải")
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = { viewModel.dismissUpdateDialog() }, shape = RoundedCornerShape(24.dp)) {
                        Text("Đóng")
                    }
                }
            )
        }
        is UiState.Error -> {
            AlertDialog(
                onDismissRequest = { viewModel.dismissUpdateDialog() },
                containerColor = syno.chromeSurface,
                icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = SynologyRose) },
                title = { Text("Lỗi kiểm tra cập nhật", color = syno.textPrimary) },
                text = { Text(state.message, color = syno.textSecondary) },
                confirmButton = {
                    Button(onClick = { viewModel.dismissUpdateDialog() }, shape = RoundedCornerShape(24.dp)) { Text("Đóng") }
                }
            )
        }
        else -> {}
    }

    if (showChangelogDialog) {
        AlertDialog(
            onDismissRequest = { showChangelogDialog = false },
            containerColor = syno.chromeSurface,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.HistoryEdu, contentDescription = null, tint = syno.accentBright, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Nhật ký thay đổi", fontWeight = FontWeight.Bold, color = syno.textPrimary)
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(viewModel.changelogs) { ver ->
                        SynoCard(containerColor = syno.cardInner, contentPadding = PaddingValues(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Phiên bản v${ver.version}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = syno.accentBright
                                )
                                Text(
                                    text = ver.releaseDate,
                                    fontSize = 11.sp,
                                    color = syno.textSecondary
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            HorizontalDivider(color = syno.borderSubtle)
                            Spacer(modifier = Modifier.height(6.dp))
                            ver.highlights.forEach { h ->
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(vertical = 2.dp)) {
                                    Text("✔", fontSize = 11.sp, color = SynologyEmerald)
                                    Text(h, fontSize = 11.sp, lineHeight = 16.sp, color = syno.textPrimary)
                                }
                            }
                            if (ver.details.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(2.dp))
                                ver.details.forEach { d ->
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(vertical = 1.dp)) {
                                        Text("–", fontSize = 11.sp, color = syno.textSecondary)
                                        Text(d, fontSize = 11.sp, color = syno.textSecondary, lineHeight = 15.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showChangelogDialog = false },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                ) {
                    Text("Đóng")
                }
            }
        )
    }
}

@Composable
private fun SettingsCardHeader(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    modifier: Modifier = Modifier
) {
    val syno = SynoTheme.colors
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = syno.accentBright,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = title,
            style = SynoTitle03.copy(color = syno.textPrimary),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
