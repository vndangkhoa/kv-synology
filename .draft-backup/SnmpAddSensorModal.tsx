"use client";

import React, { useState } from "react";
import { SnmpSensor, SnmpCategory, SnmpSensorType, SnmpSensorPreset } from "@/lib/snmp/types";
import { SYNOLOGY_SNMP_PRESETS, ROUTER_SNMP_PRESETS } from "@/lib/snmp/presets";
import { Gauge, X, Plus, Sparkles, Sliders, CheckCircle2, ShieldCheck, Thermometer, Cpu, Layers, HardDrive, Zap, Database } from "lucide-react";

interface SnmpAddSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSensor: (sensor: SnmpSensor) => void;
  deviceId: string;
  deviceName: string;
}

export const SnmpAddSensorModal: React.FC<SnmpAddSensorModalProps> = ({
  isOpen,
  onClose,
  onAddSensor,
  deviceId,
  deviceName,
}) => {
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<SnmpSensorPreset | null>(SYNOLOGY_SNMP_PRESETS[0]);

  // Custom Sensor form state
  const [name, setName] = useState("");
  const [oid, setOid] = useState("");
  const [category, setCategory] = useState<SnmpCategory>("custom");
  const [type, setType] = useState<SnmpSensorType>("gauge");
  const [unit, setUnit] = useState("");
  const [multiplier, setMultiplier] = useState<number | undefined>(undefined);
  const [divisor, setDivisor] = useState<number | undefined>(undefined);
  const [warnMax, setWarnMax] = useState<number | undefined>(undefined);
  const [critMax, setCritMax] = useState<number | undefined>(undefined);
  const [warnMin, setWarnMin] = useState<number | undefined>(undefined);
  const [critMin, setCritMin] = useState<number | undefined>(undefined);
  const [matchValue, setMatchValue] = useState<string>("1");
  const [normalText, setNormalText] = useState("Bình thường (Normal)");

  if (!isOpen) return null;

  const handleAddPreset = (preset: SnmpSensorPreset) => {
    const sensor: SnmpSensor = {
      id: `sensor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      deviceId,
      name: preset.name,
      oid: preset.oid,
      type: preset.type,
      category: preset.category,
      unit: preset.unit,
      multiplier: preset.multiplier,
      divisor: preset.divisor,
      decimals: preset.decimals,
      thresholds: preset.thresholds,
      status: "ok",
      currentValue: null,
      displayValue: "Đang chờ dữ liệu...",
      enabled: true,
      history: [],
      lastUpdated: Date.now(),
    };

    onAddSensor(sensor);
    onClose();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !oid.trim()) return;

    let cleanOid = oid.trim();
    if (!cleanOid.startsWith(".")) cleanOid = `.${cleanOid}`;

    const sensor: SnmpSensor = {
      id: `sensor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      deviceId,
      name: name.trim(),
      oid: cleanOid,
      type,
      category,
      unit: unit.trim() || undefined,
      multiplier: multiplier || undefined,
      divisor: divisor || undefined,
      thresholds: {
        warnMax,
        critMax,
        warnMin,
        critMin,
        matchValue: type === "state" ? matchValue : undefined,
        normalText: type === "state" ? normalText : undefined,
      },
      status: "ok",
      currentValue: null,
      displayValue: "Đang chờ dữ liệu...",
      enabled: true,
      history: [],
      lastUpdated: Date.now(),
    };

    onAddSensor(sensor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-500 rounded-2xl">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thêm Sensor Giám sát SNMP
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cho thiết bị: <strong className="text-slate-700 dark:text-slate-200">{deviceName}</strong>
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

        {/* Tab switch (Preset Library vs Custom OID) */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setTab("preset")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === "preset"
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thư viện Mẫu Sensor (Synology / Router)</span>
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === "custom"
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tạo Sensor OID Tùy chỉnh</span>
          </button>
        </div>

        {/* Body Content */}
        {tab === "preset" ? (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                Bộ cảm biến Synology DSM MIBs
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SYNOLOGY_SNMP_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddPreset(p)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-sky-500/50 hover:bg-sky-50/20 dark:hover:bg-sky-950/20 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {p.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{p.oid}</span>
                      <span className="text-sky-500 font-sans font-bold group-hover:underline flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Thêm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Bộ cảm biến Router / Gateway OIDs
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROUTER_SNMP_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddPreset(p)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{p.oid}</span>
                      <span className="text-indigo-500 font-sans font-bold group-hover:underline flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Thêm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Custom OID Form */
          <form onSubmit={handleAddCustom} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Sensor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nhiệt độ CPU, Tốc độ quạt..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã OID (Object Identifier) *
                </label>
                <input
                  type="text"
                  required
                  placeholder=".1.3.6.1.4.1..."
                  value={oid}
                  onChange={(e) => setOid(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Loại dữ liệu
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold"
                >
                  <option value="gauge">Gauge (Đo mức: %, °C, RPM)</option>
                  <option value="traffic">Traffic (Băng thông mạng)</option>
                  <option value="counter">Counter (Bộ đếm tăng dần)</option>
                  <option value="state">State (Trạng thái 1/2/3)</option>
                  <option value="string">String (Chuỗi ký tự/Text)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phân nhóm
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold"
                >
                  <option value="cpu_ram">CPU &amp; Bộ nhớ</option>
                  <option value="storage">Lưu trữ &amp; Ổ đĩa</option>
                  <option value="network">Mạng &amp; Băng thông</option>
                  <option value="environment">Môi trường (Nhiệt độ, Quạt)</option>
                  <option value="ups">Bộ lưu điện UPS</option>
                  <option value="system">Hệ thống chung</option>
                  <option value="custom">Tùy chỉnh khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đơn vị đo (Unit)
                </label>
                <input
                  type="text"
                  placeholder="%, °C, MB/s, RPM..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                />
              </div>
            </div>

            {/* Threshold configurations */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-[11px] font-bold text-sky-500">Cấu hình Ngưỡng cảnh báo PRTG</div>
              {type !== "state" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-amber-500 mb-1">Cảnh báo Vàng (&gt;)</label>
                    <input
                      type="number"
                      placeholder="VD: 75"
                      value={warnMax !== undefined ? warnMax : ""}
                      onChange={(e) => setWarnMax(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-500 mb-1">Nguy hiểm Đỏ (&gt;)</label>
                    <input
                      type="number"
                      placeholder="VD: 90"
                      value={critMax !== undefined ? critMax : ""}
                      onChange={(e) => setCritMax(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-amber-500 mb-1">Cảnh báo Dưới (&lt;)</label>
                    <input
                      type="number"
                      placeholder="VD: 20"
                      value={warnMin !== undefined ? warnMin : ""}
                      onChange={(e) => setWarnMin(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-rose-500 mb-1">Nguy hiểm Dưới (&lt;)</label>
                    <input
                      type="number"
                      placeholder="VD: 10"
                      value={critMin !== undefined ? critMin : ""}
                      onChange={(e) => setCritMin(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-500 mb-1">Giá trị Bình thường (OK)</label>
                    <input
                      type="text"
                      placeholder="1"
                      value={matchValue}
                      onChange={(e) => setMatchValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nhãn hiển thị OK</label>
                    <input
                      type="text"
                      placeholder="Bình thường (Normal)"
                      value={normalText}
                      onChange={(e) => setNormalText(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
              >
                Tạo Sensor
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
