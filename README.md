# KV Synology — Synology DSM Web Manager

<div align="center">

**Giao diện quản lý Synology DSM hiện đại, bảo mật, chạy hoàn toàn trên trình duyệt.**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square)](LICENSE)

</div>

> **Nguồn gốc:** Tách riêng ứng dụng Web (`webapp/`) từ dự án tổng `kv-dsm` (Flutter + Web). `kv-synology` chỉ chứa Web Edition — gọn, dễ triển khai trên NAS / VPS / Vercel. Lịch sử chi tiết xem [CHANGELOG.md](CHANGELOG.md).

---

## ✨ Tính năng

- **Đăng nhập DSM linh hoạt:** IP LAN, DDNS (`*.synology.me`), **QuickConnect ID** (`your-id`, `your-id.quickconnect.to`) — tự động phân giải qua `global.quickconnect.to` và **relay fallback** (`relay_ip:relay_port`) cho NAS sau NAT không mở port.
- **Bảng điều khiển & Giám sát:** CPU/RAM/Mạng/Ổ đĩa realtime, nhiệt độ, uptime, model/serial, DSM version.
- **File Station:** duyệt tệp, tạo thư mục, xem ảnh/video/audio, đọc mã nguồn có đánh số dòng, tải lên/ tải về, chia sẻ link công khai, đổi tên/xóa.
- **Docker / Container Manager:** liệt kê container, CPU/RAM, start/stop/restart.
- **Download Station, Storage Manager, Package Center, v.v.**

Giao tiếp **trực tiếp** giữa trình duyệt của bạn và NAS qua proxy `/api/dsm/[...path]` (bỏ qua self-signed SSL nội bộ), không qua server trung gian. Phiên lưu cục bộ.

---

## 🚀 Khởi chạy nhanh

**Yêu cầu:** Node.js 18+ (khuyến nghị 20+)

```bash
# 1. Cài đặt
npm install

# 2. Chạy dev (port 8088 như cấu hình)
npm run dev
# Mở http://localhost:8088

# 3. Build production
npm run build
npm run start
# hoặc: npx next start -H 0.0.0.0 -p 8088
```

---

## 🛠️ Cấu trúc

```
kv-synology/                 # ← bạn đang ở đây (webapp standalone)
├── src/
│   ├── app/
│   │   ├── api/dsm/[...path]/route.ts  # DSM Smart Proxy + QuickConnect resolver
│   │   ├── globals.css, layout.tsx, page.tsx
│   ├── components/          # Dashboard, Files, Docker, Download, Storage, Layout...
│   └── lib/
│       ├── dsm/             # DSM client, types, mockData
│       ├── i18n/            # vi / en
│       └── store/           # Zustand useAppStore
├── public/                  # (nếu có) assets tĩnh
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json             # scripts: dev (8088), build, start, lint
```

Proxy QuickConnect (`src/app/api/dsm/[...path]/route.ts`):
- Gọi `POST https://global.quickconnect.to/Serv.php` (`get_server_info`), xử lý `errno 4` redirect qua `sites[0]`.
- Tự động chọn host reachable trong số `LAN IP / smartdns.lan / ddns / smartdns.host / external.wanIp / *.direct.quickconnect.to` + **relay** (`relay_dn:relay_port`, `relay_ip:relay_port`).
- Test TCP từng candidate với **port riêng**; nếu không có host nào mở thì fallback cứng vào relay DN — tunnel luôn reachable cho NAT.
- Forward `auth.cgi`/`entry.cgi` với `x-dsm-host/port/https/cookie/synotoken`.

---

## 📜 Giấy phép

**GNU General Public License v3.0 (GPL-3.0-only)** — xem toàn văn [LICENSE](LICENSE) (bản chuẩn của Free Software Foundation).

### Yêu cầu tuân thủ GPL v3 (tóm tắt — văn bản pháp lý duy nhất là `LICENSE`)

Khi phân phối bản gốc hoặc bản chỉnh sửa (kể cả nhị phân / Docker image / SPK / bản build Vercel), bạn **phải**:

1. **Đính kèm bản sao toàn văn giấy phép** — file `LICENSE` (GPL-3.0) phải đi kèm mọi bản phân phối, dù là mã nguồn hay nhị phân (GPL v3 §4–§5).
2. **Nêu rõ mọi thay đổi quan trọng** — mọi file đã sửa phải mang thông báo nổi bật về việc đã thay đổi và ngày thay đổi; đồng thời nên tổng hợp trong [CHANGELOG.md](CHANGELOG.md) (GPL v3 §5.a).
3. **Cung cấp mã nguồn tương ứng (Corresponding Source)** khi phân phối nhị phân — cung cấp toàn bộ mã nguồn, script build/cài đặt và định nghĩa hệ thống cần thiết để tái tạo nhị phân, theo một trong các phương án GPL v3 §6 (đính kèm cùng nhị phân, hoặc lời chào bằng văn bản có hiệu lực 3 năm, hoặc URL nguồn trên cùng nơi phân phối).
4. **Giữ lại thông báo bản quyền gốc** — không được xóa hay làm sai lệch header `Copyright` / `SPDX-License-Identifier` trong mã nguồn (GPL v3 §4).

> **Ngoài ra — Điều khoản "Sản phẩm Người dùng" (User Product, GPL v3 §6):** Nếu bạn tích hợp mã nguồn này vào **thiết bị dành cho người tiêu dùng** (consumer device — ví dụ NAS, router, TV box, thiết bị IoT…) và chuyển giao thiết bị đó, bạn phải cung cấp **Thông tin Cài đặt (Installation Information)** đầy đủ — bao gồm khóa ký, thủ tục, công cụ và hướng dẫn cần thiết để người nhận có thể **cài đặt, cập nhật và chạy lại các bản đã chỉnh sửa** trên thiết bị, và không được dùng biện pháp kỹ thuật để cản trở. Nghĩa vụ này không áp dụng khi chỉ phân phối phần mềm thuần túy (không kèm phần cứng) hoặc khi phần mềm chạy trên hệ thống không phải User Product. Xem chi tiết trong `LICENSE` §6 và [hội thảo theo yêu cầu của FSF về User Product](https://www.youtube.com/watch?v=HlIRWHY1bxU).

> ⚠️ Tóm tắt trên chỉ để định hướng — văn bản pháp lý có hiệu lực duy nhất là [LICENSE](LICENSE).

## 📝 Lịch sử

Xem [CHANGELOG.md](CHANGELOG.md). Phiên bản đầu của `kv-synology` là **1.0.0** (tách từ `kv-dsm` 2.2.0), bản vá QuickConnect relay là **1.0.1** (2026-08-21).
