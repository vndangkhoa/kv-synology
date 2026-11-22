package com.khoavo.kvsynology.presentation.files

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.khoavo.kvsynology.domain.model.FileItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.components.synoOutlinedTextFieldColors
import com.khoavo.kvsynology.presentation.theme.SynoTheme
import com.khoavo.kvsynology.presentation.theme.SynologyBlue

@Composable
fun FileEditorDialog(
    file: FileItem,
    initialContent: String?,
    isSaving: Boolean,
    onSave: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current
    var content by remember(initialContent) { mutableStateOf(initialContent ?: "") }
    var hasChanges by remember { mutableStateOf(false) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(if (windowState.isWide) 0.85f else 0.95f)
                .widthIn(max = 920.dp)
                .fillMaxHeight(0.90f),
            shape = RoundedCornerShape(18.dp),
            color = syno.chromeSurface,
            border = BorderStroke(1.dp, syno.borderStrong)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = file.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = syno.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (hasChanges) {
                                Text(
                                    text = " • Đã sửa",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = syno.accentBright,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                        Text(
                            text = file.path,
                            style = MaterialTheme.typography.labelSmall,
                            color = syno.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Button(
                            onClick = {
                                onSave(content)
                                hasChanges = false
                            },
                            enabled = !isSaving && initialContent != null,
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Đang lưu...")
                            } else {
                                Icon(
                                    Icons.Default.Save,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Lưu")
                            }
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Đóng", tint = syno.textSecondary)
                        }
                    }
                }

                HorizontalDivider(color = syno.borderSubtle)

                if (initialContent == null) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(syno.canvas),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = syno.accentBright)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Đang tải nội dung tệp...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = syno.textSecondary
                            )
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(syno.canvas)
                            .padding(12.dp)
                    ) {
                        OutlinedTextField(
                            value = content,
                            onValueChange = {
                                content = it
                                hasChanges = true
                            },
                            modifier = Modifier.fillMaxSize(),
                            colors = synoOutlinedTextFieldColors(),
                            shape = RoundedCornerShape(12.dp),
                            textStyle = TextStyle(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 13.sp,
                                lineHeight = 18.sp,
                                color = syno.textPrimary
                            ),
                            placeholder = { Text("Nội dung tệp trống...") }
                        )
                    }
                }
            }
        }
    }
}
