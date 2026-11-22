package com.khoavo.kvsynology.presentation.files

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest
import com.khoavo.kvsynology.domain.model.FileItem
import com.khoavo.kvsynology.presentation.adaptive.LocalWindowState
import com.khoavo.kvsynology.presentation.theme.*
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun FilePreviewDialog(
    file: FileItem,
    streamUrl: String,
    onDismiss: () -> Unit,
    onEdit: (() -> Unit)? = null,
    onDownload: () -> Unit = {}
) {
    val syno = SynoTheme.colors
    val windowState = LocalWindowState.current

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(if (windowState.isWide) 0.85f else 0.95f)
                .widthIn(max = 920.dp)
                .fillMaxHeight(0.88f),
            shape = RoundedCornerShape(20.dp),
            color = syno.chromeSurface,
            border = BorderStroke(1.dp, syno.borderStrong)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = when {
                                    file.isImage -> Icons.Default.Image
                                    file.isAudio -> Icons.Default.MusicNote
                                    file.isVideo -> Icons.Default.Movie
                                    else -> Icons.Default.Description
                                },
                                contentDescription = null,
                                tint = syno.accentBright,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = file.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = syno.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Text(
                            text = "${file.size / 1024} KB • ${file.path}",
                            style = MaterialTheme.typography.labelSmall,
                            color = syno.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (onEdit != null) {
                            IconButton(onClick = onEdit) {
                                Icon(Icons.Default.Edit, contentDescription = "Chỉnh sửa", tint = syno.accentBright)
                            }
                        }
                        IconButton(onClick = onDownload) {
                            Icon(Icons.Default.Download, contentDescription = "Tải xuống", tint = syno.textPrimary)
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Đóng", tint = syno.textSecondary)
                        }
                    }
                }

                HorizontalDivider(color = syno.borderSubtle)

                // Media / Content Area
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(SynoPureBlack),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        file.isImage -> PhotoViewer(streamUrl = streamUrl, fileName = file.name)
                        file.isAudio -> AudioPlayer(file = file, streamUrl = streamUrl, isTabletop = windowState.isTabletop)
                        file.isVideo -> VideoPlayer(streamUrl = streamUrl, fileName = file.name)
                        else -> TextFallbackPreview(file = file, onEdit = onEdit)
                    }
                }
            }
        }
    }
}

@Composable
private fun PhotoViewer(streamUrl: String, fileName: String) {
    val context = LocalContext.current
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    val imageRequest = remember(streamUrl) {
        ImageRequest.Builder(context)
            .data(streamUrl)
            .apply {
                extractSid(streamUrl)?.let { sid ->
                    addHeader("Cookie", "id=$sid")
                }
                addHeader("User-Agent", "DSMHelper/1.3")
            }
            .crossfade(true)
            .build()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = {
                        scale = if (scale > 1.2f) 1f else 2.5f
                        offset = Offset.Zero
                    }
                )
            }
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(0.8f, 5f)
                    val maxOffsetX = (scale - 1f) * 500f
                    val maxOffsetY = (scale - 1f) * 500f
                    offset = Offset(
                        x = (offset.x + pan.x).coerceIn(-maxOffsetX, maxOffsetX),
                        y = (offset.y + pan.y).coerceIn(-maxOffsetY, maxOffsetY)
                    )
                }
            },
        contentAlignment = Alignment.Center
    ) {
        SubcomposeAsyncImage(
            model = imageRequest,
            contentDescription = fileName,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    translationX = offset.x,
                    translationY = offset.y
                ),
            loading = {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SynoBlueBright)
                }
            },
            error = {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.BrokenImage, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(54.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Không thể tải hình ảnh", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("Kiểm tra kết nối hoặc quyền truy cập tệp", color = Color.LightGray, fontSize = 12.sp)
                }
            }
        )
    }
}

@OptIn(UnstableApi::class)
@Composable
private fun AudioPlayer(file: FileItem, streamUrl: String, isTabletop: Boolean = false) {
    val context = LocalContext.current
    var exoPlayer by remember { mutableStateOf<ExoPlayer?>(null) }
    var isPlaying by remember { mutableStateOf(false) }
    var currentPosition by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    var isBuffering by remember { mutableStateOf(true) }
    var playbackError by remember { mutableStateOf<String?>(null) }

    DisposableEffect(streamUrl) {
        val httpSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(20000)
            .setDefaultRequestProperties(buildExoHeaders(streamUrl))
        val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(httpSourceFactory)

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build().apply {
                val item = androidx.media3.common.MediaItem.Builder()
                    .setUri(streamUrl)
                    .apply { guessAudioMime(file.extension)?.let { setMimeType(it) } }
                    .build()
                setMediaItem(item)
                prepare()
                playWhenReady = true
                addListener(object : Player.Listener {
                    override fun onIsPlayingChanged(playing: Boolean) {
                        isPlaying = playing
                    }
                    override fun onPlaybackStateChanged(state: Int) {
                        isBuffering = state == Player.STATE_BUFFERING
                        if (state == Player.STATE_READY) {
                            duration = this@apply.duration.coerceAtLeast(0L)
                            playbackError = null
                        }
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        playbackError = error.message ?: "Lỗi phát âm thanh"
                    }
                })
            }
        exoPlayer = player
        onDispose {
            player.release()
            exoPlayer = null
        }
    }

    LaunchedEffect(isPlaying) {
        while (isPlaying) {
            exoPlayer?.let {
                currentPosition = it.currentPosition.coerceAtLeast(0L)
                if (it.duration > 0) duration = it.duration
            }
            delay(250)
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "disc_spin")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(5000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SynoPureBlack)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = if (isTabletop) Arrangement.SpaceBetween else Arrangement.SpaceAround
    ) {
        // Upper pane: Vinyl Disc + Track Title
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = if (isTabletop) Modifier.weight(1f) else Modifier,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(if (isTabletop) 140.dp else 188.dp)
                    .clip(CircleShape)
                    .background(SynoCard),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(if (isTabletop) 124.dp else 168.dp)
                        .clip(CircleShape)
                        .background(SynoGrey13)
                        .rotate(if (isPlaying) rotation else 0f),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        modifier = Modifier.size(if (isTabletop) 92.dp else 128.dp),
                        shape = CircleShape,
                        color = SynoCardHover
                    ) {}
                    Surface(
                        modifier = Modifier.size(if (isTabletop) 56.dp else 78.dp),
                        shape = CircleShape,
                        color = SynologyBlue
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.MusicNote,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(if (isTabletop) 26.dp else 34.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = file.name,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = SynologyBlue.copy(alpha = 0.22f)
            ) {
                Text(
                    text = "${file.extension.uppercase()} • ${file.size / 1024} KB",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = SynoBlueBright,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
        }

        // Lower pane: Errors, Seekbar & Controls
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (playbackError != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = SynologyRose.copy(alpha = 0.2f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = playbackError ?: "Lỗi phát",
                        color = SynologyRose,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(8.dp)
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            val progress = if (duration > 0) (currentPosition.toFloat() / duration.toFloat()).coerceIn(0f, 1f) else 0f
            Slider(
                value = progress,
                onValueChange = { frac ->
                    val newPos = (frac * duration).toLong()
                    currentPosition = newPos
                    exoPlayer?.seekTo(newPos)
                },
                colors = SliderDefaults.colors(
                    thumbColor = SynoBlueBright,
                    activeTrackColor = SynologyBlue,
                    inactiveTrackColor = SynoWhite20
                ),
                modifier = Modifier.fillMaxWidth()
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(formatDuration(currentPosition), color = SynoWhite67, fontSize = 11.sp)
                if (isBuffering) {
                    Text("Đang tải đệm...", color = SynologyEmerald, fontSize = 11.sp)
                }
                Text(formatDuration(duration), color = SynoWhite67, fontSize = 11.sp)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        exoPlayer?.let { p ->
                            val target = (p.currentPosition - 10000).coerceAtLeast(0L)
                            p.seekTo(target)
                            currentPosition = target
                        }
                    },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(Icons.Default.Replay10, contentDescription = "Lùi 10s", tint = Color.White, modifier = Modifier.size(28.dp))
                }

                Spacer(modifier = Modifier.width(18.dp))

                FloatingActionButton(
                    onClick = {
                        exoPlayer?.let { p ->
                            if (p.isPlaying) p.pause() else p.play()
                        }
                    },
                    shape = CircleShape,
                    containerColor = SynologyBlue,
                    contentColor = Color.White,
                    modifier = Modifier.size(62.dp)
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Tạm dừng" else "Phát",
                        modifier = Modifier.size(34.dp)
                    )
                }

                Spacer(modifier = Modifier.width(18.dp))

                IconButton(
                    onClick = {
                        exoPlayer?.let { p ->
                            val target = (p.currentPosition + 10000).coerceAtMost(duration)
                            p.seekTo(target)
                            currentPosition = target
                        }
                    },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(Icons.Default.Forward10, contentDescription = "Tới 10s", tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
private fun VideoPlayer(streamUrl: String, fileName: String) {
    val context = LocalContext.current
    var exoPlayer by remember { mutableStateOf<ExoPlayer?>(null) }
    var isBuffering by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var audioOnlyHint by remember { mutableStateOf(false) }

    DisposableEffect(streamUrl) {
        val httpSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(20000)
            .setDefaultRequestProperties(buildExoHeaders(streamUrl))
        val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(httpSourceFactory)

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build().apply {
                val mediaItem = androidx.media3.common.MediaItem.Builder()
                    .setUri(streamUrl)
                    .apply { guessVideoMime(fileName)?.let { setMimeType(it) } }
                    .build()
                setMediaItem(mediaItem)
                prepare()
                playWhenReady = true
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        isBuffering = state == Player.STATE_BUFFERING
                        if (state == Player.STATE_READY) errorMsg = null
                    }
                    override fun onTracksChanged(tracks: androidx.media3.common.Tracks) {
                        val hasVideo = tracks.groups.any { g ->
                            (0 until g.length).any { i ->
                                g.getTrackFormat(i).sampleMimeType?.startsWith("video/") == true &&
                                    g.isTrackSelected(i)
                            }
                        }
                        audioOnlyHint = !hasVideo && this@apply.playbackState == Player.STATE_READY
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        errorMsg = describePlaybackError(error)
                    }
                })
            }
        exoPlayer = player
        onDispose {
            player.release()
            exoPlayer = null
        }
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = true
                    controllerShowTimeoutMs = 3000
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    keepScreenOn = true
                    setShutterBackgroundColor(android.graphics.Color.BLACK)
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
            },
            update = { view ->
                if (view.player !== exoPlayer) {
                    view.player = exoPlayer
                }
                view.keepScreenOn = true
            },
            onRelease = { view ->
                view.player = null
            },
            modifier = Modifier.fillMaxSize()
        )

        if (isBuffering && errorMsg == null) {
            CircularProgressIndicator(color = SynoBlueBright, modifier = Modifier.size(48.dp))
        }

        if (audioOnlyHint && errorMsg == null) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.Black.copy(alpha = 0.8f),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp, start = 16.dp, end = 16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.MusicNote, contentDescription = null, tint = SynologyAmber, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Chỉ phát được tiếng: máy không giải mã được hình ảnh (thử MP4/H.264)",
                        fontSize = 11.sp,
                        color = Color.White
                    )
                }
            }
        }

        if (errorMsg != null) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.Black.copy(alpha = 0.85f),
                modifier = Modifier.padding(24.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = SynologyRose, modifier = Modifier.size(36.dp))
                    Text("Không thể phát video", fontWeight = FontWeight.Bold, color = Color.White)
                    Text(errorMsg ?: "", fontSize = 11.sp, color = Color.LightGray, textAlign = TextAlign.Center)
                    Button(
                        onClick = {
                            exoPlayer?.prepare()
                            exoPlayer?.play()
                        },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Thử lại")
                    }
                }
            }
        }
    }
}

@Composable
private fun TextFallbackPreview(file: FileItem, onEdit: (() -> Unit)?) {
    val syno = SynoTheme.colors
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(syno.canvas)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.Description, contentDescription = null, tint = syno.accentBright, modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Tệp văn bản / cấu hình\n\nĐường dẫn: ${file.path}\nKích thước: ${file.size} bytes\nĐịnh dạng: .${file.extension}",
                fontFamily = FontFamily.Monospace,
                fontSize = 13.sp,
                color = syno.textPrimary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))
            if (onEdit != null) {
                Button(
                    onClick = onEdit,
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue, contentColor = Color.White)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Chỉnh sửa nội dung")
                }
            }
        }
    }
}

private fun describePlaybackError(error: PlaybackException): String {
    var cause: Throwable? = error.cause
    var depth = 0
    while (cause != null && depth < 4) {
        val msg = cause.message?.takeIf { it.isNotBlank() }
        if (cause is androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException) {
            return "Máy chủ từ chối (HTTP ${cause.responseCode}). Kiểm tra quyền truy cập tệp."
        }
        if (cause is java.net.UnknownHostException) {
            return "Không tìm thấy máy chủ. Kiểm tra địa chỉ NAS / mạng."
        }
        if (cause is java.net.SocketTimeoutException || cause is java.net.ConnectException) {
            return "Hết thời gian kết nối tới NAS. Thử lại."
        }
        if (cause is javax.net.ssl.SSLException) {
            return "Lỗi chứng chỉ HTTPS. Bật 'Bỏ qua lỗi SSL tự ký' khi đăng nhập."
        }
        if (msg != null) {
            if (msg.contains("extractor", ignoreCase = true)) {
                return "Tệp không phải video hợp lệ hoặc đã hỏng. Hãy tải về và mở bằng ứng dụng khác."
            }
            if (!msg.equals("Source error", ignoreCase = true)) {
                return msg
            }
        }
        cause = cause.cause
        depth++
    }
    return when (error.errorCode) {
        PlaybackException.ERROR_CODE_DECODER_INIT_FAILED,
        PlaybackException.ERROR_CODE_DECODING_FAILED,
        PlaybackException.ERROR_CODE_DECODER_QUERY_FAILED -> "Thiết bị không giải mã được định dạng này."
        PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
        PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT -> "Lỗi mạng khi tải luồng video."
        else -> error.message ?: "Không thể giải mã luồng video"
    }
}

private fun extractSid(streamUrl: String): String? =
    Regex("[?&]_sid=([^&]+)").find(streamUrl)?.groupValues?.getOrNull(1)

private fun buildExoHeaders(streamUrl: String): Map<String, String> {
    val headers = mutableMapOf("User-Agent" to "DSMHelper/1.3")
    extractSid(streamUrl)?.let { sid ->
        if (sid.isNotBlank()) headers["Cookie"] = "id=$sid"
    }
    return headers
}

private fun guessVideoMime(fileName: String): String? {
    return when (fileName.substringAfterLast('.', "").lowercase()) {
        "mp4", "m4v", "mov" -> "video/mp4"
        "webm" -> "video/webm"
        "mkv" -> "video/x-matroska"
        "avi" -> "video/x-msvideo"
        "3gp" -> "video/3gpp"
        "ts", "m2ts" -> "video/mp2t"
        "flv" -> "video/x-flv"
        "wmv" -> "video/x-ms-wmv"
        else -> null
    }
}

private fun guessAudioMime(extension: String): String? {
    return when (extension.lowercase()) {
        "mp3" -> "audio/mpeg"
        "aac" -> "audio/aac"
        "m4a" -> "audio/mp4"
        "wav" -> "audio/wav"
        "ogg", "opus" -> "audio/ogg"
        "flac" -> "audio/flac"
        "wma" -> "audio/x-ms-wma"
        "mka" -> "audio/x-matroska"
        else -> null
    }
}

private fun formatDuration(ms: Long): String {
    if (ms <= 0) return "00:00"
    val totalSec = ms / 1000
    val min = totalSec / 60
    val sec = totalSec % 60
    return String.format("%02d:%02d", min, sec)
}
