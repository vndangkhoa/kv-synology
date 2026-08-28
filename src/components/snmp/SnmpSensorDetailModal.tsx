"use client";

import React from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { SnmpDevice, SnmpSensor } from "@/lib/snmp/types";
import { Sparkline, DualSparkline } from "@/components/common/Sparkline";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Activity } from "lucide-react";

interface SensorRuntime {
  value: number | null;
  status: "up" | "down" | "unknown";
  error?: string | null;
  history: number[];
  inHistory: number[];
  outHistory: number[];
  lastRaw?: number | null;
}

interface Props {
  device: SnmpDevice;
  sensor: SnmpSensor;
  runtime: SensorRuntime | undefined;
  onClose: () => void;
}

function formatValue(sensor: SnmpSensor, rt: SensorRuntime | undefined) {
  if (!rt) return "—";
  const v = rt.value;
  if (sensor.kind === "uptime") {
    if (v == null) return "—";
    return `${(v / 86400).toFixed(1)} ${sensor.unit || "ngày"}`;
  }
  if (v == null) return "—";
  if (sensor.kind === "traffic") return `${v.toFixed(1)} ${sensor.unit || "kb/s"}`;
  const digits = Math.abs(v) >= 100 ? 0 : 1;
  return `${v.toFixed(digits)} ${sensor.unit || ""}`.trim();
}

function statusMeta(status: "up" | "down" | "unknown" | undefined, t: any) {
  if (status === "up")
    return { label: t.snmp.statusUp, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  if (status === "down")
    return { label: t.snmp.statusDown, cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" };
  return { label: t.snmp.statusUnknown, cls: "bg-slate-400/10 text-slate-500" };
}

export const SnmpSensorDetailModal: React.FC<Props> = ({ device, sensor, runtime, onClose }) => {
  const { t } = useAppStore();
  const meta = statusMeta(runtime?.status, t);

  return (
    <ResponsiveModal open={!!sensor} onClose={onClose} title={sensor.name} icon={<Activity className="w-5 h-5" />} maxWidth="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400 font-mono">{device.name}</p>
            <p className="text-[11px] text-slate-400">
              {t.snmp.kind}: {sensor.kind ? (t.snmp.sensorKind as any)[sensor.kind] : "Sensor"}
              {sensor.oid ? ` · ${sensor.oid}` : ""}
              {sensor.ifIndex != null ? ` · ifIndex ${sensor.ifIndex}` : ""}
              {sensor.pingPort != null ? ` · port ${sensor.pingPort}` : ""}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${meta.cls}`}>{meta.label}</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatValue(sensor, runtime)}</p>
          {sensor.kind === "traffic" && (runtime?.inHistory.length || 0) > 0 && (
            <div className="flex items-center justify-center gap-4 text-xs mt-1">
              <span className="text-sky-500">
                ↓ {((runtime?.inHistory?.[runtime.inHistory.length - 1]) || 0).toFixed(1)} {sensor.unit}
              </span>
              <span className="text-amber-500">
                ↑ {((runtime?.outHistory?.[runtime.outHistory.length - 1]) || 0).toFixed(1)} {sensor.unit}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t.snmp.history}</p>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
            {sensor.kind === "traffic" ? (
              <DualSparkline
                series1={runtime?.inHistory || []}
                series2={runtime?.outHistory || []}
                color1="#0284c7"
                color2="#f59e0b"
                height={64}
              />
            ) : (
              <Sparkline data={runtime?.history || []} color="#0284c7" height={64} />
            )}
          </div>
        </div>

        {runtime?.error && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
            {runtime.error}
          </div>
        )}

        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            {t.snmp.rawValue}: {runtime?.lastRaw != null ? runtime.lastRaw : "—"}
          </span>
          <span>{device.host}:{device.port}</span>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default SnmpSensorDetailModal;
