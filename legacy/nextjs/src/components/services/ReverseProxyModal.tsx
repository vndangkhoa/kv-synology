"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { ReverseProxyRule, ReverseProxyPayload, ReverseProxyHeader } from "@/lib/dsm/types";
import {
  X,
  Globe,
  ShieldCheck,
  Server,
  ArrowRight,
  Plus,
  Trash2,
  Sliders,
  AlertCircle,
  Save,
  Zap,
  Lock,
} from "lucide-react";

interface ReverseProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: ReverseProxyPayload) => Promise<void>;
  editingRule?: ReverseProxyRule | null;
  existingRules: ReverseProxyRule[];
}

export const ReverseProxyModal: React.FC<ReverseProxyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRule,
  existingRules,
}) => {
  const { t } = useAppStore();
  const rp = t.reverseProxy;

  const [description, setDescription] = useState("");
  // Source
  const [sourceProto, setSourceProto] = useState<0 | 1>(1); // 1 = HTTPS, 0 = HTTP
  const [sourceFqdn, setSourceFqdn] = useState("");
  const [sourcePort, setSourcePort] = useState<number>(443);
  const [hsts, setHsts] = useState(true);
  const [http2, setHttp2] = useState(true);

  // Destination
  const [destProto, setDestProto] = useState<0 | 1>(0); // 0 = HTTP, 1 = HTTPS
  const [destFqdn, setDestFqdn] = useState("localhost");
  const [destPort, setDestPort] = useState<number>(80);

  // Headers & Advanced
  const [headers, setHeaders] = useState<ReverseProxyHeader[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [connectTimeout, setConnectTimeout] = useState(60);
  const [readTimeout, setReadTimeout] = useState(60);
  const [sendTimeout, setSendTimeout] = useState(60);
  const [httpVersion, setHttpVersion] = useState(1); // 1 = 1.1

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRule) {
      setDescription(editingRule.description || "");
      setSourceProto(editingRule.frontend.protocol);
      setSourceFqdn(editingRule.frontend.fqdn || "");
      setSourcePort(editingRule.frontend.port || 443);
      setHsts(Boolean(editingRule.frontend.https?.hsts));
      setHttp2(Boolean(editingRule.frontend.https?.http2));

      setDestProto(editingRule.backend.protocol);
      setDestFqdn(editingRule.backend.fqdn || "localhost");
      setDestPort(editingRule.backend.port || 80);

      setHeaders(editingRule.customize_headers ? [...editingRule.customize_headers] : []);
      setConnectTimeout(editingRule.proxy_connect_timeout || 60);
      setReadTimeout(editingRule.proxy_read_timeout || 60);
      setSendTimeout(editingRule.proxy_send_timeout || 60);
      setHttpVersion(editingRule.proxy_http_version ?? 1);
    } else {
      setDescription("");
      setSourceProto(1);
      setSourceFqdn("");
      setSourcePort(443);
      setHsts(true);
      setHttp2(true);

      setDestProto(0);
      setDestFqdn("localhost");
      setDestPort(80);

      // Default with WebSocket headers
      setHeaders([
        { name: "Upgrade", value: "$http_upgrade" },
        { name: "Connection", value: "$connection_upgrade" },
      ]);
      setConnectTimeout(60);
      setReadTimeout(60);
      setSendTimeout(60);
      setHttpVersion(1);
    }
    setError(null);
  }, [editingRule, isOpen]);

  if (!isOpen) return null;

  // Real-time conflict check
  const hasDomainConflict = existingRules.some(
    (r) =>
      r.frontend.fqdn.toLowerCase() === sourceFqdn.trim().toLowerCase() &&
      r.frontend.port === Number(sourcePort) &&
      (!editingRule || r.UUID !== editingRule.UUID)
  );

  const addWsHeaders = () => {
    const next = [...headers];
    if (!next.some((h) => h.name.toLowerCase() === "upgrade")) {
      next.push({ name: "Upgrade", value: "$http_upgrade" });
    }
    if (!next.some((h) => h.name.toLowerCase() === "connection")) {
      next.push({ name: "Connection", value: "$connection_upgrade" });
    }
    setHeaders(next);
  };

  const removeHeader = (idx: number) => {
    setHeaders(headers.filter((_, i) => i !== idx));
  };

  const updateHeader = (idx: number, field: "name" | "value", val: string) => {
    const next = [...headers];
    next[idx][field] = val;
    setHeaders(next);
  };

  const addCustomHeader = () => {
    setHeaders([...headers, { name: "", value: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Vui lòng nhập tên / mô tả cho Reverse Proxy rule.");
      return;
    }
    if (!sourceFqdn.trim()) {
      setError("Vui lòng nhập tên miền (Source Hostname).");
      return;
    }
    if (!destPort || isNaN(Number(destPort))) {
      setError("Vui lòng nhập cổng đích hợp lệ (1 - 65535).");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: ReverseProxyPayload = {
        UUID: editingRule?.UUID,
        description: description.trim(),
        frontend: {
          protocol: sourceProto,
          fqdn: sourceFqdn.trim().toLowerCase(),
          port: Number(sourcePort),
          https: {
            hsts,
            http2,
          },
          acl: null,
        },
        backend: {
          protocol: destProto,
          fqdn: destFqdn.trim() || "localhost",
          port: Number(destPort),
        },
        customize_headers: headers.filter((h) => h.name.trim() !== ""),
        proxy_connect_timeout: Number(connectTimeout),
        proxy_read_timeout: Number(readTimeout),
        proxy_send_timeout: Number(sendTimeout),
        proxy_http_version: Number(httpVersion),
        proxy_intercept_errors: false,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || rp.saveError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingRule ? rp.editRule : rp.addRule}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingRule ? editingRule.frontend.fqdn : "Tạo đường truyền an toàn từ domain đến cổng dịch vụ"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasDomainConflict && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Cảnh báo: Domain <strong>{sourceFqdn}:{sourcePort}</strong> đã tồn tại trong danh sách. Lưu có thể gây xung đột nếu không phải chỉnh sửa rule hiện tại.
              </span>
            </div>
          )}

          {/* Rule Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {rp.ruleName} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: kv-download, vaultwarden, navidrome..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Source Box */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Globe className="w-4 h-4 text-sky-500" />
              <span>{rp.sourceTitle} (Nguồn vào từ Internet / Domain)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {rp.protocol}
                </label>
                <select
                  value={sourceProto}
                  onChange={(e) => {
                    const val = Number(e.target.value) as 0 | 1;
                    setSourceProto(val);
                    if (val === 1 && sourcePort === 80) setSourcePort(443);
                    if (val === 0 && sourcePort === 443) setSourcePort(80);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={1}>HTTPS (Bảo mật SSL)</option>
                  <option value={0}>HTTP (Không mã hóa)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {rp.hostname} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sourceFqdn}
                  onChange={(e) => setSourceFqdn(e.target.value)}
                  placeholder="VD: dl.khoavo.myds.me hoặc app.mydomain.com"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {rp.port}
                </label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={sourcePort}
                  onChange={(e) => setSourcePort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {sourceProto === 1 && (
                <div className="sm:col-span-2 flex flex-wrap gap-4 pt-4 sm:pt-0">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={hsts}
                      onChange={(e) => setHsts(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-600"
                    />
                    <span>{rp.enableHsts}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={http2}
                      onChange={(e) => setHttp2(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-600"
                    />
                    <span>{rp.enableHttp2}</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Destination Box */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Server className="w-4 h-4 text-emerald-500" />
              <span>{rp.destinationTitle} (Chuyển tiếp tới dịch vụ cục bộ / container)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {rp.protocol}
                </label>
                <select
                  value={destProto}
                  onChange={(e) => setDestProto(Number(e.target.value) as 0 | 1)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={0}>HTTP</option>
                  <option value={1}>HTTPS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {rp.hostname}
                </label>
                <input
                  type="text"
                  required
                  value={destFqdn}
                  onChange={(e) => setDestFqdn(e.target.value)}
                  placeholder="localhost hoặc 192.168.1.52"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {rp.port} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={65535}
                  value={destPort}
                  onChange={(e) => setDestPort(Number(e.target.value))}
                  placeholder="57055, 8080..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Custom Headers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {rp.customHeaders} ({headers.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addWsHeaders}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-medium transition-colors"
                >
                  + WebSocket Preset
                </button>
                <button
                  type="button"
                  onClick={addCustomHeader}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {rp.addHeader}
                </button>
              </div>
            </div>

            {headers.length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto p-1">
                {headers.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={h.name}
                      onChange={(e) => updateHeader(idx, "name", e.target.value)}
                      placeholder="Header Name (VD: Upgrade)"
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) => updateHeader(idx, "value", e.target.value)}
                      placeholder="Header Value (VD: $http_upgrade)"
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Collapsible */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{rp.advancedSettings}</span>
              <span className="text-[10px] text-slate-400">({showAdvanced ? "Ẩn" : "Hiện"})</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {rp.connectTimeout}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={connectTimeout}
                    onChange={(e) => setConnectTimeout(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {rp.readTimeout}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={readTimeout}
                    onChange={(e) => setReadTimeout(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {rp.sendTimeout}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sendTimeout}
                    onChange={(e) => setSendTimeout(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Đang lưu..." : "Lưu Rule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
