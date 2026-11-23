"use client";

import React, { useState } from "react";
import { SnmpDevice, SnmpVersion } from "@/lib/snmp/types";
import { Server, X, CheckCircle, ShieldAlert, Cpu, Activity } from "lucide-react";

interface SnmpAddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: SnmpDevice) => void;
  existingDevice?: SnmpDevice | null;
}

export const SnmpAddDeviceModal: React.FC<SnmpAddDeviceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDevice,
}) => {
  const [name, setName] = useState(existingDevice?.name || "");
  const [host, setHost] = useState(existingDevice?.host || "192.168.1.10");
  const [port, setPort] = useState(existingDevice?.port || 161);
  const [version, setVersion] = useState<SnmpVersion>(existingDevice?.version || "v2c");
  const [community, setCommunity] = useState(existingDevice?.community || "public");
  const [pollingInterval, setPollingInterval] = useState(existingDevice?.pollingInterval || 5);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; ms?: number } | null>(null);

  // v3 state
  const [v3User, setV3User] = useState(existingDevice?.v3Config?.user || "snmpadmin");
  const [v3Level, setV3Level] = useState<"noAuthNoPriv" | "authNoPriv" | "authPriv">(
    existingDevice?.v3Config?.level || "authPriv"
  );
  const [v3AuthProto, setV3AuthProto] = useState<"md5" | "sha">(existingDevice?.v3Config?.authProtocol || "sha");
  const [v3AuthKey, setV3AuthKey] = useState(existingDevice?.v3Config?.authKey || "");
  const [v3PrivProto, setV3PrivProto] = useState<"des" | "aes">(existingDevice?.v3Config?.privProtocol || "aes");
  const [v3PrivKey, setV3PrivKey] = useState(existingDevice?.v3Config?.privKey || "");

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/snmp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port,
          version,
          community,
          v3Config:
            version === "v3"
              ? {
                  user: v3User,
                  level: v3Level,
                  authProtocol: v3AuthProto,
                  authKey: v3AuthKey,
                  privProtocol: v3PrivProto,
                  privKey: v3PrivKey,
                }
              : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.online) {
        setTestResult({
          ok: true,
          message: `Kết nối thành công! ${data.sysName || data.sysDescr || ""} (${data.responseTimeMs}ms)`,
          ms: data.responseTimeMs,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Không thể kết nối tới SNMP agent trên cổng 161 (UDP).",
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || "Lỗi mạng khi kiểm tra SNMP",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) return;

    const device: SnmpDevice = {
      id: existingDevice?.id || `dev_${Date.now()}`,
      name: name.trim(),
      host: host.trim(),
      port: Number(port) || 161,
      version,
      community: community.trim() || "public",
      pollingInterval: Number(pollingInterval) || 5,
      timeout: 2500,
      enabled: true,
      status: "online",
      v3Config:
        version === "v3"
          ? {
              user: v3User,
              level: v3Level,
              authProtocol: v3AuthProto,
              authKey: v3AuthKey,
              privProtocol: v3PrivProto,
              privKey: v3PrivKey,
            }
          : undefined,
    };

    onSave(device);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-2xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {existingDevice ? "Chỉnh sửa Thiết bị SNMP" : "Khai báo Thiết bị SNMP mới"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cấu hình thông số giám sát tương tự PRTG Network Monitor
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick presets helper */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-500 pl-1">Mẫu nhanh:</span>
            <button
              type="button"
              onClick={() => {
                setName("Synology NAS");
                setHost("192.168.1.10");
                setPort(161);
                setVersion("v2c");
                setCommunity("public");
              }}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-semibold border border-slate-200 dark:border-slate-600 hover:shadow-xs"
            >
              Synology NAS
            </button>
            <button
              type="button"
              onClick={() => {
                setName("Router Gateway");
                setHost("192.168.1.1");
                setPort(161);
                setVersion("v2c");
                setCommunity("public");
              }}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold border border-slate-200 dark:border-slate-600 hover:shadow-xs"
            >
              Router / Switch
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên thiết bị hiển thị *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Synology NAS DS920+, MikroTik Core Router..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Địa chỉ IP / Domain *
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.10 hoặc nas.local"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cổng (Port)
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="161"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phiên bản SNMP
              </label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="v2c">SNMP v2c (Phổ biến nhất)</option>
                <option value="v1">SNMP v1 (Thiết bị cũ)</option>
                <option value="v3">SNMP v3 (Mã hóa bảo mật cao)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Chu kỳ quét (Polling)
              </label>
              <select
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={2}>2 giây (Rất nhanh)</option>
                <option value={5}>5 giây (Tiêu chuẩn)</option>
                <option value={10}>10 giây</option>
                <option value={30}>30 giây</option>
                <option value={60}>60 giây (1 phút)</option>
              </select>
            </div>
          </div>

          {version !== "v3" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                SNMP Community String
              </label>
              <input
                type="text"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="public"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Chuỗi nhận thực mặc định trên DSM: Control Panel &gt; Terminal &amp; SNMP &gt; SNMP
              </p>
            </div>
          ) : (
            /* SNMP v3 options */
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-[11px] font-bold text-indigo-500">Cấu hình SNMP v3 Security</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">User name</label>
                  <input
                    type="text"
                    value={v3User}
                    onChange={(e) => setV3User(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Security Level</label>
                  <select
                    value={v3Level}
                    onChange={(e) => setV3Level(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                  >
                    <option value="authPriv">authPriv (Mã hóa + Mật khẩu)</option>
                    <option value="authNoPriv">authNoPriv</option>
                    <option value="noAuthNoPriv">noAuthNoPriv</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Auth (SHA/MD5)</label>
                  <input
                    type="password"
                    placeholder="Mật khẩu Auth"
                    value={v3AuthKey}
                    onChange={(e) => setV3AuthKey(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Priv (AES/DES)</label>
                  <input
                    type="password"
                    placeholder="Mật khẩu Privacy"
                    value={v3PrivKey}
                    onChange={(e) => setV3PrivKey(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
                testResult.ok
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className="truncate">{testResult.message}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? "animate-spin text-sky-500" : ""}`} />
              <span>{testing ? "Đang thử kết nối..." : "Test thử SNMP"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
              >
                {existingDevice ? "Lưu thay đổi" : "Thêm thiết bị"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
