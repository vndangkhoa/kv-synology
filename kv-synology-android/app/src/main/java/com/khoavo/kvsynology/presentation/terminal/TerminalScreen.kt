package com.khoavo.kvsynology.presentation.terminal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.presentation.i18n.LocalAppStrings
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose

@Composable
fun TerminalScreen(
    viewModel: TerminalViewModel,
    onOpenDrawer: () -> Unit = {}
) {
    val strings = LocalAppStrings.current
    val lines by viewModel.outputLines.collectAsState()
    val sshStatus by viewModel.sshStatus.collectAsState()
    var inputCmd by remember { mutableStateOf("") }
    var showSshDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.dsmTerminal, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFF0D1117))
        ) {
            // SSH connection status bar (shows real host:port state)
            SshStatusBar(
                status = sshStatus,
                onConnectClick = { showSshDialog = true }
            )

            val listState = androidx.compose.foundation.lazy.rememberLazyListState()
            LaunchedEffect(lines.size) {
                if (lines.isNotEmpty()) {
                    listState.animateScrollToItem(lines.size - 1)
                }
            }

            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(lines) { line ->
                    val isPrompt = line.matches(Regex("^\\S+@\\S+:.+\\$ .*"))
                    Text(
                        text = line,
                        color = if (isPrompt) SynologyEmerald else Color(0xFFC9D1D9),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp
                    )
                }
            }

            // Quick Command Chips
            val quickCommands = listOf("ls", "ls -la", "pwd", "whoami", "id", "hostname", "uptime", "docker ps", "df -h", "free -m", "ps", "uname -a", "cat /etc/os-release", "clear")
            androidx.compose.foundation.lazy.LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF161B22))
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(quickCommands) { cmd ->
                    SuggestionChip(
                        onClick = { viewModel.executeCommand(cmd) },
                        label = { Text(cmd, fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = Color.White) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = Color(0xFF21262D)
                        ),
                        border = SuggestionChipDefaults.suggestionChipBorder(
                            borderColor = Color(0xFF30363D),
                            enabled = true
                        )
                    )
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF161B22)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 8.dp, end = 8.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputCmd,
                        onValueChange = { inputCmd = it },
                        placeholder = { Text(strings.typeCommand, color = Color.Gray, fontSize = 13.sp) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = SynologyEmerald,
                            unfocusedBorderColor = Color.DarkGray
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(onClick = {
                        if (inputCmd.isNotBlank()) {
                            viewModel.executeCommand(inputCmd)
                            inputCmd = ""
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = strings.sendCommand, tint = SynologyEmerald)
                    }
                }
            }
        }
    }

    if (showSshDialog) {
        SshConnectDialog(
            initialPort = viewModel.sshPort,
            title = strings.sshDialogTitle,
            passwordLabel = strings.sshPasswordLabel,
            portLabel = strings.sshPortLabel,
            connectLabel = strings.sshConnectBtn,
            cancelLabel = strings.close,
            onDismiss = { showSshDialog = false },
            onConfirm = { password, port ->
                viewModel.connectWithPassword(password, port)
                showSshDialog = false
            }
        )
    }
}

@Composable
private fun SshStatusBar(
    status: SshStatus,
    onConnectClick: () -> Unit
) {
    val strings = LocalAppStrings.current
    val (dotColor, text) = when (status) {
        SshStatus.Checking -> Color.Gray to strings.sshChecking
        SshStatus.Demo -> Color(0xFFBB86FC) to strings.sshDemo
        is SshStatus.Connected -> SynologyEmerald to "${strings.sshConnected}: ${status.user}@${status.host}:${status.port}"
        SshStatus.AuthRequired -> Color(0xFFFFB74D) to "${strings.sshAuthRequired} — ${strings.sshEnableHint}"
        is SshStatus.Unavailable -> SynologyRose to "${strings.sshUnavailable}: ${status.reason}"
    }
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFF161B22)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(dotColor)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = text,
                color = Color(0xFFC9D1D9),
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.weight(1f),
                maxLines = 2
            )
            if (status !is SshStatus.Connected && status !is SshStatus.Demo) {
                IconButton(onClick = onConnectClick, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Key, contentDescription = "SSH", tint = SynologyEmerald)
                }
            }
        }
    }
}

@Composable
private fun SshConnectDialog(
    initialPort: Int,
    title: String,
    passwordLabel: String,
    portLabel: String,
    connectLabel: String,
    cancelLabel: String,
    onDismiss: () -> Unit,
    onConfirm: (String, Int) -> Unit
) {
    var password by remember { mutableStateOf("") }
    var portText by remember { mutableStateOf(initialPort.toString()) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; error = null },
                    label = { Text(passwordLabel) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = portText,
                    onValueChange = { portText = it; error = null },
                    label = { Text(portLabel) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
            }
        },
        confirmButton = {
            Button(onClick = {
                val port = portText.toIntOrNull()
                when {
                    password.isBlank() -> error = passwordLabel
                    port == null || port !in 1..65535 -> error = "$portLabel (1-65535)"
                    else -> onConfirm(password, port)
                }
            }) {
                Text(connectLabel)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text(cancelLabel) }
        }
    )
}
