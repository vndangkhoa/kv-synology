"use client";

import React, { useState } from "react";
import { DockerContainerDetails, DockerPortBinding, DockerVolumeMount, DockerEnvVar } from "@/lib/dsm/types";
import { dsmClient } from "@/lib/dsm/client";
import {
  X,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Boxes,
  Globe,
  HardDrive,
  Sliders,
  RefreshCw,
  ArrowRight,
  Zap,
} from "lucide-react";

interface DockerCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const DockerCreateModal: React.FC<DockerCreateModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [ports, setPorts] = useState<DockerPortBinding[]>([]);
  const [mounts, setMounts] = useState<DockerVolumeMount[]>([]);
  const [envs, setEnvs] = useState<DockerEnvVar[]>([]);
  const [cpuLimit, setCpuLimit] = useState(2);
  const [memoryLimitMB, setMemoryLimitMB] = useState(512);
  const [restartPolicy, setRestartPolicy] = useState<"unless-stopped" | "always" | "on-failure" | "no">("unless-stopped");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Input states
  const [hostPort, setHostPort] = useState("");
  const [containerPort, setContainerPort] = useState("");
  const [portProto, setPortProto] = useState<"tcp" | "udp">("tcp");

  const [hostPath, setHostPath] = useState("");
  const [containerPath, setContainerPath] = useState("");

  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");

  // Presets
  const applyPreset = (preset: "nginx" | "redis" | "adguard" | "vaultwarden") => {
    switch (preset) {
      case "nginx":
        setName("my-nginx-web");
        setImage("nginx:alpine");
        setPorts([{ hostPort: "8080", containerPort: "80", protocol: "tcp" }]);
        setMounts([{ hostPath: "/volume2/docker/nginx/html", containerPath: "/usr/share/nginx/html", mode: "rw" }]);
        break;
      case "redis":
        setName("my-redis-cache");
        setImage("redis:alpine");
        setPorts([{ hostPort: "6379", containerPort: "6379", protocol: "tcp" }]);
        setMounts([{ hostPath: "/volume2/docker/redis/data", containerPath: "/data", mode: "rw" }]);
        break;
      case "adguard":
        setName("adguard-dns");
        setImage("adguard/adguardhome:latest");
        setPorts([
          { hostPort: "53", containerPort: "53", protocol: "udp" },
          { hostPort: "3000", containerPort: "3000", protocol: "tcp" },
        ]);
        setMounts([
          { hostPath: "/volume2/docker/adguard/work", containerPath: "/opt/adguardhome/work", mode: "rw" },
          { hostPath: "/volume2/docker/adguard/conf", containerPath: "/opt/adguardhome/conf", mode: "rw" },
        ]);
        break;
      case "vaultwarden":
        setName("vaultwarden-pass");
        setImage("vaultwarden/server:latest");
        setPorts([{ hostPort: "8088", containerPort: "80", protocol: "tcp" }]);
        setMounts([{ hostPath: "/volume2/docker/vaultwarden/data", containerPath: "/data", mode: "rw" }]);
        setEnvs([
          { key: "SIGNUPS_ALLOWED", value: "true" },
          { key: "TZ", value: "Asia/Ho_Chi_Minh" },
        ]);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !image.trim()) {
      setErrorMsg("Vui lòng nhập tên container và image!");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const portStrings = ports.map((p) => `${p.hostPort}:${p.containerPort}${p.protocol === "udp" ? "/udp" : ""}`);
      await dsmClient.createDockerContainer({
        name: name.trim(),
        image: image.trim(),
        ports: portStrings,
        portBindings: ports,
        volumeMounts: mounts,
        envVars: envs,
        cpuLimit,
        memoryLimitMB,
        restartPolicy,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi tạo container");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Khởi tạo Docker Container Mới
              </h3>
              <p className="text-xs text-slate-400">Triển khai ứng dụng container hóa trên Synology DSM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Mẫu ứng dụng phổ biến:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "nginx", label: "Nginx Web Server" },
                { id: "redis", label: "Redis In-Memory Cache" },
                { id: "adguard", label: "AdGuard Home DNS" },
                { id: "vaultwarden", label: "Vaultwarden Password" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id as any)}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Tên Container:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: web-app"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Docker Image Tag:</label>
              <input
                type="text"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="VD: nginx:alpine"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Port Mappings */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              Cổng chuyển tiếp (Host Port → Container Port)
            </label>
            {ports.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono">
                  {p.hostPort} → {p.containerPort} ({p.protocol.toUpperCase()})
                </span>
                <button
                  type="button"
                  onClick={() => setPorts(ports.filter((_, i) => i !== idx))}
                  className="p-1 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Host (8080)"
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <input
                type="text"
                placeholder="Container (80)"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <select
                value={portProto}
                onChange={(e) => setPortProto(e.target.value as any)}
                className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (hostPort && containerPort) {
                    setPorts([...ports, { hostPort, containerPort, protocol: portProto }]);
                    setHostPort("");
                    setContainerPort("");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Volume Mounts */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
              Thư mục gắn kết (Host Path → Container Path)
            </label>
            {mounts.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono truncate">
                  {m.hostPath} → {m.containerPath}
                </span>
                <button
                  type="button"
                  onClick={() => setMounts(mounts.filter((_, i) => i !== idx))}
                  className="p-1 text-rose-500 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Host (/volume2/docker/app)"
                value={hostPath}
                onChange={(e) => setHostPath(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <input
                type="text"
                placeholder="Container (/data)"
                value={containerPath}
                onChange={(e) => setContainerPath(e.target.value)}
                className="w-1/3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (hostPath && containerPath) {
                    setMounts([...mounts, { hostPath, containerPath, mode: "rw" }]);
                    setHostPath("");
                    setContainerPath("");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold shrink-0"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Resource & Policy */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">CPU Cores:</label>
              <input
                type="number"
                min={1}
                max={16}
                value={cpuLimit}
                onChange={(e) => setCpuLimit(parseInt(e.target.value, 10) || 2)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">RAM Limit (MB):</label>
              <input
                type="number"
                min={64}
                max={32768}
                step={64}
                value={memoryLimitMB}
                onChange={(e) => setMemoryLimitMB(parseInt(e.target.value, 10) || 512)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Restart Policy:</label>
              <select
                value={restartPolicy}
                onChange={(e) => setRestartPolicy(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="unless-stopped">Unless Stopped</option>
                <option value="always">Always</option>
                <option value="on-failure">On Failure</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Khởi tạo Container</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
