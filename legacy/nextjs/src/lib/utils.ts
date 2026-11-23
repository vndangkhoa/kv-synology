import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatUptime(seconds: number, lang: "vi" | "en" = "vi"): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (lang === "vi") {
    if (days > 0) return `${days} ngày, ${hours} giờ`;
    if (hours > 0) return `${hours} giờ, ${minutes} phút`;
    return `${minutes} phút`;
  } else {
    if (days > 0) return `${days}d, ${hours}h`;
    if (hours > 0) return `${hours}h, ${minutes}m`;
    return `${minutes}m`;
  }
}

export function formatDate(timestampSec: number): string {
  return new Date(timestampSec * 1000).toLocaleString();
}
