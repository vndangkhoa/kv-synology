# Changelog — KV Synology (Web Edition)

Tất cả thay đổi của dự án độc lập **kv-synology** (tách từ `kv-dsm/webapp`) được ghi tại đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và [Semantic Versioning](https://semver.org/).

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
