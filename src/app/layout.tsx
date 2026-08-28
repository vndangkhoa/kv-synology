import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSM Helper - Quản lý Synology NAS",
  description: "Web application for managing Synology DiskStation Manager (DSM) in Vietnamese and English — Minimal blue/white S",
  applicationName: "DSM Helper",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    title: "DSM Helper",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "DSM Helper — Synology DSM Manager",
    description: "Minimal blue/white S — Quản lý NAS Synology trực tiếp, PWA cài được, lưu phiên 7 ngày",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Set initial theme before hydration to avoid flash/mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('dsm_theme')||'system';const m=window.matchMedia('(prefers-color-scheme: dark)').matches;const d=t==='dark'||t==='gemini'||(t==='system'&&m);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');if(t==='gemini')document.documentElement.classList.add('gemini');else document.documentElement.classList.remove('gemini');}catch{}`,
          }}
        />
      </head>
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {children}
        {/* PWA service worker registration — minimal, only on client */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}`,
          }}
        />
      </body>
    </html>
  );
}
