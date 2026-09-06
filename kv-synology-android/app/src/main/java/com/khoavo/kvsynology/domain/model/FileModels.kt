package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class FileItem(
    val path: String,
    val name: String,
    val isdir: Boolean,
    val size: Long = 0L,
    val mtime: Long = 0L,
    val owner: String? = null,
    val filetype: String? = null,
    val perm: String? = null,
    val realPath: String? = null,
    val itemCount: Int? = null,
    val mimeType: String? = null
) {
    val extension: String
        get() = if (isdir) "" else name.substringAfterLast('.', "").lowercase()

    val isMedia: Boolean
        get() = isVideo || isAudio || isImage

    val isVideo: Boolean
        get() = extension in listOf("mp4", "mkv", "avi", "mov", "webm")

    val isAudio: Boolean
        get() = extension in listOf("mp3", "flac", "wav", "m4a", "aac", "ogg")

    val isImage: Boolean
        get() = extension in listOf("jpg", "jpeg", "png", "webp", "gif", "svg", "bmp")

    val isText: Boolean
        get() = extension in listOf("txt", "log", "json", "yml", "yaml", "xml", "conf", "sh", "js", "ts", "md")
}

@Serializable
data class ShareLink(
    val id: String,
    val url: String,
    val path: String,
    val name: String,
    val dateExpired: String? = null,
    val hasPassword: Boolean = false
)
