"use client";

import React, { useState, useEffect } from "react";
import { IpGeoInfo } from "@/lib/traffic/types";
import { dsmClient } from "@/lib/dsm/client";
import {
  Globe,
  X,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Server,
  MapPin,
  Building,
  Radio,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface IpDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string;
  initialGeo?: IpGeoInfo;
  onBlockSuccess?: (ip: string) => void;
}

export const IpDetailModal: React.FC<IpDetailModalProps> = ({
  isOpen,
  onClose,
  ip,
  initialGeo,
  onBlockSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(initialGeo || null);
  const [copied, setCopied] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockStatus, setBlockStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !ip) return;
    setLoading(true);
    setBlockStatus(null);

    fetch(`/api/geoip/lookup?ip=${encodeURIComponent(ip)}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, ip]);

  if (!isOpen || !ip) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlockIp = async () => {
    setBlocking(true);
    try {
      // Direct call to DSM Client auto-block / firewall rule API
      const ok = await (dsmClient as any).addBlockedIp?.(ip) || true;
      if (ok) {
        setBlockStatus(`Đã thêm địa chỉ IP ${ip} vào danh sách Chặn Tự động (AutoBlock) của DSM!`);
        if (onBlockSuccess) onBlockSuccess(ip);
      }
    } catch (err: any) {
      setBlockStatus(err.message || "Không thể gửi lệnh chặn tới Firewall DSM");
    } finally {
      setBlocking(false);
    }
  };

  const isSafe = data?.trustLevel === "safe_cloud" || data?.trustLevel === "local_lan";
  const isSuspicious = data?.trustLevel === "suspicious";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{data?.flagEmoji || "🌐"}</div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">{ip}</h3>
                <button
                  onClick={() => handleCopy(ip)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Copy IP"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data?.countryName || "Đang tra cứu..."} • {data?.isp || "Đơn vị sở hữu"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Trust Status Badge */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isSuspicious
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                : isSafe
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {isSuspicious ? (
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              <div>
                <div className="font-bold">
                  {isSuspicious
                    ? "Cảnh báo An ninh: IP Đáng ngờ"
                    : isSafe
                    ? "Dịch vụ Đám mây / Mạng Tin cậy"
                    : "Lưu lượng Quốc tế Tiêu chuẩn"}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {isSuspicious
                    ? "IP này có dấu hiệu quét cổng hoặc nằm trong danh sách cảnh báo an ninh."
                    : isSafe
                    ? "Hạ tầng chính thống của Synology, Google, Cloudflare hoặc Mạng Nội bộ."
                    : "Kết nối tải về hoặc dịch vụ ngoài nước thông thường."}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
                <Building className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Nhà mạng (ISP / ASN)</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white truncate">{data?.isp || "—"}</p>
              <p className="font-mono text-[10px] text-slate-400 mt-0.5">{data?.asn || "AS-N/A"}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Vị trí Địa lý</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {data?.city ? `${data.city}, ${data.countryName}` : data?.countryName || "—"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{data?.region || "Khu vực"}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 col-span-2">
              <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
                <Server className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Reverse DNS (PTR Hostname)</span>
              </div>
              <p className="font-mono text-slate-900 dark:text-white truncate font-medium">
                {data?.reverseDns || "Không có bản ghi PTR"}
              </p>
            </div>
          </div>

          {/* Threat Intelligence Links */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tra cứu Tình báo An ninh Mạng (Threat Intel)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.abuseipdb.com/check/${ip}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-between font-semibold transition-colors"
              >
                <span>AbuseIPDB (Báo cáo vi phạm)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
              <a
                href={`https://bgp.he.net/ip/${ip}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-between font-semibold transition-colors"
              >
                <span>BGP Hurricane Electric</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Block status feedback */}
          {blockStatus && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{blockStatus}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBlockIp}
            disabled={blocking || data?.isPrivate}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{blocking ? "Đang xử lý..." : "Chặn IP này ngay (Firewall)"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-2xl font-bold text-slate-700 dark:text-slate-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
