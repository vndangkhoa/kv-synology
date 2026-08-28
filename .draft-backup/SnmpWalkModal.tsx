"use client";

import React, { useState } from "react";
import { SnmpDevice, SnmpWalkResult, SnmpSensor } from "@/lib/snmp/types";
import { Compass, X, Search, Plus, Play, RefreshCw, AlertTriangle, CheckCircle, Copy, Check } from "lucide-react";

interface SnmpWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: SnmpDevice;
  onAddSensorFromOid: (sensor: SnmpSensor) => void;
}

export const SnmpWalkModal: React.FC<SnmpWalkModalProps> = ({
  isOpen,
  onClose,
  device,
  onAddSensorFromOid,
}) => {
  const [rootOid, setRootOid] = useState(".1.3.6.1.4.1.6574"); // Synology MIB
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SnmpWalkResult[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedOid, setCopiedOid] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunWalk = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/snmp/walk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: device.host,
          port: device.port,
          version: device.version,
          community: device.community,
          v3Config: device.v3Config,
          rootOid,
          maxRepetitions: 60,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setResults(data.data);
      } else {
        setError(data.error || "Không thể thực hiện SNMP Walk trên nhánh OID này.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối khi gửi yêu cầu SNMP Walk");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (oid: string) => {
    navigator.clipboard.writeText(oid);
    setCopiedOid(oid);
    setTimeout(() => setCopiedOid(null), 2000);
  };

  const handleCreateSensor = (item: SnmpWalkResult) => {
    const isNum = typeof item.value === "number";
    const sensor: SnmpSensor = {
      id: `sensor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      deviceId: device.id,
      name: `OID ${item.oid.split(".").slice(-2).join(".")}`,
      oid: item.oid,
      type: isNum ? "gauge" : "string",
      category: "custom",
      status: "ok",
      currentValue: item.value,
      displayValue: String(item.value),
      enabled: true,
      history: isNum ? [{ timestamp: Date.now(), value: Number(item.value) }] : [],
      lastUpdated: Date.now(),
    };

    onAddSensorFromOid(sensor);
  };

  const filteredResults = results.filter(
    (r) =>
      r.oid.toLowerCase().includes(search.toLowerCase()) ||
      String(r.value).toLowerCase().includes(search.toLowerCase()) ||
      String(r.type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Khám phá Cây OID (PRTG SNMP Walk / MIB Explorer)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết bị: <strong className="text-slate-700 dark:text-slate-200">{device.name}</strong> ({device.host}:{device.port})
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

        {/* Toolbar & Query input */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-3 py-1.5 shadow-xs">
              <span className="text-xs font-bold text-slate-400 mr-2 shrink-0">Nhánh OID Root:</span>
              <input
                type="text"
                value={rootOid}
                onChange={(e) => setRootOid(e.target.value)}
                placeholder=".1.3.6.1.4.1.6574 (Synology) hoặc .1.3.6.1.2.1"
                className="w-full bg-transparent text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleRunWalk}
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{loading ? "Đang quét OID..." : "Bắt đầu Walk"}</span>
            </button>
          </div>

          {/* Quick branch selectors */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-400">Gợi ý nhánh:</span>
            {[
              { label: "Synology MIB (.6574)", oid: ".1.3.6.1.4.1.6574" },
              { label: "UCD System (.2021)", oid: ".1.3.6.1.4.1.2021" },
              { label: "Standard Interfaces (RFC1213)", oid: ".1.3.6.1.2.1.2.2" },
              { label: "Host Resources (RFC2790)", oid: ".1.3.6.1.2.1.25" },
              { label: "System Info (.1.3.6.1.2.1.1)", oid: ".1.3.6.1.2.1.1" },
            ].map((b) => (
              <button
                key={b.oid}
                onClick={() => setRootOid(b.oid)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium border transition-colors ${
                  rootOid === b.oid
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="flex items-center justify-between gap-2 pb-2">
              <span className="text-xs font-bold text-slate-500">
                Tìm thấy {results.length} OID khả dụng
              </span>
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Lọc OID hoặc giá trị..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {results.length === 0 && !loading && !error && (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Compass className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Chưa có dữ liệu SNMP Walk</p>
              <p className="text-[11px]">Bấm nút &quot;Bắt đầu Walk&quot; để quét và liệt kê toàn bộ OID từ thiết bị</p>
            </div>
          )}

          {filteredResults.length > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {filteredResults.map((item, idx) => (
                <div
                  key={`${item.oid}_${idx}`}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.oid}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {item.type}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg truncate inline-block max-w-full">
                      {String(item.value)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleCopy(item.oid)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 text-[11px] flex items-center gap-1"
                      title="Copy OID"
                    >
                      {copiedOid === item.oid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleCreateSensor(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      title="Tạo sensor từ OID này"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo Sensor</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Hỗ trợ duyệt MIB tiêu chuẩn RFC1213, RFC2790 và Synology Private OIDs</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold text-slate-700 dark:text-slate-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
