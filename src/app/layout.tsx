import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSM Helper - Quản lý Synology NAS",
  description: "Web application for managing Synology DiskStation Manager (DSM) in Vietnamese and English",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
