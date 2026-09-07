# Changelog — KV Synology (Web Edition)

Tất cả thay đổi của dự án độc lập **kv-synology** (tách từ `kv-dsm/webapp`) được ghi tại đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và [Semantic Versioning](https://semver.org/).

---

## [1.5.4] - 2026-09-07

### 🐛 Sửa lỗi (Fixed) — kiểm chứng bằng máy chủ DSM giả lập + Emulator
- **Tải tệp File Station vẫn thất bại trên NAS thật**:
  - URL tải/phát chuyển sang chuẩn DSM (`path="/dir/file"`, `mode="open"/"download"` kèm quote, đúng như DSM web UI) thay vì dạng không quote.
  - Chặn trang lỗi JSON của DSM (`{"success":false,...}` trả về HTTP 200): kiểm tra `Content-Type: application/json`, ghi log mã lỗi, báo thất bại — không còn lưu tệp rác.
  - Tải lỗi tự xóa stub khỏi Downloads (MediaStore `delete` / `file.delete`), không để lại tệp 0-byte.
  - Kiểm chứng end-to-end với DSM giả (login thật, Cookie bắt buộc): tải 40MB **nguyên vẹn từng byte**, tải tệp bị từ chối báo đúng + sạch, hộp thoại liên kết DSM hiển thị đúng.
- **Gọn menu Chia sẻ theo yêu cầu**: xóa "Chia sẻ tệp" trực tiếp (menu overflow + nút header preview), chỉ giữ **"Chia sẻ liên kết DSM"**.
- **Lỗi video thân thiện**:Extractor không đọc được → "Tệp không phải video hợp lệ hoặc đã hỏng..." (đã chụp màn hình xác nhận, không crash).

### 📱 Ứng dụng Android
- Bumped `versionCode = 8`, `versionName = "1.5.4"`; updater trong Cài đặt trỏ mốc `1.5.4`.

### 📦 Phân phối (Distribution)
- **Docker image `1.5.4` + `latest`** (amd64+arm64) đã đẩy lên cả 3 registry: `ghcr.io/vndangkhoa/kv-synology`, `docker.io/vndangkhoa/kv-synology`, `git.khoavo.myds.me/vndangkhoa/kv-synology`.
- **SPK `kvsynology_x64-7.2_1.0.0-22.spk`** đã build + publish + **ACTIVE** trên `https://pkg.khoavo.myds.me/package/kvsynology` (ghim image `1.5.4`); trang tải tay `spk.khoavo.myds.me` đã refresh.
- **APK `1.5.4`** trên GitHub/Forgejo Releases và `spk.khoavo.myds.me/kvsynology-release.apk`.

---

## [1.5.3] - 2026-09-07

### 🐛 Sửa lỗi (Fixed) — kiểm chứng trên Emulator (API 17, Demo Mode)
- **Video File Station không phát được (đã tái hiện & sửa trên emulator)**:
  - URL demo `BigBuckBunny.mp4` của Google đã chết (HTTP 403 — Google gỡ sample bucket), `rain_heavy.ogg` cũng 404. Thay bằng `MDN flower.mp4` và `SoundHelix MP3` (đã kiểm tra HTTP 206).
  - Kiểm chứng end-to-end trên emulator: video phát **có hình + tiếng** (screenshot khung hình hoa, 00:05), nhạc phát (00:05/06:12), ảnh tải qua Coil — logcat sạch lỗi ExoPlayer.
- **Tải tệp File Station không hoạt động với tệp lớn**:
  - Nguyên nhân: `body.bytes()` nạp toàn bộ tệp vào RAM → OOM/crash với video nhiều GB.
  - Viết lại `downloadFileToStream()`: chép 256KB/chunk trực tiếp vào MediaStore (`Downloads/KVSynology`), báo dung lượng đã lưu, trả `-1` khi máy chủ từ chối.
  - Bổ sung header `Cookie: id=<sid>` + `X-SYNO-TOKEN` cho mọi endpoint tải/nội dung (`downloadFileBytes`, `downloadFileToStream`, `getFileContent`) — trước đây chỉ có `User-Agent`.
- **Chẩn đoán phát video rõ ràng**:
  - `describePlaybackError()`: dịch cause chain thành tiếng Việt (HTTP 403 = mất quyền, timeout, SSL tự ký, codec).
  - Banner "Chỉ phát được tiếng" khi `onTracksChanged` không thấy video track ở `STATE_READY` (trường hợp MKV/HEVC máy không giải mã nổi — đúng triệu chứng "có tiếng, không hình" trên NAS thật).

### 📱 Ứng dụng Android
- Bumped `versionCode = 7`, `versionName = "1.5.3"`; updater trong Cài đặt trỏ mốc `1.5.3`.

---

## [1.5.2] - 2026-09-07

### 🐛 Sửa lỗi (Fixed)
- **File Station phát video chỉ có tiếng mà không có hình (Video Black Screen)**:
  - Nguyên nhân gốc: `AndroidView(factory = ...)` chụp `exoPlayer == null` tại thời điểm khởi tạo và không bao giờ gắn player được tạo sau đó vào bề mặt hiển thị `PlayerView` — âm thanh vẫn phát nền trong khi màn hình đen.
  - Khắc phục bằng cách gắn player qua `update = { view -> view.player = exoPlayer }` kèm `onRelease = { view.player = null }`.
  - Cấu hình `PlayerView` chuẩn phát video: `RESIZE_MODE_FIT`, hiện/ẩn controller sau 3s, nền đen, giữ màn hình sáng khi xem.
- **Củng cố phát Ảnh / Nhạc / Video qua HTTPS NAS tự ký**:
  - Gửi kèm `Cookie: id=<sid>` (trích từ `_sid` trong URL stream) + `User-Agent: DSMHelper/1.3` cho cả ExoPlayer (`DefaultHttpDataSource`) và Coil (`ImageRequest`).
  - Tự nhận diện MIME theo đuôi tệp (`guessVideoMime`/`guessAudioMime`: mp4/mkv/avi/mov/webm/ts/flv/wmv, mp3/flac/wav/m4a/aac/ogg/opus) để tránh rơi vào trích xuất chỉ-audio.

### 🎨 Giao diện (Changed)
- **Thanh điều hướng dưới chỉ hiển thị biểu tượng (Icons-Only Bottom Nav)**:
  - Gỡ bỏ nhãn chữ dưới mỗi tab (`label = null`, `alwaysShowLabel = false`), giữ tên màn hình trong `contentDescription` cho trợ năng.
  - Áp dụng cho 5 tab chính: Tổng quan, Tập tin, Docker, Tải xuống, Lưu trữ.

### 📱 Ứng dụng Android
- Bumped `versionCode = 6`, `versionName = "1.5.2"`; module kiểm tra cập nhật trong Cài đặt trỏ mốc mới nhất `1.5.2` kèm nhật ký thay đổi.

---

## [1.5.1] - 2026-09-07

### 🚀 Cải tiến & Nâng cấp (Added & Improved)
- **Căn lề & Định dạng Bản ghi S.M.A.R.T. Thô (Justified, Organized & Highlighted SMART Output)**:
  - Phân tích và căn lề 10 cột cố định cho bảng thuộc tính S.M.A.R.T. (`ID#`, `ATTRIBUTE NAME`, `FLAG`, `VAL`, `WORST`, `THRESH`, `TYPE`, `UPDATED`, `STATUS`, `RAW VALUE`) ngay hàng thẳng lối, giải quyết dứt điểm hiện tượng xô lệch, thụt thò ký tự của terminal raw monospace.
  - Thiết kế thẻ hiển thị sang trọng cho Máy chủ NAS (`Host Banner`) và từng Ổ đĩa (`Drive Header`) với Slot, Model, S/N và đường dẫn thiết bị (`/dev/sataX`, `/dev/nvmeXn1`).
  - Căn lề hai cột đối xứng cho toàn bộ thông số đo đạc NVMe / SAS kèm chấm bullet và huy hiệu chỉ số.
- **Tô màu Phân biệt Chỉ số Quan trọng (Diagnostic Color Coding)**:
  - 🟢 **Xanh lá (An toàn)**: Đánh dấu trạng thái `PASSED`, `OK`, 0 bad sectors.
  - 🟡 **Vàng hổ phách (Cảnh báo)**: Nổi bật nhiệt độ cảm biến (°C) và lỗi giao tiếp cáp SATA `UDMA CRC Error Count` (ID 199).
  - 🔴 **Đỏ hồng (Nguy hiểm)**: Đánh dấu tức thì khi phát hiện Sector hỏng `Reallocated Sectors` (ID 5), `Pending Sectors` (ID 197), `Offline Uncorrectable` (ID 198) hoặc trạng thái `FAILING_NOW`.
  - 🟣 **Tím**: Nổi bật tỷ lệ hao mòn cell nhớ SSD / NVMe (`Percentage Used`).
  - 🔵 **Xanh da trời**: Nổi bật tổng thời gian đĩa đã hoạt động (`Power-On Hours` ID 9).
- **Bộ công cụ Trình xem Đa năng (Multi-mode Toolbar Controls)**:
  - Bổ sung nút chuyển đổi linh hoạt giữa chế độ `Căn lề & Tô màu` (Formatted) và `Terminal Gốc` (Raw ANSI).
  - Bổ sung nút lọc `⚡ Cảnh báo` (Alerts Only) cho phép người dùng chỉ tập trung vào các dòng ổ đĩa có vấn đề, vượt ngưỡng an toàn hoặc phát sinh lỗi.
  - Bổ sung nút bật/tắt đánh số thứ tự dòng (`#`).
  - Tích hợp đồng bộ trình xem nâng cấp vào cả trang chính S.M.A.R.T. và tab xem Raw trong Modal chi tiết của từng ổ đĩa.
- **Ứng dụng Di Động Android v1.5.1 (Native Android Phone App Enhancements)**:
  - **Kiểm tra Cập nhật APK & Xem Nhật ký Thay đổi**: Tích hợp module kiểm tra phiên bản mới từ tab Cài đặt, so sánh số version `BuildConfig.VERSION_NAME`, hiển thị đầy đủ nhật ký phát hành (Changelog Dialog) từ v1.5.1 tới các phiên bản trước, liên kết tải trực tiếp APK từ `pkg.khoavo.myds.me` và GitHub Releases.
  - **Trình phát Đa phương tiện Toàn diện trong File Station**: Hỗ trợ đầy đủ các định dạng Ảnh (JPG, PNG, WebP, GIF, SVG, BMP, HEIC/HEIF), Âm nhạc (MP3, FLAC, WAV, M4A, AAC, OGG, OPUS), Video (MP4, MKV, AVI, MOV, WebM, TS, M4V); cấu hình bỏ qua kiểm tra chứng chỉ SSL tự ký trên NAS; mã hóa đường dẫn UTF-8 chuẩn xác tránh lỗi ký tự tiếng Việt; bổ sung trình xem ảnh phóng to pinch-to-zoom, máy nghe nhạc đĩa than quay sinh động kèm thanh trượt thời gian và tua +/-10s, trình phát video ExoPlayer tối ưu bộ đệm.
  - **Hệ thống Thông báo Chế độ Cơ bản (Notifications in Basic Mode)**: Kích hoạt trung tâm thông báo ngay trong chế độ cơ bản, hiển thị chấm huy hiệu số lượng thông báo chưa đọc trên biểu tượng logo app ở drawer và menu, cung cấp hộp thoại Popup xem nhanh, đánh dấu đã đọc hoặc xóa tất cả.
  - **Giao diện Nút bấm Docker Đáp ứng Màn hình Di động (Mobile Responsive Layout)**: Tái cấu trúc các nút điều khiển Container ("Khởi động lại", "Dừng", "Khởi chạy", "Xóa", "Nhật ký & Chi tiết") và Dự án Compose theo bố cục 2 tầng co giãn thông minh, tinh chỉnh kích thước touch target và khoảng đệm để hiển thị hoàn hảo trên màn hình điện thoại mà không bị tràn viền.
  - **Bổ sung Giám sát Tài nguyên cho Chế độ Cơ bản (Resource Monitor in Beginner Mode)**: Đưa Resource Monitor vào danh sách phân hệ của Chế độ cơ bản; hỗ trợ chạm nhanh vào bất kỳ thẻ chỉ số nào trên Bảng điều khiển (CPU, RAM, Mạng, Ổ đĩa) hoặc biểu đồ CPU để điều hướng ngay sang trang phân tích chi tiết.

---

## [1.5.0] - 2026-09-06

### 🚀 Tính năng mới & Nâng cấp (Added & Improved)
- **S.M.A.R.T. Full Specs & Không Cắt Ngắn Thông Tin**:
  - Tích hợp chuyên sâu repository PeterSuh-Q3/SynoSmartInfo với tùy chọn quét mặc định `-a` (hiển thị toàn bộ thuộc tính S.M.A.R.T. và NVMe telemetry thay vì chế độ rút gọn).
  - Khôi phục 100% bảng thuộc tính chi tiết, mã lỗi, giá trị thô (Raw values) bị ẩn từ phiên bản DSM 7.2.1+ / 7.2.2.
  - Thêm modal "Xem toàn bộ thông số SMART (Full Specs)" cho từng ổ đĩa với ô tìm kiếm nhanh, lọc theo trạng thái và xem bản ghi thô (Raw block).
  - Bổ sung nút mở rộng chiều cao tối đa (Expand Full Height) trên trình xem log Terminal ANSI giúp xem log không giới hạn.
- **Tuổi thọ Ổ đĩa Chính xác & Loại bỏ Dữ liệu Ảo (Accurate Lifetime Span, No Fake Data)**:
  - Tính toán và hiển thị chính xác Thời gian chạy thực tế & Tuổi thọ ổ đĩa (Operating Lifetime Span) từ số giờ chạy thật (`Power-On Hours` ID 9).
  - Hiển thị tỷ lệ phần trăm tuổi thọ SSD / NVMe còn lại (`Remaining Life`) và độ mòn tế bào nhớ (`Percentage Used`).
  - Loại bỏ hoàn toàn tất cả các giá trị giả lập/hardcoded fallback ("100% Tuổi thọ", "5,591h", "26,394h", "khoav", "MKAOAA50") trên toàn bộ hệ thống Storage Manager.
- **File Station - Thao tác Tệp Đầy Đủ**:
  - Trang bị bộ công cụ Sao chép (Copy), Cắt (Cut), Dán (Paste) hoàn chỉnh cho File Station trên máy tính và thiết bị di động.
  - Hỗ trợ phím tắt bàn phím chuẩn (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Esc`), thanh trạng thái bộ nhớ tạm nổi (Clipboard Banner) và dán nhanh vào thư mục con.
- **Quản lý Đăng nhập & Đồng bộ Multi-NAS**:
  - Đảm bảo cơ chế duy nhất 1 NAS Active: khi người dùng chọn một NAS để làm việc, toàn bộ các NAS khác luôn tự động chuyển về trạng thái In-Active.
  - Hỗ trợ nút xóa toàn bộ danh sách đăng nhập đã lưu (Clear All) và xóa nhanh từng tài khoản (Individual Delete).

---

## [1.4.0] - 2026-09-06

### 🚀 Tính năng mới (Added)
- **Ứng dụng Di Động Android Native (KV Synology Android Edition)**:
  - Phát hành phiên bản ứng dụng Android Native hoàn chỉnh trên nền tảng Jetpack Compose và Material 3.
  - Đầy đủ 15 phân hệ quản trị DSM: Dashboard thời gian thực, File Station, Docker Container, Download Station, Storage Manager, Resource Monitor, Package Center, Services, Reverse Proxy, Firewall, ACL Permissions, Notifications, Network Traffic, SNMP Sensors, Terminal.
  - Tích hợp trợ lý AI cục bộ (On-device Local AI Assistant) phân tích telemetry NAS ngoại tuyến mà không cần API key.
- **Nâng cấp Toàn diện File Station trên Android**:
  - Hỗ trợ tải tệp tin về thư mục Downloads của điện thoại.
  - Trình chỉnh sửa văn bản tích hợp (Text Editor) trực tiếp mở và lưu file văn bản lên máy chủ NAS.
  - Tạo và sao chép liên kết chia sẻ công khai (Sharing Links) có mật khẩu và thời hạn hết hạn.
  - Thao tác tệp nâng cao: Cắt (Cut), Sao chép (Copy), Dán (Paste), Đổi tên và Xóa tệp/thư mục.
- **Cải tiến Tường Lửa & Reverse Proxy trên Di Động**:
  - Đồng bộ và lọc chính xác danh sách quy tắc Cho phép / Chặn (Allow / Deny rules) từ DSM.
  - Hỗ trợ thêm mới và chỉnh sửa trực quan toàn bộ thông số Reverse Proxy (Source, Target, HSTS, HTTP/2, WebSocket).
- **Quản lý Hồ sơ Đăng nhập & An toàn Mật khẩu**:
  - Tự động ghi nhớ tài khoản và mã hóa mật khẩu an toàn với Jetpack Security `EncryptedSharedPreferences`.
  - Danh sách máy chủ đã lưu dạng thẻ cuộn ngang với 1 chạm chọn nhanh và nút xóa `✕` từng máy chủ.
  - Hộp thoại xóa sạch toàn bộ hồ sơ đăng nhập đã lưu (Purge All).
  - Nút lưu cấu hình máy chủ thủ công và nút xóa trắng form nhập liệu nhanh.
- **Cài đặt & Hệ Sinh Thái KV (Settings & KV Ecosystem)**:
  - Thẻ thông tin giới thiệu phần mềm và hệ sinh thái KV Apps.
  - Tích hợp liên kết mở nhanh Cổng ứng dụng KV [https://syno.vndns.net](https://syno.vndns.net) và Fanpage Facebook [fb.com/syno.vndns.net](https://fb.com/syno.vndns.net).
  - Gỡ bỏ nút gạt On/Off Demo Mode trong Cài đặt, chuẩn hóa thẻ chỉ đọc trực quan hiển thị trạng thái phiên làm việc.
- **Phát hành & Phân phối (Release & Distribution)**:
  - Đóng gói bản phát hành Release APK chính thức (`kvsynology-release.apk`).
  - Tích hợp nút tải trực tiếp Android APK trên kho gói KV Apps tại `https://pkg.khoavo.myds.me/package/kvsynology`.

---

## [1.3.0] - 2026-09-05

### 🚀 Tính năng mới (Added)
- **Quản lý Cổng Ủy Quyền Ngược (Reverse Proxy Manager & Router)**:
  - Phân hệ quản lý toàn diện Reverse Proxy DSM (`SYNO.Core.ReverseProxy`), định tuyến tên miền và chứng chỉ SSL HTTPS tới các cổng dịch vụ nội bộ NAS và Docker Container.
  - Hỗ trợ tạo mới, chỉnh sửa và xóa quy tắc Reverse Proxy trực quan.
  - Tùy chỉnh nâng cao: Kích hoạt HSTS (Strict-Transport-Security), HTTP/2, và tùy chỉnh HTTP Headers.
  - Tích hợp bộ cấu hình một chạm cho WebSocket (`Upgrade: $http_upgrade`, `Connection: $connection_upgrade`).
  - Công cụ chẩn đoán sức khỏe hệ thống Nginx & Chứng chỉ SSL (Nginx Syntax & Config Health Probe).
  - Tìm kiếm và bộ lọc nhanh theo giao thức (All / HTTPS / HTTP), sao chép URL và mở nhanh dịch vụ đích.
- **Đa ngôn ngữ & Giao diện (i18n & UI)**:
  - Hoàn thiện bản dịch song ngữ Tiếng Việt & English cho toàn bộ phân hệ Reverse Proxy.
  - Tối ưu hóa điều hướng Sidebar và các Tabs dịch vụ.

---

## [1.2.0] - 2026-09-01

### 🚀 Tính năng mới (Added)
- **Storage Manager Toàn diện (Toàn bộ chức năng chuyên sâu)**:
  - Hiển thị trực tiếp bộ nhớ đệm SSD NVMe/SATA không cần bấm ẩn.
  - Đo hiệu năng ổ đĩa (Disk Benchmark: Sequential Read/Write, Random IOPS, Latency).
  - Quét Bad Sector chuyên sâu và chẩn đoán S.M.A.R.T. (Quick/Extended Test).
  - Quét chi tiết dung lượng Volume (Volume Usage Detail Scan).
  - Hiển thị thông số dung sai lỗi RAID (RAID Type Fault Tolerance: SHR, SHR-2, RAID 0/1/5/6/10/F1).
  - Cấu hình Write Cache và ngưỡng cảnh báo ổ cứng HDD/SSD.
- **Download Station Pro (Tích hợp Đa dịch vụ)**:
  - Tìm kiếm Torrent (BT Search) với bộ indexer đa nguồn và phân loại category.
  - Trình đọc tin RSS Feeds tự động tải về theo từ khóa.
  - Tích hợp bộ giải mã link tải trực tiếp (File Hosting Direct Link Converter) cho Google Drive, Fshare.vn, MediaFire.
- **Tường lửa & An ninh Mạng (Firewall & Security)**:
  - Chế độ Cơ bản (Simple Mode) với nút gạt Master Toggle và 5 dịch vụ bảo vệ cốt lõi.
  - Lưu trạng thái bật/tắt tường lửa bền vững theo phiên (Session Persistence) và thực thi đồng thời đa API DSM 7.2.
  - Phòng chống tấn công từ chối dịch vụ (DoS Protection) và tự động khóa IP tấn công dò mật khẩu (Auto-Block Brute Force).
- **Lưu lượng Mạng & Phân tích GeoIP (Network Traffic & GeoIP)**:
  - Chế độ xem đơn giản (Simple Mode) tóm tắt băng thông, Top 5 tiến trình và Top 5 quốc gia.
  - Sơ đồ tương tác luồng dữ liệu 24 tiến trình (Data Flow Graph) và phân tích Sockets chi tiết.
- **Cài đặt & Cổng Truy Cập Từ Xa (Settings & Remote Access)**:
  - Tích hợp cổng truy cập nhanh Synology Hub (`https://syno.vndns.net`) và kho gói Package Server (`https://pkg.khoavo.myds.me`).
- **Đa ngôn ngữ Toàn diện (Full 100% EN/VI Localization)**:
  - Hỗ trợ song ngữ Tiếng Việt & English cho toàn bộ 16 Tab chức năng, Modals, thanh điều hướng và thông báo hệ thống.

---

## [1.1.0] - 2026-08-29

### 🚀 Tính năng mới (Added)
- **Permission Inspector & Security Audit Visualizer Pro**:
  - Giao diện phân tích và hiển thị cây phân quyền trực quan chuẩn Windows ACL và Synology DSM.
  - Tìm kiếm hai chiều: Tìm theo Người dùng (User Lookup) $\rightarrow$ danh sách thư mục có quyền; Tìm theo Thư mục (Folder Tree) $\rightarrow$ danh sách người dùng/nhóm có quyền.
  - Gắn thẻ nguồn gốc phân quyền rõ ràng: **Trực tiếp (Direct)**, **Kế thừa thư mục (Inherited Folder)**, **Kế thừa qua nhóm (Inherited Group)**.
  - Thẻ thống kê tương tác nhanh (Interactive Metric Filter Cards): Bấm vào các ô `Full Control`, `Read & Write`, `Read-Only`, `Denied`, `Direct/Inherited` để lọc tức thì danh sách bên dưới.
  - Điều hướng ánh xạ tài khoản: Bấm vào bất kỳ tên User nào tại bảng quy tắc để nhảy thẳng sang tab kiểm tra chi tiết của User đó.
  - Hỗ trợ tải dữ liệu mẫu (Demo Enterprise Dataset) và Import CSV tùy biến.
- **Tối ưu hóa Tốc độ Tải Dữ liệu NAS Thực tế**:
  - Chuyển sang cơ chế truy vấn song song đồng thời (`Promise.all` & `Promise.allSettled`) kết hợp bộ đệm trong bộ nhớ, giảm thời gian load xuống dưới 150ms.
  - Mặc định khởi tạo dữ liệu trực tiếp từ thiết bị NAS DSM đang kết nối.

### 🐛 Sửa lỗi & Tối ưu hóa (Fixed)
- **Sửa lỗi hiển thị sai cấu hình ổ cứng và SSD Cache**:
  - Khắc phục triệt để tình trạng hiển thị sai ổ cứng (1 HDD 6TB + 2 SSD Cache) khi máy thực tế có cấu hình khác.
  - Xóa bỏ hoàn toàn các đoạn code inject phân vùng SSD Cache giả lập.
  - Tính toán chính xác dung lượng và tỷ lệ sử dụng thực tế của phân vùng NVMe SSD Cache Read/Write (~108 GB / 238 GB, hit rate 98.4%).
  - Gán chính xác Volume đích của SSD Cache theo phân vùng thực tế (`Volume 2`).
- **Đồng bộ hóa Ngôn ngữ & Giao diện Đa chế độ (i18n & Theme)**:
  - Hoàn thiện 100% bản dịch Tiếng Việt và English trên toàn bộ hệ thống.
  - Chuẩn hóa độ tương phản và màu nền trên cả hai chế độ Sáng (Light Mode) và Tối (Dark Mode).
  - Khắc phục lỗi sidebar cố định vị trí dính đáy màn hình.

---

## [1.0.1] - 2026-08-21

### 🐛 Sửa lỗi (Fixed)
- **QuickConnect relay cho NAS sau NAT (ví dụ `<your-qc-id>`)**:
  - Nguyên nhân: NAS sau NAT (ví dụ `192.168.x.x` / `<WAN-IP>`) không mở `5001` ra internet — `<id>.myDS.me:5001` và `*.direct.quickconnect.to:5001` đều timeout; chỉ có relay `<RELAY-IP>:<RELAY-PORT>` (`<relay>.direct.quickconnect.to:<port>`) reachable (`pingpong` → `success:true`).
  - Sửa `src/app/api/dsm/[...path]/route.ts`: tách `fetchServerInfo()`, xử lý `errno 4` redirect qua `sites[0]`, tạo `candidates` với **port/isHttps riêng** (`5001` cho LAN/DDNS, `443` cho SmartDNS, `relay_port` cho relay). Test TCP từng candidate với port riêng; nếu không có host nào mở thì **fallback cứng vào `relay_dn:relay_port`** (tunnel đảm bảo).
  - Trước đó proxy gửi `http` tới port `https` → `400 The plain HTTP request was sent to HTTPS port`; đã sửa thành luôn `https` cho relay.

### 💄 Giao diện (Changed)
- `src/components/layout/LoginModal.tsx`: badge QuickConnect đổi thành *“Tự động phân giải qua relay — cổng sẽ được tự động chọn, không cần nhập 5001.”*

### ✅ Xác thực (Verified)
- Đăng nhập `<your-qc-id>` (bare ID) + `<dsm-user>` + mật khẩu, **không OTP** → `auth.cgi` qua relay trả về `400` chỉ khi sai mật khẩu, không còn lỗi thiếu OTP.
- `npm run build` và `next dev -p 8088` đều pass; `curl https://<relay>.direct.quickconnect.to:<port>/webman/pingpong.cgi` → `200`.

---

## [1.0.0] - 2026-08-21

### 🚀 Tách dự án (Added)
- Tách toàn bộ `kv-dsm/webapp` (Next.js 15.5 + React 19 + Tailwind v4 + Zustand) thành dự án độc lập `kv-synology`.
- Giữ nguyên tính năng Web Edition tại thời điểm `kv-dsm` **2.2.0**: Dashboard realtime, File Station (xem/tạo/upload/download/chia sẻ), Docker, Download Station, Storage, Package Center, v.v.
- Proxy `src/app/api/dsm/[...path]/route.ts` với QuickConnect resolver cơ bản, bỏ qua self-signed SSL, hỗ trợ xác thực DSM `SYNO.API.Auth` (không gửi `otp_code` rỗng).
- Cấu hình `package.json` scripts `dev` (`-p 8088`), `build`, `start`, `lint`.

### 📦 Mang theo từ kv-dsm/webapp
- Xem `kv-dsm/CHANGELOG.md` các phiên bản **2.2.0 / 2.1.1 / 2.1.0 / 2.0.0 / 1.0.0** để biết lịch sử đầy đủ trước khi tách.

---

## Tham chiếu lịch sử trước khi tách

Tóm tắt các mốc chính của `kv-dsm` (chi tiết xem `kv-dsm/CHANGELOG.md`):

- **2.2.0 (2026-08-21):** Kill Process + Confirmation Modal, Text/Code Editor, Upload nhiều file, Public Sharing (`SYNO.FileStation.Sharing`).
- **2.1.1 (2026-08-21):** Mobile-First responsive overhaul, sửa đăng nhập không OTP (không gửi `otp_code` rỗng).
- **2.1.0 (2026-08-21):** Ra mắt Web Edition (Next.js 15 / React 19), Universal Media Player & File Station Viewer, Smart Proxy + QuickConnect, nhận diện 64 GB RAM.
- **2.0.0 / 1.0.0:** Khởi tạo Demo/NAS thật, đa ngôn ngữ vi/en; bản Flutter gốc.
