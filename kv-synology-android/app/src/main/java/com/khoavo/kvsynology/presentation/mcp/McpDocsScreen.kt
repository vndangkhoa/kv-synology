package com.khoavo.kvsynology.presentation.mcp

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald

data class McpToolInfo(
    val name: String,
    val category: String,
    val description: String,
    val dsmApi: String,
    val params: String,
    val examplePayload: String
)

@Composable
fun McpDocsScreen(
    onOpenDrawer: () -> Unit = {}
) {
    val context = LocalContext.current
    var selectedCategory by remember { mutableStateOf("all") }
    var searchQuery by remember { mutableStateOf("") }

    val tools = remember {
        listOf(
            McpToolInfo(
                name = "dsm_login",
                category = "auth",
                description = "Xác thực và tạo phiên làm việc an toàn trên Synology DSM (hỗ trợ IP LAN, DDNS, QuickConnect ID, 2FA OTP).",
                dsmApi = "SYNO.API.Auth (v7/auth.cgi)",
                params = "host (string), port (int), account (string), password (string), https (bool)",
                examplePayload = """{"host": "192.168.1.52", "port": 5001, "account": "admin", "https": true}"""
            ),
            McpToolInfo(
                name = "dsm_get_system_info",
                category = "system",
                description = "Truy xuất thông số phần cứng, model máy chủ, số serial, phiên bản DSM, nhiệt độ và CPU.",
                dsmApi = "SYNO.Core.System.info (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            ),
            McpToolInfo(
                name = "dsm_get_utilization",
                category = "system",
                description = "Lấy dữ liệu tải thời gian thực: % CPU, % RAM, lưu lượng mạng RX/TX và tốc độ đọc/ghi ổ đĩa.",
                dsmApi = "SYNO.Core.System.Utilization (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            ),
            McpToolInfo(
                name = "dsm_list_processes",
                category = "system",
                description = "Liệt kê danh sách các tiến trình hệ thống kèm PID, người dùng thực thi, % CPU và RAM.",
                dsmApi = "SYNO.Core.System.Process (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            ),
            McpToolInfo(
                name = "dsm_list_files",
                category = "files",
                description = "Liệt kê danh sách thư mục chia sẻ hoặc cây tệp tin trong đường dẫn chỉ định.",
                dsmApi = "SYNO.FileStation.List (v2/entry.cgi)",
                params = "folder_path (string, ví dụ: '/docker' hoặc '/')",
                examplePayload = """{"folder_path": "/docker"}"""
            ),
            McpToolInfo(
                name = "dsm_create_folder",
                category = "files",
                description = "Tạo thư mục mới trong đường dẫn đích.",
                dsmApi = "SYNO.FileStation.CreateFolder (v2/entry.cgi)",
                params = "folder_path (string), name (string)",
                examplePayload = """{"folder_path": "/docker", "name": "nextcloud"}"""
            ),
            McpToolInfo(
                name = "dsm_list_docker_containers",
                category = "docker",
                description = "Truy xuất danh sách container Docker, trạng thái hoạt động (running/stopped), hình ảnh và ánh xạ cổng.",
                dsmApi = "SYNO.Docker.Container (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            ),
            McpToolInfo(
                name = "dsm_toggle_docker_container",
                category = "docker",
                description = "Khởi chạy (start), tạm dừng (stop), hoặc khởi động lại (restart) container Docker.",
                dsmApi = "SYNO.Docker.Container (v1/entry.cgi)",
                params = "name (string), action ('start' | 'stop' | 'restart')",
                examplePayload = """{"name": "vaultwarden", "action": "restart"}"""
            ),
            McpToolInfo(
                name = "dsm_list_download_tasks",
                category = "download",
                description = "Lấy danh sách các tác vụ tải về trong Download Station cùng tốc độ và tiến độ tải.",
                dsmApi = "SYNO.DownloadStation.Task (v1/entry.cgi)",
                params = "status (string, tùy chọn: 'all' | 'downloading' | 'paused' | 'finished')",
                examplePayload = """{"status": "all"}"""
            ),
            McpToolInfo(
                name = "dsm_get_storage_volumes",
                category = "storage",
                description = "Kiểm tra tình trạng khối lưu trữ (Storage Pools / Volumes), dung lượng trống/đã dùng và trạng thái SMART ổ đĩa.",
                dsmApi = "SYNO.Storage.CGI.Storage (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            ),
            McpToolInfo(
                name = "dsm_get_firewall_rules",
                category = "security",
                description = "Truy xuất cấu hình tường lửa, trạng thái bảo vệ và các quy tắc mở cổng dịch vụ.",
                dsmApi = "SYNO.Core.Security.Firewall (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            ),
            McpToolInfo(
                name = "dsm_get_services",
                category = "services",
                description = "Liệt kê danh sách các dịch vụ mạng (SMB, AFP, NFS, FTP, SSH, WebDAV) và trạng thái bật/tắt.",
                dsmApi = "SYNO.Core.Service (v1/entry.cgi)",
                params = "Không yêu cầu tham số",
                examplePayload = "{}"
            )
        )
    }

    val filteredTools = remember(selectedCategory, searchQuery) {
        tools.filter { tool ->
            val matchesCategory = if (selectedCategory == "all") true else tool.category == selectedCategory
            val matchesSearch = if (searchQuery.isBlank()) true else {
                tool.name.contains(searchQuery, ignoreCase = true) ||
                        tool.description.contains(searchQuery, ignoreCase = true) ||
                        tool.dsmApi.contains(searchQuery, ignoreCase = true)
            }
            matchesCategory && matchesSearch
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tài liệu MCP Tools", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val sampleConfig = """
                        {
                          "mcpServers": {
                            "kv-synology": {
                              "command": "node",
                              "args": ["/path/to/kv-synology/mcp/server.js"],
                              "env": {
                                "SYNOLOGY_HOST": "192.168.1.52",
                                "SYNOLOGY_PORT": "5001",
                                "SYNOLOGY_ACCOUNT": "admin"
                              }
                            }
                          }
                        }
                        """.trimIndent()
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("MCP Config", sampleConfig)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Đã sao chép mẫu cấu hình MCP Server!", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép cấu hình")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Intro Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Code, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Model Context Protocol (MCP)",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Kết nối Synology NAS của bạn với các mô hình AI thông minh (Claude Desktop, Cursor, Antigravity) thông qua giao thức MCP chuẩn mở.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.9f)
                        )
                    }
                }
            }

            // Search Bar
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Tìm kiếm công cụ MCP hoặc WebAPI...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
            }

            // Category Chips
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val categories = listOf(
                        "all" to "Tất cả",
                        "auth" to "Xác thực",
                        "system" to "Hệ thống",
                        "files" to "Tập tin",
                        "docker" to "Docker",
                        "download" to "Tải xuống",
                        "storage" to "Lưu trữ",
                        "security" to "Bảo mật",
                        "services" to "Dịch vụ"
                    )
                    items(categories) { (key, label) ->
                        FilterChip(
                            selected = selectedCategory == key,
                            onClick = { selectedCategory = key },
                            label = { Text(label) }
                        )
                    }
                }
            }

            // Tools list
            items(filteredTools) { tool ->
                McpToolCard(tool = tool)
            }
        }
    }
}

@Composable
private fun McpToolCard(tool: McpToolInfo) {
    val context = LocalContext.current
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = tool.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = SynologyBlue
                    )
                    Text(
                        text = tool.dsmApi,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = SynologyEmerald.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = tool.category.uppercase(),
                        color = SynologyEmerald,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = tool.description,
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(10.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = "Tham số: ${tool.params}",
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(
                    onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Tool Payload", tool.examplePayload)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Đã sao chép mẫu payload của ${tool.name}!", Toast.LENGTH_SHORT).show()
                    }
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Sao chép Payload")
                }
            }
        }
    }
}
