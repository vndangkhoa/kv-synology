"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  SnmpDevice,
  SnmpSensor,
  SensorKind,
  SnmpVersion,
  V3Level,
  AuthProtocol,
  PrivProtocol,
} from "@/lib/snmp/types";
import { SENSOR_PRESETS, SENSOR_KIND_ORDER } from "@/lib/snmp/presets";
import { genId } from "@/lib/snmp/storage";
import { discoverInterfaces, DiscoveredInterface } from "@/lib/snmp/client";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Plus, Trash2, Gauge, RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  editing: SnmpDevice | null;
  onClose: () => void;
  onSave: (device: SnmpDevice) => void;
}

function blankSensor(kind: SensorKind): SnmpSensor {
  const preset = SENSOR_PRESETS[kind];
  return {
    id: genId("sensor"),
    name: preset.label,
    kind,
    oid: preset.oid,
    unit: preset.unit,
    scale: preset.scale ?? 1,
  };
}

export const SnmpDeviceModal: React.FC<Props> = ({ open, editing, onClose, onSave }) => {
  const { t } = useAppStore();
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(161);
  const [version, setVersion] = useState<SnmpVersion>("v2c");
  const [community, setCommunity] = useState("public");
  const [v3User, setV3User] = useState("");
  const [v3AuthPass, setV3AuthPass] = useState("");
  const [v3PrivPass, setV3PrivPass] = useState("");
  const [v3AuthProtocol, setV3AuthProtocol] = useState<AuthProtocol>("sha");
  const [v3PrivProtocol, setV3PrivProtocol] = useState<PrivProtocol>("aes");
  const [v3Level, setV3Level] = useState<V3Level>("authPriv");
  const [pollIntervalSec, setPollIntervalSec] = useState(5);
  const [sensors, setSensors] = useState<SnmpSensor[]>([]);
  const [interfaces, setInterfaces] = useState<DiscoveredInterface[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setInterfaces([]);
    if (editing) {
      setName(editing.name);
      setHost(editing.host);
      setPort(editing.port || 161);
      setVersion(editing.credentials?.version || "v2c");
      setCommunity(editing.credentials?.community || "public");
      setV3User(editing.credentials?.v3User || "");
      setV3AuthPass(editing.credentials?.v3AuthPass || "");
      setV3PrivPass(editing.credentials?.v3PrivPass || "");
      setV3AuthProtocol(editing.credentials?.v3AuthProtocol || "sha");
      setV3PrivProtocol(editing.credentials?.v3PrivProtocol || "aes");
      setV3Level(editing.credentials?.v3Level || "authPriv");
      setPollIntervalSec(editing.pollIntervalSec || 5);
      setSensors(Array.isArray(editing.sensors) ? editing.sensors.map((s) => ({ ...s })) : []);
    } else {
      setName("");
      setHost("");
      setPort(161);
      setVersion("v2c");
      setCommunity("public");
      setV3User("");
      setV3AuthPass("");
      setV3PrivPass("");
      setV3Level("authPriv");
      setPollIntervalSec(5);
      setSensors([blankSensor("ping"), blankSensor("cpu"), blankSensor("memory"), blankSensor("uptime")]);
    }
  }, [open, editing]);

  const addSensor = (kind: SensorKind) => setSensors((s) => [...s, blankSensor(kind)]);
  const removeSensor = (id: string) => setSensors((s) => s.filter((x) => x.id !== id));
  const updateSensor = (id: string, patch: Partial<SnmpSensor>) =>
    setSensors((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const handleDiscover = async (sensorId: string) => {
    setDiscovering(true);
    try {
      const list = await discoverInterfaces({ host, port, credentials: buildCredentials() });
      setInterfaces(list);
      if (list.length > 0) {
        updateSensor(sensorId, { ifIndex: list[0].ifIndex });
      }
    } catch (e: any) {
      setError(e?.message || "discover failed");
    } finally {
      setDiscovering(false);
    }
  };

  const buildCredentials = () => ({
    version,
    community,
    v3User,
    v3AuthPass,
    v3PrivPass,
    v3AuthProtocol,
    v3PrivProtocol,
    v3Level,
  });

  const handleSave = () => {
    if (!name.trim() || !host.trim()) {
      setError(`${t.snmp.deviceName} / ${t.snmp.host} ${t.snmp.statusUnknown}`);
      return;
    }
    if (sensors.length === 0) {
      setError(t.snmp.addSensor);
      return;
    }
    const device: SnmpDevice = {
      id: editing?.id || genId("device"),
      name: name.trim(),
      host: host.trim(),
      port,
      credentials: buildCredentials(),
      sensors,
      pollIntervalSec,
      createdAt: editing?.createdAt || Date.now(),
    };
    onSave(device);
  };

  const inputCls =
    "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500";
  const labelCls = "text-[11px] font-medium text-slate-500 dark:text-slate-400";

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={editing ? t.snmp.editDevice : t.snmp.addDevice}
      icon={<Gauge className="w-5 h-5" />}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all"
          >
            {t.common.save}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelCls}>{t.snmp.deviceName}</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Core Switch" />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>{t.snmp.host}</label>
            <input className={inputCls} value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.1" />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>{t.snmp.port}</label>
            <input
              type="number"
              className={inputCls}
              value={port}
              onChange={(e) => setPort(Number(e.target.value) || 161)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>{t.snmp.polling}</label>
            <input
              type="number"
              className={inputCls}
              value={pollIntervalSec}
              onChange={(e) => setPollIntervalSec(Number(e.target.value) || 5)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelCls}>{t.snmp.version}</label>
          <div className="flex gap-1.5">
            {(["v1", "v2c", "v3"] as SnmpVersion[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVersion(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  version === v
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {version === "v3" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <label className={labelCls}>{t.snmp.v3User}</label>
              <input className={inputCls} value={v3User} onChange={(e) => setV3User(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>{t.snmp.securityLevel}</label>
              <select
                className={inputCls}
                value={v3Level}
                onChange={(e) => setV3Level(e.target.value as V3Level)}
              >
                <option value="noAuthNoPriv">noAuthNoPriv</option>
                <option value="authNoPriv">authNoPriv</option>
                <option value="authPriv">authPriv</option>
              </select>
            </div>
            {v3Level !== "noAuthNoPriv" && (
              <div className="space-y-1">
                <label className={labelCls}>{t.snmp.authPass}</label>
                <input
                  type="password"
                  className={inputCls}
                  value={v3AuthPass}
                  onChange={(e) => setV3AuthPass(e.target.value)}
                />
              </div>
            )}
            {v3Level === "authPriv" && (
              <>
                <div className="space-y-1">
                  <label className={labelCls}>{t.snmp.authProtocol}</label>
                  <select
                    className={inputCls}
                    value={v3AuthProtocol}
                    onChange={(e) => setV3AuthProtocol(e.target.value as AuthProtocol)}
                  >
                    {["md5", "sha", "sha224", "sha256", "sha384", "sha512"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>{t.snmp.privPass}</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={v3PrivPass}
                    onChange={(e) => setV3PrivPass(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>{t.snmp.privProtocol}</label>
                  <select
                    className={inputCls}
                    value={v3PrivProtocol}
                    onChange={(e) => setV3PrivProtocol(e.target.value as PrivProtocol)}
                  >
                    {["des", "aes", "aes192", "aes256", "3des"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <label className={labelCls}>{t.snmp.community}</label>
            <input className={inputCls} value={community} onChange={(e) => setCommunity(e.target.value)} />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`${labelCls} text-sm font-bold text-slate-700 dark:text-slate-200`}>
              {t.snmp.sensors}
            </label>
            <div className="flex flex-wrap gap-1">
              {SENSOR_KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => addSensor(k)}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {t.snmp.sensorKind[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {sensors.map((sensor) => (
              <div
                key={sensor.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={sensor.name}
                    onChange={(e) => updateSensor(sensor.id, { name: e.target.value })}
                  />
                  <select
                    className={inputCls}
                    value={sensor.kind}
                    onChange={(e) => {
                      const k = e.target.value as SensorKind;
                      updateSensor(sensor.id, {
                        kind: k,
                        oid: SENSOR_PRESETS[k].oid,
                        unit: SENSOR_PRESETS[k].unit,
                        scale: SENSOR_PRESETS[k].scale ?? 1,
                      });
                    }}
                  >
                    {SENSOR_KIND_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {t.snmp.sensorKind[k]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSensor(sensor.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sensor.kind === "ping" && (
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <label className={labelCls}>{t.snmp.pingPort}</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={sensor.pingPort ?? 80}
                        onChange={(e) => updateSensor(sensor.id, { pingPort: Number(e.target.value) || 80 })}
                      />
                    </div>
                  )}
                  {(sensor.kind === "custom" || sensor.kind === "disk") && (
                    <>
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <label className={labelCls}>{t.snmp.oid}</label>
                        <input
                          className={inputCls}
                          value={sensor.oid || ""}
                          onChange={(e) => updateSensor(sensor.id, { oid: e.target.value })}
                          placeholder="1.3.6.1..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>{t.snmp.unit}</label>
                        <input
                          className={inputCls}
                          value={sensor.unit || ""}
                          onChange={(e) => updateSensor(sensor.id, { unit: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>{t.snmp.scale}</label>
                        <input
                          type="number"
                          step="0.01"
                          className={inputCls}
                          value={sensor.scale ?? 1}
                          onChange={(e) => updateSensor(sensor.id, { scale: Number(e.target.value) || 1 })}
                        />
                      </div>
                    </>
                  )}
                  {sensor.kind === "traffic" && (
                    <>
                      <div className="space-y-1">
                        <label className={labelCls}>{t.snmp.ifIndex}</label>
                        <input
                          type="number"
                          className={inputCls}
                          value={sensor.ifIndex ?? 1}
                          onChange={(e) => updateSensor(sensor.id, { ifIndex: Number(e.target.value) || 1 })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDiscover(sensor.id)}
                        disabled={discovering || !host.trim()}
                        className="self-end flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${discovering ? "animate-spin" : ""}`} />
                        {t.snmp.discover}
                      </button>
                    </>
                  )}
                </div>

                {sensor.kind === "traffic" && interfaces.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {interfaces.map((iface) => (
                      <button
                        key={iface.ifIndex}
                        type="button"
                        onClick={() => updateSensor(sensor.id, { ifIndex: iface.ifIndex })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${
                          sensor.ifIndex === iface.ifIndex
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {iface.ifIndex}: {String(iface.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sensors.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">{t.snmp.addSensor}</p>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400">{t.snmp.enableSnmpHint}</p>
      </div>
    </ResponsiveModal>
  );
};

export default SnmpDeviceModal;
