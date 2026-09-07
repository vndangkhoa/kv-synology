package com.khoavo.kvsynology.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.khoavo.kvsynology.presentation.i18n.AppStrings

sealed class Screen(
    val route: String,
    val defaultTitle: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val isPrimary: Boolean = false
) {
    data object Login : Screen("login", "Đăng nhập", Icons.Filled.Lock, Icons.Outlined.Lock)
    data object Dashboard : Screen("dashboard", "Tổng quan", Icons.Filled.Dashboard, Icons.Outlined.Dashboard, isPrimary = true)
    data object Files : Screen("files", "Tập tin", Icons.Filled.Folder, Icons.Outlined.Folder, isPrimary = true)
    data object Docker : Screen("docker", "Docker", Icons.Filled.Layers, Icons.Outlined.Layers, isPrimary = true)
    data object Download : Screen("download", "Tải xuống", Icons.Filled.Download, Icons.Outlined.Download, isPrimary = true)
    data object Storage : Screen("storage", "Lưu trữ", Icons.Filled.Storage, Icons.Outlined.Storage, isPrimary = true)
    data object Settings : Screen("settings", "Cài đặt", Icons.Filled.Settings, Icons.Outlined.Settings, isPrimary = true)

    data object Monitor : Screen("monitor", "Tài nguyên", Icons.Filled.Speed, Icons.Outlined.Speed)
    data object Packages : Screen("packages", "Gói ứng dụng", Icons.Filled.Apps, Icons.Outlined.Apps)
    data object Services : Screen("services", "Dịch vụ", Icons.Filled.MiscellaneousServices, Icons.Outlined.MiscellaneousServices)
    data object ReverseProxy : Screen("reverse_proxy", "Reverse Proxy", Icons.Filled.CompareArrows, Icons.Outlined.CompareArrows)
    data object Firewall : Screen("firewall", "Tường lửa", Icons.Filled.Security, Icons.Outlined.Security)
    data object Permissions : Screen("permissions", "Phân quyền ACL", Icons.Filled.VerifiedUser, Icons.Outlined.VerifiedUser)
    data object Notifications : Screen("notifications", "Thông báo", Icons.Filled.Notifications, Icons.Outlined.Notifications)
    data object Traffic : Screen("traffic", "Lưu lượng mạng", Icons.Filled.Public, Icons.Outlined.Public)
    data object Snmp : Screen("snmp", "SNMP Sensor", Icons.Filled.Sensors, Icons.Outlined.Sensors)
    data object Terminal : Screen("terminal", "Dòng lệnh", Icons.Filled.Terminal, Icons.Outlined.Terminal)
    data object Mcp : Screen("mcp", "Tài liệu MCP", Icons.Filled.Code, Icons.Outlined.Code)

    fun getTitle(strings: AppStrings): String = when (this) {
        Login -> "Login"
        Dashboard -> strings.dashboard
        Files -> strings.files
        Docker -> strings.docker
        Download -> strings.download
        Storage -> strings.storage
        Settings -> strings.settings
        Monitor -> strings.resourceMonitor
        Packages -> strings.packages
        Services -> strings.services
        ReverseProxy -> strings.reverseProxy
        Firewall -> strings.firewall
        Permissions -> strings.permissions
        Notifications -> strings.notifications
        Traffic -> strings.traffic
        Snmp -> strings.snmp
        Terminal -> strings.terminal
        Mcp -> strings.mcp
    }

    companion object {
        val primaryScreens = listOf(Dashboard, Files, Docker, Download, Storage)
        val advancedScreens = listOf(Monitor, Packages, Services, ReverseProxy, Firewall, Permissions, Notifications, Traffic, Snmp, Terminal, Mcp)
        val allScreens = listOf(Dashboard, Files, Docker, Download, Storage, Monitor, Packages, Services, ReverseProxy, Firewall, Permissions, Notifications, Traffic, Snmp, Terminal, Mcp, Settings)
        val beginnerScreens = listOf(Dashboard, Monitor, Files, Docker, Download, Storage, Notifications, Settings)
    }
}
