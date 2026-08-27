"use client";

import React, { useState, useEffect } from "react";
import { DockerContainerDetails, DockerPortBinding, DockerVolumeMount, DockerEnvVar } from "@/lib/dsm/types";
import { dsmClient } from "@/lib/dsm/client";
import {
  X,
  Play,
  Square,
  RotateCw,
  Trash2,
  Cpu,
  Layers,
  Activity,
  Globe,
  HardDrive,
  Terminal,
  FileText,
  Sliders,
  Check,
  AlertTriangle,
  Plus,
  Copy,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  ArrowRight,
  Wifi,
  Server,
  Zap,
} from "lucide-react";

interface DockerDetailModalProps {
  container: DockerContainerDetails;
  onClose: () => void;
  onRefresh: () => void;
}

export const DockerDetailModal: React.FC<DockerDetailModalProps> = ({
  container: initialContainer,
  onClose,
  onRefresh,
}) => {
  const [container, setContainer] = useState<DockerContainerDetails>(initialContainer);
  const [activeTab, setActiveTab] = useState<"stats" | "config" | "logs" | "exec">("stats");
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit State
  const [editPorts, setEditPorts] = useState<DockerPortBinding[]>(container.portBindings || []);
  const [editMounts, setEditMounts] = useState<DockerVolumeMount[]>(container.volumeMounts || []);
  const [editEnvs, setEditEnvs] = useState<DockerEnvVar[]>(container.envVars || []);
  const [editCpuLimit, setEditCpuLimit] = useState(container.cpuLimit || 2);
  const [editMemoryLimitMB, setEditMemoryLimitMB] = useState(container.memoryLimitMB || 512);
  const [editRestartPolicy, setEditRestartPolicy] = useState(container.restartPolicy || "unless-stopped");
  const [savingConfig, setSavingConfig] = useState(false);

  // New row inputs for config tables
  const [newHostPort, setNewHostPort] = useState("");
  const [newContainerPort, setNewContainerPort] = useState("");
  const [newPortProto, setNewPortProto] = useState<"tcp" | "udp">("tcp");

  const [newHostPath, setNewHostPath] = useState("");
  const [newContainerPath, setNewContainerPath] = useState("");
  const [newMountMode, setNewMountMode] = useState<"rw" | "ro">("rw");

  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  // Logs State
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("");

  // Exec Terminal State
  const [execCmd, setExecCmd] = useState("");
  const [execHistory, setExecHistory] = useState<Array<{ cmd: string; output: string; time: string }>>([]);
  const [execRunning, setExecRunning] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch full details & telemetry
  const fetchDetails = async () => {
    try {
      const details = await dsmClient.getDockerContainerDetails(container.id || container.name);
      if (details) {
        setContainer(details);
        setEditPorts(details.portBindings || []);
        setEditMounts(details.volumeMounts || []);
        setEditEnvs(details.envVars || []);
        setEditCpuLimit(details.cpuLimit || 2);
        setEditMemoryLimitMB(details.memoryLimitMB || 512);
        setEditRestartPolicy(details.restartPolicy || "unless-stopped");
      }
    } catch (_) {}
  };

  // Fetch logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await dsmClient.getDockerContainerLogs(container.name || container.id, 100);
      setLogs(data);
    } catch (_) {}
    finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchLogs();
  }, [container.id]);

  // Handle Lifecycle actions (start, stop, restart)
  const handleAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(true);
    try {
      await dsmClient.toggleDockerContainer(container.name || container.id, action);
      showToast("success", `Đã gửi lệnh ${action === "start" ? "Khởi chạy" : action === "stop" ? "Dừng" : "Khởi động lại"} container thành công.`);
      await fetchDetails();
      onRefresh();
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa container "${container.name}"? Dữ liệu chưa gắn kết volume sẽ bị xóa.`)) return;
    setActionLoading(true);
    try {
      await dsmClient.deleteDockerContainer(container.name || container.id, true);
      showToast("success", `Đã xóa container ${container.name} thành công.`);
      onRefresh();
      onClose();
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
      setActionLoading(false);
    }
  };

  // Handle Save Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const updates: Partial<DockerContainerDetails> = {
        portBindings: editPorts,
        volumeMounts: editMounts,
        envVars: editEnvs,
        cpuLimit: Number(editCpuLimit),
        memoryLimitMB: Number(editMemoryLimitMB),
        restartPolicy: editRestartPolicy as any,
      };

      await dsmClient.updateDockerContainer(container.name || container.id, updates);
      showToast("success", "Đã cập nhật cấu hình container thành công!");
      await fetchDetails();
      onRefresh();
    } catch (e: any) {
      showToast("error", `Lỗi lưu cấu hình: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Exec command
  const handleExecSubmit = async (e?: React.FormEvent, customCmd?: string) => {
    if (e) e.preventDefault();
    const cmd = customCmd || execCmd;
    if (!cmd.trim()) return;
    setExecRunning(true);
    try {
      const res = await dsmClient.execDockerCommand(container.name || container.id, cmd.trim());
      setExecHistory((prev) => [
        {
          cmd: cmd.trim(),
          output: res.stdout || res.stderr || "(Không có kết quả trả về)",
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      if (!customCmd) setExecCmd("");
    } catch (e: any) {
      setExecHistory((prev) => [
        {
          cmd: cmd.trim(),
          output: `Lỗi: ${e.message}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } finally {
      setExecRunning(false);
    }
  };

  const isRunning = container.status === "running";

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-bottom-5 duration-200 ${
            toastMsg.type === "success"
              ? "bg-emerald-500 text-white border-emerald-400"
              : "bg-rose-500 text-white border-rose-400"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {container.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                    isRunning
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span>{isRunning ? "Đang chạy (Running)" : "Đã dừng (Stopped)"}</span>
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 truncate mt-0.5" title={container.image}>
                {container.image} • {container.uptime || "Khởi tạo 2026"}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isRunning ? (
              <>
                <button
                  onClick={() => handleAction("restart")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Khởi động lại"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Khởi động lại</span>
                </button>

                <button
                  onClick={() => handleAction("stop")}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Dừng container"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Dừng</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleAction("start")}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Khởi chạy container"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Khởi chạy</span>
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Xóa container"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 pt-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-900 shrink-0">
          {[
            { id: "stats", label: "📊 Thống kê & Giám sát", icon: Activity },
            { id: "config", label: "⚙️ Cấu hình & Chỉnh sửa", icon: Sliders },
            { id: "logs", label: "📜 Nhật ký Container", icon: FileText },
            { id: "exec", label: "💻 Thực thi lệnh (Exec)", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 ${
                  isSel
                    ? "border-sky-500 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-800/80 shadow-xs"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* ==================== SUB-TAB 1: STATS & TELEMETRY ==================== */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold">Sử dụng CPU</span>
                    <Cpu className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {container.stats?.cpuPercent?.toFixed(1) || container.cpuUsage || 0.8}%
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">Giới hạn: {container.cpuLimit || 2} Cores</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold">Bộ nhớ RAM</span>
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {container.memoryUsage || "64.2 MB"}
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">Giới hạn: {container.memoryLimitMB || 512} MB</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold">Mạng (Network I/O)</span>
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white font-mono truncate">
                    ↓ {formatBytes(container.stats?.networkRxBytes || 154000000)}
                  </p>
                  <span className="text-[10px] text-slate-400 block font-mono truncate">
                    ↑ {formatBytes(container.stats?.networkTxBytes || 89000000)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold">Tiến trình (PIDs)</span>
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {container.stats?.pidsCount || 14} PIDs
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">Auto-Restart: {container.restartPolicy}</span>
                </div>
              </div>

              {/* Network & Metadata Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-500" />
                  Thông tin Mạng & Định tuyến Container
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Địa chỉ IP Container:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {container.ipAddress || "172.17.0.2"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Gateway:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {container.gateway || "172.17.0.1"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Địa chỉ MAC:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {container.macAddress || "02:42:ac:11:00:02"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-200/40 dark:border-slate-700/60">
                  <span>Network Mode: <strong>{container.networkMode || "bridge"}</strong></span>
                  <span>Command: <strong>{container.command || "/init"}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SUB-TAB 2: CONFIGURATION & EDIT ==================== */}
          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* 1. Port Forwarding Table */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-500" />
                    Cổng chuyển tiếp (Port Forwarding: Host → Container)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {editPorts.length} Ports
                  </span>
                </div>

                <div className="space-y-2">
                  {editPorts.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white flex items-center justify-between">
                        <span>Host Port: <strong>{p.hostPort}</strong></span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>Container Port: <strong>{p.containerPort}</strong> ({p.protocol.toUpperCase()})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPorts(editPorts.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Port Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Cổng Host (8080)"
                      value={newHostPort}
                      onChange={(e) => setNewHostPort(e.target.value)}
                      className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Cổng Container (80)"
                      value={newContainerPort}
                      onChange={(e) => setNewContainerPort(e.target.value)}
                      className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                    />
                    <select
                      value={newPortProto}
                      onChange={(e) => setNewPortProto(e.target.value as any)}
                      className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (newHostPort && newContainerPort) {
                          setEditPorts([...editPorts, { hostPort: newHostPort, containerPort: newContainerPort, protocol: newPortProto }]);
                          setNewHostPort("");
                          setNewContainerPort("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Volume Mounts Table */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-500" />
                    Thư mục gắn kết (Volume Mounts: Host Path → Container Mount)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {editMounts.length} Mounts
                  </span>
                </div>

                <div className="space-y-2">
                  {editMounts.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white flex items-center justify-between truncate">
                        <span className="truncate" title={m.hostPath}>{m.hostPath}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-2" />
                        <span className="truncate font-bold" title={m.containerPath}>{m.containerPath} ({m.mode.toUpperCase()})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditMounts(editMounts.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Mount Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Đường dẫn Host (/volume2/docker/app)"
                      value={newHostPath}
                      onChange={(e) => setNewHostPath(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Thư mục Container (/data)"
                      value={newContainerPath}
                      onChange={(e) => setNewContainerPath(e.target.value)}
                      className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                    />
                    <select
                      value={newMountMode}
                      onChange={(e) => setNewMountMode(e.target.value as any)}
                      className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    >
                      <option value="rw">RW (Đọc/Ghi)</option>
                      <option value="ro">RO (Chỉ đọc)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (newHostPath && newContainerPath) {
                          setEditMounts([...editMounts, { hostPath: newHostPath, containerPath: newContainerPath, mode: newMountMode }]);
                          setNewHostPath("");
                          setNewContainerPath("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Environment Variables Table */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    Biến môi trường (Environment Variables - ENV)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {editEnvs.length} Variables
                  </span>
                </div>

                <div className="space-y-2">
                  {editEnvs.map((e, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white flex items-center justify-between">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{e.key}</span>
                        <span className="text-slate-400">=</span>
                        <span>{e.value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditEnvs(editEnvs.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Env Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="KEY (VD: TZ)"
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value)}
                      className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs uppercase"
                    />
                    <input
                      type="text"
                      placeholder="VALUE (VD: Asia/Ho_Chi_Minh)"
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newEnvKey) {
                          setEditEnvs([...editEnvs, { key: newEnvKey.trim(), value: newEnvValue.trim() }]);
                          setNewEnvKey("");
                          setNewEnvValue("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Resource Limits & Policies */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Giới hạn CPU Cores:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={editCpuLimit}
                    onChange={(e) => setEditCpuLimit(parseInt(e.target.value, 10) || 2)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Giới hạn RAM (MB):
                  </label>
                  <input
                    type="number"
                    min={64}
                    max={32768}
                    step={64}
                    value={editMemoryLimitMB}
                    onChange={(e) => setEditMemoryLimitMB(parseInt(e.target.value, 10) || 512)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Tự động khởi động lại:
                  </label>
                  <select
                    value={editRestartPolicy}
                    onChange={(e) => setEditRestartPolicy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="unless-stopped">Unless Stopped (Khuyến nghị)</option>
                    <option value="always">Always (Luôn luôn)</option>
                    <option value="on-failure">On Failure (Khi gặp lỗi)</option>
                    <option value="no">No (Không tự bật)</option>
                  </select>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Lưu & Áp dụng thay đổi vào Container</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================== SUB-TAB 3: CONSOLE LOGS ==================== */}
          {activeTab === "logs" && (
            <div className="space-y-3 flex flex-col h-[400px]">
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Lọc nhật ký..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <button
                  onClick={fetchLogs}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
                  <span>Làm mới</span>
                </button>
              </div>

              <div className="flex-1 bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-y-auto space-y-1 leading-relaxed border border-slate-800 shadow-inner">
                {logs
                  .filter((l) => l.toLowerCase().includes(logFilter.toLowerCase()))
                  .map((log, idx) => (
                    <div key={idx} className="hover:bg-slate-900 px-1 py-0.5 rounded">
                      {log}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ==================== SUB-TAB 4: EXEC TERMINAL ==================== */}
          {activeTab === "exec" && (
            <div className="space-y-3 flex flex-col h-[400px]">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="text-[11px] font-bold text-slate-500">Lệnh nhanh:</span>
                {[
                  { label: "Tiến trình (ps aux)", cmd: "ps aux" },
                  { label: "Biến ENV", cmd: "env" },
                  { label: "Dung lượng đĩa", cmd: "df -h" },
                  { label: "Hệ điều hành", cmd: "cat /etc/os-release" },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleExecSubmit(undefined, p.cmd)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Terminal Output */}
              <div className="flex-1 bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-y-auto space-y-3 border border-slate-800 shadow-inner">
                {execHistory.length === 0 ? (
                  <div className="text-slate-500 italic">
                    Nhập lệnh bên dưới hoặc nhấn lệnh mẫu để thực thi trực tiếp bên trong container...
                  </div>
                ) : (
                  execHistory.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-sky-400 flex items-center justify-between">
                        <span>root@{container.name}:~# {item.cmd}</span>
                        <span className="text-[10px] text-slate-500">{item.time}</span>
                      </div>
                      <pre className="text-slate-200 whitespace-pre-wrap pl-2 border-l border-emerald-500/30">
                        {item.output}
                      </pre>
                    </div>
                  ))
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleExecSubmit} className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Terminal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={execCmd}
                    onChange={(e) => setExecCmd(e.target.value)}
                    placeholder="Nhập lệnh (VD: ls -la, ping 1.1.1.1, netstat -tlpn)..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={execRunning}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  {execRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Thực thi</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
