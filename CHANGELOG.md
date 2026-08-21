# Changelog — KV Synology (Web Edition)

Tất cả thay đổi của dự án độc lập **kv-synology** (tách từ `kv-dsm/webapp`) được ghi tại đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và [Semantic Versioning](https://semver.org/).

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
