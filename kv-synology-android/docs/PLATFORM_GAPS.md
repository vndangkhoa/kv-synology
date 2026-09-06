# KV-Synology Platform Gaps & Native Android Adaptations

This document analyzes the differences between web-based execution in Next.js/Browser and native Android execution, detailing how platform constraints are resolved.

## 1. Architectural & Platform Gaps

| Capability / Feature | Web Implementation | Android Constraint | Native Android Solution |
| :--- | :--- | :--- | :--- |
| **Network Proxying & CORS** | Next.js API route (`/api/dsm/*`) | None (Android is not bound by browser CORS policies) | **Direct OkHttp/Retrofit HTTP calls** to NAS endpoints with custom headers (`Cookie: id=<sid>`, `X-SYNO-TOKEN`). |
| **Self-Signed SSL Certificates** | Node.js `rejectUnauthorized: false` | Android TLS denies untrusted CA certs by default | Host-scoped `TrustManager` allowing self-signed certificates **only when explicit user opt-in is toggled** for that NAS profile. |
| **Credential Persistence** | `localStorage` (Base64 string) | Vulnerable on unrooted and rooted Android devices | **EncryptedSharedPreferences / Android Keystore** for passwords, tokens, and cookies. |
| **Large File Downloads** | Browser window blob download | Android background kill, lifecycle recreation | Android **DownloadManager** / Foreground Service with persistent notifications and progress updates. |
| **Media Playback & Streaming** | HTML5 `<video>` / `<audio>` | Seeking requires HTTP Range support & auth headers | **AndroidX Media3 (ExoPlayer)** with custom `HttpDataSource.Factory` injecting DSM auth session cookies. |
| **File Picker & Upload** | HTML `<input type="file">` | Scoped Storage (Android 10+) | Android **Storage Access Framework (SAF)** via `ActivityResultContracts.GetContent()`. |
| **Share Links** | `navigator.clipboard.writeText` | Web-only clipboard API | Android **Sharesheet** (`Intent.ACTION_SEND`) and Android system Clipboard. |
| **Adaptive Layout** | CSS Media Queries (`md:`, `lg:`) | Phones, foldables, tablets, landscape orientations | Jetpack Compose **WindowSizeClass** and `NavigationSuiteScaffold` (Bottom bar on compact, Navigation Rail on expanded). |
| **Terminal & SSH** | Node.js `ssh2` server socket | Android has no Node runtime | Native Kotlin/Java SSH client socket or command bridge with fallback to Demo Shell. |
| **SNMP Monitoring** | Node.js `net-snmp` library | Native Android UDP networking | Pure Kotlin UDP SNMP client sending/receiving ASN.1 OID packets to UDP port 161. |

---

## 2. Summary
By translating web workarounds into genuine Android APIs, the native application gains significant performance, battery efficiency, offline resilience, and security advantages over a web app.
