package com.khoavo.kvsynology.presentation.login

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.ConnectionConfig
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.common.UiState
import com.khoavo.kvsynology.presentation.components.SynoAmbientBackground
import com.khoavo.kvsynology.presentation.components.SynoBrandMark
import com.khoavo.kvsynology.presentation.components.SynoCard
import com.khoavo.kvsynology.presentation.components.SynoStatusBadge
import com.khoavo.kvsynology.presentation.components.synoOutlinedTextFieldColors
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLoginSuccess: () -> Unit
) {
    val host by viewModel.host.collectAsState()
    val port by viewModel.port.collectAsState()
    val https by viewModel.https.collectAsState()
    val account by viewModel.account.collectAsState()
    val password by viewModel.password.collectAsState()
    val otp by viewModel.otp.collectAsState()
    val ignoreCert by viewModel.ignoreCert.collectAsState()
    val isDemo by viewModel.isDemo.collectAsState()
    val rememberLogin by viewModel.rememberLogin.collectAsState()
    val saveFeedback by viewModel.saveFeedback.collectAsState()

    val loginState by viewModel.loginState.collectAsState()
    val profiles by viewModel.savedProfiles.collectAsState()

    var showPassword by remember { mutableStateOf(false) }
    var showClearAllDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current

    LaunchedEffect(saveFeedback) {
        saveFeedback?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.consumeSaveFeedback()
        }
    }

    LaunchedEffect(loginState) {
        if (loginState is UiState.Success) {
            onLoginSuccess()
        }
    }

    SynoAmbientBackground {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
        ) {
            if (windowState.isTwoPane) {
                val hingeGap = if (windowState.isBook && windowState.hingeWidthDp > 0f) {
                    windowState.hingeWidthDp.dp + 16.dp
                } else {
                    24.dp
                }
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = windowState.contentHorizontalPaddingDp.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left Hero Pane
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(end = 8.dp),
                        verticalArrangement = Arrangement.Center
                    ) {
                        SynoBrandMark(size = 72.dp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "KV Synology",
                            style = SynoDisplay01.copy(color = syno.textPrimary)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Quản trị Synology DSM chuyên nghiệp trên điện thoại, màn hình gập & máy tính bảng",
                            style = SynoSubtitle01.copy(color = syno.textSecondary)
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            LoginFeaturePill("Theo dõi CPU, RAM, Nhiệt độ & S.M.A.R.T thời gian thực")
                            LoginFeaturePill("File Station: Phát Video/Nhạc, xem Ảnh & Sửa mã nguồn")
                            LoginFeaturePill("Container Manager (Docker) & Download Station")
                            LoginFeaturePill("Tường lửa, Reverse Proxy, Terminal SSH & Trợ lý AI")
                        }
                    }

                    Spacer(modifier = Modifier.width(hingeGap))

                    // Right Form Pane
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .widthIn(max = 480.dp)
                                .verticalScroll(rememberScrollState())
                        ) {
                            LoginFormCard(
                                host = host,
                                port = port,
                                https = https,
                                account = account,
                                password = password,
                                otp = otp,
                                ignoreCert = ignoreCert,
                                isDemo = isDemo,
                                rememberLogin = rememberLogin,
                                showPassword = showPassword,
                                loginState = loginState,
                                profiles = profiles,
                                onToggleShowPassword = { showPassword = !showPassword },
                                onRequestClearAll = { showClearAllDialog = true },
                                viewModel = viewModel
                            )
                        }
                    }
                }
            } else {
                // Compact Phone Layout
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    SynoBrandMark(size = 52.dp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "KV Synology",
                        style = SynoDisplay01.copy(color = syno.textPrimary)
                    )
                    Text(
                        text = "Native Android Edition",
                        style = SynoSubtitle01.copy(color = syno.textSecondary)
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 480.dp)
                    ) {
                        LoginFormCard(
                            host = host,
                            port = port,
                            https = https,
                            account = account,
                            password = password,
                            otp = otp,
                            ignoreCert = ignoreCert,
                            isDemo = isDemo,
                            rememberLogin = rememberLogin,
                            showPassword = showPassword,
                            loginState = loginState,
                            profiles = profiles,
                            onToggleShowPassword = { showPassword = !showPassword },
                            onRequestClearAll = { showClearAllDialog = true },
                            viewModel = viewModel
                        )
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

    if (showClearAllDialog) {
        AlertDialog(
            onDismissRequest = { showClearAllDialog = false },
            containerColor = syno.chromeSurface,
            title = { Text("Xóa toàn bộ máy chủ đã lưu?", fontWeight = FontWeight.Bold, color = syno.textPrimary) },
            text = { Text("Thao tác này sẽ xóa tất cả danh sách máy chủ và thông tin đăng nhập đã lưu khỏi thiết bị.", color = syno.textSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.clearAllSavedLogins()
                        showClearAllDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyRose, contentColor = Color.White),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Xóa tất cả")
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showClearAllDialog = false },
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Hủy")
                }
            }
        )
    }
}

@Composable
private fun LoginFeaturePill(text: String) {
    val syno = SynoTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(syno.card)
            .border(1.dp, syno.borderSubtle, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = SynologyBlueLight,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = text,
            fontSize = 13.sp,
            color = syno.textPrimary
        )
    }
}

@Composable
private fun LoginFormCard(
    host: String,
    port: String,
    https: Boolean,
    account: String,
    password: String,
    otp: String,
    ignoreCert: Boolean,
    isDemo: Boolean,
    rememberLogin: Boolean,
    showPassword: Boolean,
    loginState: UiState<*>,
    profiles: List<ConnectionConfig>,
    onToggleShowPassword: () -> Unit,
    onRequestClearAll: () -> Unit,
    viewModel: LoginViewModel
) {
    val syno = SynoTheme.colors
    val fieldColors = synoOutlinedTextFieldColors()

    SynoCard(contentPadding = PaddingValues(16.dp)) {
        if (loginState is UiState.Error) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = SynologyRose.copy(alpha = 0.16f),
                border = BorderStroke(1.dp, SynologyRose.copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Error",
                        tint = SynologyRose
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = loginState.message,
                        color = syno.textPrimary,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
        }

        if (profiles.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Máy chủ đã lưu (${profiles.size})",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = syno.textPrimary
                )
                TextButton(
                    onClick = onRequestClearAll,
                    modifier = Modifier.height(28.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                ) {
                    Icon(
                        Icons.Default.DeleteOutline,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SynologyRose
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Xóa tất cả", fontSize = 12.sp, color = SynologyRose)
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(profiles) { prof ->
                    val selected = host == prof.host
                    Surface(
                        onClick = { viewModel.selectProfile(prof) },
                        shape = RoundedCornerShape(8.dp),
                        color = if (selected) syno.accentDim else syno.chipUnselectedBg,
                        border = BorderStroke(1.dp, if (selected) syno.accentBright else syno.borderSubtle)
                    ) {
                        Row(
                            modifier = Modifier.padding(start = 10.dp, end = 4.dp, top = 5.dp, bottom = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = prof.host,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                color = if (selected) syno.accentBright else syno.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(
                                onClick = { viewModel.deleteProfile(prof) },
                                modifier = Modifier.size(20.dp)
                            ) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Xóa máy chủ",
                                    tint = syno.textSecondary,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        OutlinedTextField(
            value = host,
            onValueChange = { viewModel.host.value = it },
            label = { Text("Địa chỉ NAS hoặc QuickConnect ID") },
            leadingIcon = { Icon(Icons.Default.Lan, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = fieldColors,
            shape = RoundedCornerShape(10.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = port,
                onValueChange = { viewModel.port.value = it },
                label = { Text("Cổng") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                colors = fieldColors,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(10.dp)
            )

            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp)
                    .border(1.dp, syno.borderStrong, RoundedCornerShape(10.dp)),
                shape = RoundedCornerShape(10.dp),
                color = syno.cardInner
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("HTTPS", fontWeight = FontWeight.SemiBold, color = syno.textPrimary, fontSize = 13.sp)
                    Switch(
                        checked = https,
                        onCheckedChange = {
                            viewModel.https.value = it
                            if (port == "5000" && it) viewModel.port.value = "5001"
                            if (port == "5001" && !it) viewModel.port.value = "5000"
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = account,
            onValueChange = { viewModel.account.value = it },
            label = { Text("Tài khoản DSM") },
            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = fieldColors,
            shape = RoundedCornerShape(10.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { viewModel.password.value = it },
            label = { Text("Mật khẩu") },
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
            trailingIcon = {
                IconButton(onClick = onToggleShowPassword) {
                    Icon(
                        imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = null
                    )
                }
            },
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = fieldColors,
            shape = RoundedCornerShape(10.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = otp,
            onValueChange = { viewModel.otp.value = it },
            label = { Text("Mã 2FA / OTP (nếu có)") },
            leadingIcon = { Icon(Icons.Default.VpnKey, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = fieldColors,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(10.dp)
        )

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(34.dp)
                .clip(RoundedCornerShape(8.dp))
                .clickable { viewModel.rememberLogin.value = !rememberLogin },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = rememberLogin,
                onCheckedChange = { viewModel.rememberLogin.value = it }
            )
            Text(
                "Lưu thông tin đăng nhập (Ghi nhớ)",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = syno.textPrimary
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(34.dp)
                .clip(RoundedCornerShape(8.dp))
                .clickable { viewModel.ignoreCert.value = !ignoreCert },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = ignoreCert,
                onCheckedChange = { viewModel.ignoreCert.value = it }
            )
            Text(
                "Bỏ qua lỗi SSL tự ký (Self-signed)",
                style = MaterialTheme.typography.bodySmall,
                color = syno.textSecondary
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Highlighted Demo Mode Pill
        Surface(
            onClick = { viewModel.isDemo.value = !isDemo },
            shape = RoundedCornerShape(10.dp),
            color = if (isDemo) SynologyEmerald.copy(alpha = 0.14f) else syno.cardInner,
            border = BorderStroke(1.dp, if (isDemo) SynologyEmerald.copy(alpha = 0.55f) else syno.borderSubtle),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Checkbox(
                        checked = isDemo,
                        onCheckedChange = { viewModel.isDemo.value = it }
                    )
                    Text(
                        "Chế độ dùng thử Offline (Demo Mode)",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isDemo) SynologyEmerald else syno.textPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
                if (isDemo) {
                    SynoStatusBadge(text = "DEMO", color = SynologyEmerald)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = { viewModel.saveCurrentProfile() },
                modifier = Modifier.weight(1f).height(38.dp),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, syno.borderStrong),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.BookmarkBorder, contentDescription = null, modifier = Modifier.size(15.dp))
                Spacer(modifier = Modifier.width(5.dp))
                Text("Lưu máy chủ", fontSize = 12.sp, color = syno.textPrimary)
            }

            OutlinedButton(
                onClick = { viewModel.clearForm() },
                modifier = Modifier.weight(1f).height(38.dp),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, syno.borderStrong),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.ClearAll, contentDescription = null, modifier = Modifier.size(15.dp))
                Spacer(modifier = Modifier.width(5.dp))
                Text("Xóa trắng form", fontSize = 12.sp, color = syno.textPrimary)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Button(
            onClick = { viewModel.login() },
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp),
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isDemo) SynologyEmerald else SynologyBlue,
                contentColor = Color.White
            ),
            enabled = loginState !is UiState.Loading
        ) {
            if (loginState is UiState.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    text = if (isDemo) "Bắt đầu trải nghiệm Demo" else "Kết nối vào Synology NAS",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}
