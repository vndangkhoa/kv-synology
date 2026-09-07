package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class AppUpdateInfo(
    val currentVersion: String,
    val latestVersion: String,
    val isUpdateAvailable: Boolean,
    val releaseDate: String,
    val apkDownloadUrl: String,
    val packagePortalUrl: String = "https://pkg.khoavo.myds.me/package/kvsynology",
    val changelog: List<VersionChangelog> = emptyList()
)

@Serializable
data class VersionChangelog(
    val version: String,
    val releaseDate: String,
    val highlights: List<String>,
    val details: List<String> = emptyList()
)

object AppChangelogRegistry {
    val changelogs: List<VersionChangelog> = listOf(
        VersionChangelog(
            version = "1.5.4",
            releaseDate = "2026-09-07",
            highlights = listOf(
                "Tải tệp File Station sửa đúng chuẩn DSM: URL dạng path=\"...\" mode=\"...\" kèm Cookie phiên.",
                "Từ chối khéo trang lỗi JSON của DSM (HTTP 200 giả): báo thất bại, không lưu tệp rác.",
                "Bỏ nút Chia sẻ tệp trực tiếp, chỉ giữ Chia sẻ liên kết DSM.",
                "Thông báo lỗi video gọn, tiếng Việt khi tệp hỏng/không phải video."
            ),
            details = listOf(
                "Kiểm chứng trên máy chủ DSM giả lập: tải 40MB nguyên vẹn byte, cookie bắt buộc, lỗi 408 bị chặn.",
                "Tệp tải lỗi bị xóa khỏi Downloads, không để lại stub 0-byte."
            )
        ),
        VersionChangelog(
            version = "1.5.3",
            releaseDate = "2026-09-07",
            highlights = listOf(
                "Sửa dứt điểm video không phát được: thay URL demo đã chết (Google sample bucket 403), kiểm chứng phát hình + tiếng trên emulator.",
                "Tải tệp File Station viết lại dạng streaming: không còn out-of-memory với video lớn, kèm xác thực Cookie đầy đủ.",
                "Video báo lỗi rõ nguyên nhân (HTTP 403, timeout, SSL, codec) và cảnh báo khi máy chỉ giải mã được tiếng."
            ),
            details = listOf(
                "Demo video dùng MDN flower.mp4, demo nhạc dùng SoundHelix MP3 (ổn định).",
                "Download dùng downloadFileToStream 256KB/chunk thẳng vào MediaStore."
            )
        ),
        VersionChangelog(
            version = "1.5.2",
            releaseDate = "2026-09-07",
            highlights = listOf(
                "Thanh điều hướng dưới chỉ hiển thị biểu tượng (Icons-only bottom nav), gọn gàng trên màn hình điện thoại.",
                "Sửa lỗi File Station phát video chỉ có tiếng mà không có hình (đen màn hình).",
                "Củng cố phát Ảnh/Nhạc/Video: gửi Cookie phiên DSM + User-Agent, tự nhận diện MIME theo đuôi tệp."
            ),
            details = listOf(
                "Gắn ExoPlayer vào PlayerView qua update lambda thay vì factory (nguyên nhân gốc của màn hình đen).",
                "PlayerView cấu hình RESIZE_MODE_FIT, giữ màn hình sáng khi xem video.",
                "Ảnh tải qua Coil ImageRequest có kèm Cookie xác thực phiên DSM."
            )
        ),
        VersionChangelog(
            version = "1.5.1",
            releaseDate = "2026-09-07",
            highlights = listOf(
                "Kiểm tra bản cập nhật APK trực tiếp trong Cài đặt kèm Nhật ký thay đổi (Changelog).",
                "Trình phát đa phương tiện File Station chuyên dụng cho Ảnh, Nhạc (Audio Player có đĩa quay & thanh tua) và Video.",
                "Hỗ trợ Thông báo trong chế độ Cơ bản, huy hiệu thông báo trên biểu tượng Logo và cửa sổ Popup thông báo.",
                "Giao diện Docker Container Manager co giãn thông minh (Responsive layout) vừa vặn mọi màn hình điện thoại.",
                "Kích hoạt Giám sát tài nguyên (Resource Monitor) ngay trong chế độ Cơ bản."
            ),
            details = listOf(
                "Căn lề & định dạng bảng S.M.A.R.T. thô 10 cột đối xứng, phân biệt màu chẩn đoán.",
                "Tự động giải mã đường dẫn tệp tin an toàn (URL encoding) khi phát trực tiếp từ Synology NAS.",
                "Hỗ trợ chứng chỉ SSL tự ký khi tải hình ảnh và phát nhạc/video qua giao thức HTTPS.",
                "Tối ưu hóa các nút thao tác Docker: Khởi động lại, Dừng, Khởi chạy, Xóa không bị tràn màn hình."
            )
        ),
        VersionChangelog(
            version = "1.5.0",
            releaseDate = "2026-09-06",
            highlights = listOf(
                "S.M.A.R.T. Full Specs: Khôi phục 100% bảng thuộc tính chi tiết, mã lỗi, giá trị thô.",
                "Tuổi thọ ổ đĩa chính xác: Tính toán từ số giờ chạy thật Power-On Hours (ID 9).",
                "File Station: Bộ công cụ Sao chép (Copy), Cắt (Cut), Dán (Paste) hoàn chỉnh.",
                "Quản lý Multi-NAS: Cơ chế duy nhất 1 NAS Active, ghi nhớ bảo mật mật khẩu."
            ),
            details = listOf(
                "Tích hợp chuyên sâu PeterSuh-Q3/SynoSmartInfo với tùy chọn quét -a.",
                "Loại bỏ hoàn toàn các giá trị giả lập/hardcoded fallback trên Storage Manager.",
                "Thanh trạng thái bộ nhớ tạm nổi (Clipboard Banner) khi Cắt/Chép tệp tin."
            )
        ),
        VersionChangelog(
            version = "1.4.0",
            releaseDate = "2026-09-06",
            highlights = listOf(
                "Phát hành phiên bản ứng dụng Android Native hoàn chỉnh trên nền tảng Jetpack Compose.",
                "Tích hợp trợ lý AI cục bộ (On-device Local AI Assistant) không cần API key.",
                "Quản lý tệp tin File Station: Tải về, chỉnh sửa văn bản (Text Editor), chia sẻ liên kết.",
                "Cấu hình tường lửa Firewall Rules & Reverse Proxy trực quan trên di động."
            ),
            details = listOf(
                "Bảo mật mật khẩu với Android Keystore và EncryptedSharedPreferences.",
                "Tự động nhận diện kết nối QuickConnect và mạng nội bộ LAN.",
                "Giao diện Thích ứng (Adaptive Layout) tự động tối ưu điện thoại và máy tính bảng."
            )
        ),
        VersionChangelog(
            version = "1.3.0",
            releaseDate = "2026-09-05",
            highlights = listOf(
                "Quản lý Cổng Ủy Quyền Ngược (Reverse Proxy Manager & Router).",
                "Đa ngôn ngữ song ngữ Tiếng Việt & English hoàn chỉnh.",
                "Tùy chỉnh HSTS, HTTP/2 và cấu hình một chạm cho WebSocket."
            )
        )
    )
}
