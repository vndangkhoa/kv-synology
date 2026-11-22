package com.khoavo.kvsynology.presentation.ai

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.domain.model.ChatMessage
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.components.synoOutlinedTextFieldColors
import com.khoavo.kvsynology.presentation.theme.*

@Composable
fun AiChatBottomSheet(
    viewModel: AiChatViewModel,
    onDismiss: () -> Unit
) {
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    val messages by viewModel.messages.collectAsState()
    val isGenerating by viewModel.isGenerating.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val clipboardManager = LocalClipboardManager.current

    BackHandler(onBack = onDismiss)

    LaunchedEffect(messages.size, isGenerating) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val sheetContent: @Composable (Modifier) -> Unit = { sheetModifier ->
        Surface(
            modifier = sheetModifier,
            color = syno.canvas,
            border = if (windowState.isWide) BorderStroke(1.dp, syno.borderStrong) else null
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .imePadding()
            ) {
                // Header
                Surface(color = syno.chromeSurface) {
                    Column {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                IconButton(onClick = onDismiss) {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = syno.textPrimary)
                                }
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(syno.accentDim),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = syno.accentBright,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Trợ lý AI Cục bộ",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = syno.textPrimary
                                    )
                                    Text(
                                        text = "Local AI • Không cần API key",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = syno.textSecondary
                                    )
                                }
                            }
                            Row {
                                IconButton(onClick = { viewModel.clearHistory() }) {
                                    Icon(Icons.Default.DeleteSweep, contentDescription = "Xóa lịch sử", tint = syno.textSecondary)
                                }
                                IconButton(onClick = onDismiss) {
                                    Icon(Icons.Default.Close, contentDescription = "Đóng", tint = syno.textSecondary)
                                }
                            }
                        }
                        HorizontalDivider(color = syno.borderSubtle)
                    }
                }

                // Messages List
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 12.dp)
                ) {
                    if (messages.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        modifier = Modifier
                                            .size(56.dp)
                                            .clip(CircleShape)
                                            .background(syno.accentDim),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.AutoAwesome,
                                            contentDescription = null,
                                            tint = syno.accentBright,
                                            modifier = Modifier.size(30.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        "Trợ lý AI sẵn sàng hỗ trợ bạn!",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = syno.textPrimary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "Chọn một gợi ý bên dưới hoặc đặt câu hỏi trực tiếp.",
                                        fontSize = 13.sp,
                                        color = syno.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    items(messages) { msg ->
                        ChatBubble(
                            message = msg,
                            onCopy = { clipboardManager.setText(AnnotatedString(msg.content)) }
                        )
                    }

                    if (isGenerating) {
                        item {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 6.dp)
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp,
                                    color = syno.accentBright
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    "Đang phân tích thông số NAS & trả lời...",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = syno.textSecondary
                                )
                            }
                        }
                    }
                }

                // Bottom Input Dock
                Surface(color = syno.chromeSurface) {
                    Column(modifier = Modifier.padding(bottom = 8.dp)) {
                        HorizontalDivider(color = syno.borderSubtle)
                        LazyRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val prompts = listOf(
                                "Chẩn đoán sức khỏe NAS",
                                "Tối ưu hóa RAM",
                                "Bảo mật & Tường lửa",
                                "Quản trị Docker",
                                "Kiểm tra nhiệt độ ổ đĩa",
                                "Tình trạng mạng LAN"
                            )
                            items(prompts) { prompt ->
                                Surface(
                                    onClick = { viewModel.sendMessage(prompt) },
                                    shape = RoundedCornerShape(16.dp),
                                    color = syno.cardInner,
                                    border = BorderStroke(1.dp, syno.borderSubtle)
                                ) {
                                    Text(
                                        text = prompt,
                                        fontSize = 12.sp,
                                        color = syno.textPrimary,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = inputText,
                                onValueChange = { inputText = it },
                                placeholder = { Text("Hỏi trợ lý về DSM, ổ đĩa, Docker...") },
                                modifier = Modifier.weight(1f),
                                colors = synoOutlinedTextFieldColors(),
                                shape = RoundedCornerShape(22.dp),
                                maxLines = 4,
                                singleLine = false
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            IconButton(
                                onClick = {
                                    if (inputText.isNotBlank()) {
                                        val text = inputText
                                        inputText = ""
                                        viewModel.sendMessage(text)
                                    }
                                },
                                enabled = inputText.isNotBlank() && !isGenerating,
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (inputText.isNotBlank() && !isGenerating) SynologyBlue
                                        else syno.cardInner
                                    )
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Send,
                                    contentDescription = "Gửi",
                                    tint = if (inputText.isNotBlank() && !isGenerating) Color.White else syno.textSecondary
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (windowState.isWide) {
        // Foldable & Tablet: sleek docked right-hand side sheet with dimmed backdrop
        Box(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.55f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onDismiss
                    )
            )
            sheetContent(
                Modifier
                    .align(Alignment.CenterEnd)
                    .width(440.dp)
                    .fillMaxHeight()
            )
        }
    } else {
        sheetContent(Modifier.fillMaxSize())
    }
}

@Composable
private fun ChatBubble(
    message: ChatMessage,
    onCopy: () -> Unit = {}
) {
    val syno = SynoTheme.colors
    val isUser = message.role == "user"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(syno.accentDim),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = syno.accentBright,
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 16.dp
            ),
            color = if (isUser) SynologyBlue else syno.card,
            border = if (isUser) null else BorderStroke(1.dp, syno.borderSubtle),
            modifier = Modifier.widthIn(max = 520.dp).fillMaxWidth(0.86f)
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                if (isUser) {
                    Text(
                        text = message.content,
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        lineHeight = 20.sp
                    )
                } else {
                    Text(
                        text = parseMarkdownToAnnotatedString(message.content),
                        color = syno.textPrimary,
                        style = MaterialTheme.typography.bodyMedium,
                        lineHeight = 21.sp
                    )
                }

                if (!isUser) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        IconButton(
                            onClick = onCopy,
                            modifier = Modifier.size(22.dp)
                        ) {
                            Icon(
                                Icons.Default.ContentCopy,
                                contentDescription = "Sao chép",
                                modifier = Modifier.size(14.dp),
                                tint = syno.textSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}

fun parseMarkdownToAnnotatedString(text: String): AnnotatedString {
    return buildAnnotatedString {
        val lines = text.split("\n")
        for ((lineIdx, line) in lines.withIndex()) {
            var trimmed = line

            if (trimmed.startsWith("### ")) {
                trimmed = trimmed.removePrefix("### ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = 15.sp)) {
                    append(trimmed)
                }
            } else if (trimmed.startsWith("## ")) {
                trimmed = trimmed.removePrefix("## ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp)) {
                    append(trimmed)
                }
            } else if (trimmed.startsWith("# ")) {
                trimmed = trimmed.removePrefix("# ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = 17.sp)) {
                    append(trimmed)
                }
            } else {
                if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
                    trimmed = "• " + trimmed.substring(2)
                }

                var cursor = 0
                val pattern = Regex("(\\*\\*([^*]+)\\*\\*)|(`([^`]+)`)")
                val matches = pattern.findAll(trimmed)

                for (match in matches) {
                    if (match.range.first > cursor) {
                        append(trimmed.substring(cursor, match.range.first))
                    }
                    if (match.value.startsWith("**")) {
                        val boldContent = match.groupValues[2]
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                            append(boldContent)
                        }
                    } else if (match.value.startsWith("`")) {
                        val codeContent = match.groupValues[4]
                        withStyle(SpanStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)) {
                            append(codeContent)
                        }
                    }
                    cursor = match.range.last + 1
                }
                if (cursor < trimmed.length) {
                    append(trimmed.substring(cursor))
                }
            }

            if (lineIdx < lines.size - 1) {
                append("\n")
            }
        }
    }
}
