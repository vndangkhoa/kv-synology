package com.khoavo.kvsynology.presentation.files

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.animation.core.*
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
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import coil.compose.SubcomposeAsyncImage
import com.khoavo.kvsynology.domain.model.FileItem
import com.khoavo.kvsynology.presentation.theme.SynologyBlue
import com.khoavo.kvsynology.presentation.theme.SynologyEmerald
import com.khoavo.kvsynology.presentation.theme.SynologyRose
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun FilePreviewDialog(
    file: FileItem,
    streamUrl: String,
    onDismiss: () -> Unit,
    onEdit: (() -> Unit)? = null,
    onDownload: () -> Unit = {},
    onShare: () -> Unit = {}
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.88f),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
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
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = when {
                                    file.isImage -> Icons.Default.Image
                                    file.isAudio -> Icons.Default.MusicNote
                                    file.isVideo -> Icons.Default.Movie
                                    else -> Icons.Default.Description
                                },
                                contentDescription = null,
                                tint = SynologyBlue,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = file.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Text(
                            text = "${file.size / 1024} KB • ${file.path}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (onEdit != null) {
                            IconButton(onClick = onEdit) {
                                Icon(Icons.Default.Edit, contentDescription = "Chỉnh sửa", tint = SynologyBlue)
                            }
                        }
                        IconButton(onClick = onDownload) {
                            Icon(Icons.Default.Download, contentDescription = "Tải xuống")
                        }
                        IconButton(onClick = onShare) {
                            Icon(Icons.Default.Share, contentDescription = "Chia sẻ")
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Đóng")
                        }
                    }
                }

                HorizontalDivider()

                // Media / Content Area
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        file.isImage -> {
                            PhotoViewer(streamUrl = streamUrl, fileName = file.name)
                        }
                        file.isAudio -> {
                            AudioPlayer(file = file, streamUrl = streamUrl)
                        }
                        file.isVideo -> {
                            VideoPlayer(streamUrl = streamUrl, fileName = file.name)
                        }
                        else -> {
                            TextFallbackPreview(file = file, onEdit = onEdit)
                        }
                    }
                }
            }
        }
    }
}

/**
 * Zoomable, pinch-to-zoom photo viewer with loading & error handling.
 */
@Composable
private fun PhotoViewer(streamUrl: String, fileName: String) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

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
            model = streamUrl,
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
                    CircularProgressIndicator(color = SynologyBlue)
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

/**
 * Dedicated Music/Audio player with spinning vinyl disc, seekbar, and playback controls.
 */
@OptIn(UnstableApi::class)
@Composable
private fun AudioPlayer(file: FileItem, streamUrl: String) {
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
        val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(httpSourceFactory)

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build().apply {
                val item = MediaItem.fromUri(streamUrl)
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

    // Position updater ticker
    LaunchedEffect(isPlaying) {
        while (isPlaying) {
            exoPlayer?.let {
                currentPosition = it.currentPosition.coerceAtLeast(0L)
                if (it.duration > 0) duration = it.duration
            }
            delay(250)
        }
    }

    // Disc rotation animation
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
            .background(Color(0xFF121418))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceAround
    ) {
        // Vinyl Album Art Card
        Box(
            modifier = Modifier
                .size(190.dp)
                .clip(CircleShape)
                .background(Color(0xFF1E222B)),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(170.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF0F1115))
                    .rotate(if (isPlaying) rotation else 0f),
                contentAlignment = Alignment.Center
            ) {
                // Concentric record grooves
                Surface(
                    modifier = Modifier.size(130.dp),
                    shape = CircleShape,
                    color = Color(0xFF1E232E)
                ) {}
                Surface(
                    modifier = Modifier.size(80.dp),
                    shape = CircleShape,
                    color = SynologyBlue
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.MusicNote,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }
        }

        // Title and Format
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = file.name,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = SynologyBlue.copy(alpha = 0.2f)
            ) {
                Text(
                    text = "${file.extension.uppercase()} • ${file.size / 1024} KB",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = SynologyBlue,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
        }

        // Error message if any
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
        }

        // Timeline Slider
        Column(modifier = Modifier.fillMaxWidth()) {
            val progress = if (duration > 0) (currentPosition.toFloat() / duration.toFloat()).coerceIn(0f, 1f) else 0f
            Slider(
                value = progress,
                onValueChange = { frac ->
                    val newPos = (frac * duration).toLong()
                    currentPosition = newPos
                    exoPlayer?.seekTo(newPos)
                },
                colors = SliderDefaults.colors(
                    thumbColor = SynologyBlue,
                    activeTrackColor = SynologyBlue,
                    inactiveTrackColor = Color.DarkGray
                ),
                modifier = Modifier.fillMaxWidth()
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(formatDuration(currentPosition), color = Color.LightGray, fontSize = 11.sp)
                if (isBuffering) {
                    Text("Đang tải đệm...", color = SynologyEmerald, fontSize = 11.sp)
                }
                Text(formatDuration(duration), color = Color.LightGray, fontSize = 11.sp)
            }
        }

        // Control Buttons (Replay 10s, Play/Pause, Forward 10s)
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

            Spacer(modifier = Modifier.width(16.dp))

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

            Spacer(modifier = Modifier.width(16.dp))

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

/**
 * Video player powered by ExoPlayer + PlayerView with buffering indicators and error recovery.
 */
@OptIn(UnstableApi::class)
@Composable
private fun VideoPlayer(streamUrl: String, fileName: String) {
    val context = LocalContext.current
    var exoPlayer by remember { mutableStateOf<ExoPlayer?>(null) }
    var isBuffering by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    DisposableEffect(streamUrl) {
        val httpSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(20000)
        val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(httpSourceFactory)

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build().apply {
                val mediaItem = MediaItem.fromUri(streamUrl)
                setMediaItem(mediaItem)
                prepare()
                playWhenReady = true
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        isBuffering = state == Player.STATE_BUFFERING
                        if (state == Player.STATE_READY) errorMsg = null
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        errorMsg = error.message ?: "Không thể giải mã luồng video"
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
                    player = exoPlayer
                    useController = true
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        if (isBuffering && errorMsg == null) {
            CircularProgressIndicator(color = SynologyBlue, modifier = Modifier.size(48.dp))
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
                        colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue)
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

/**
 * Fallback preview for text / config files.
 */
@Composable
private fun TextFallbackPreview(file: FileItem, onEdit: (() -> Unit)?) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.Description, contentDescription = null, tint = SynologyBlue, modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Tệp văn bản / cấu hình\n\nĐường dẫn: ${file.path}\nKích thước: ${file.size} bytes\nĐịnh dạng: .${file.extension}",
                fontFamily = FontFamily.Monospace,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))
            if (onEdit != null) {
                Button(
                    onClick = onEdit,
                    colors = ButtonDefaults.buttonColors(containerColor = SynologyBlue)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Chỉnh sửa nội dung")
                }
            }
        }
    }
}

private fun formatDuration(ms: Long): String {
    if (ms <= 0) return "00:00"
    val totalSec = ms / 1000
    val min = totalSec / 60
    val sec = totalSec % 60
    return String.format("%02d:%02d", min, sec)
}
