package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class NotificationItem(
    val id: String,
    val title: String,
    val displayTitle: String,
    val category: String = "system",
    val level: String = "info", // "info", "warning", "error", "success"
    val messages: List<String> = emptyList(),
    val time: Long = System.currentTimeMillis() / 1000,
    val read: Boolean = false
)

@Serializable
data class AppNotifyItem(
    val id: String,
    val title: String,
    val content: String,
    val level: String = "info",
    val time: Long = System.currentTimeMillis() / 1000,
    val unread: Boolean = true
)
