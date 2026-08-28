"use client";

import React, { useState } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { dsmClient } from "@/lib/dsm/client";
import {
  X,
  DownloadCloud,
  Check,
  AlertTriangle,
  RotateCw,
  Search,
  Sparkles,
  Layers,
} from "lucide-react";

interface DockerImagePullModalProps {
  onClose: () => void;
  onPulled: () => void;
}

const POPULAR_IMAGES = [
  { repo: "nginx", tag: "alpine", label: "Nginx (Alpine)", desc: "Web Server siêu nhẹ" },
  { repo: "redis", tag: "7-alpine", label: "Redis", desc: "In-memory Cache & Queue" },
  { repo: "postgres", tag: "16-alpine", label: "PostgreSQL 16", desc: "Cơ sở dữ liệu SQL" },
  { repo: "mariadb", tag: "11", label: "MariaDB 11", desc: "MySQL Compatible Database" },
  { repo: "portainer/portainer-ce", tag: "latest", label: "Portainer CE", desc: "Giao diện quản lý Container" },
  { repo: "vaultwarden/server", tag: "latest", label: "Vaultwarden", desc: "Trình quản lý mật khẩu" },
  { repo: "adguard/adguardhome", tag: "latest", label: "AdGuard Home", desc: "Chặn quảng cáo & DNS server" },
  { repo: "linuxserver/plex", tag: "latest", label: "Plex Media Server", desc: "Máy chủ phim & truyền thông" },
];

export const DockerImagePullModal: React.FC<DockerImagePullModalProps> = ({
  onClose,
  onPulled,
}) => {
  const [repository, setRepository] = useState("");
  const [tag, setTag] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSelectPopular = (img: typeof POPULAR_IMAGES[0]) => {
    setRepository(img.repo);
    setTag(img.tag);
  };

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repository.trim()) {
      setErrorMsg("Vui lòng nhập tên image (Repository)!");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await dsmClient.pullDockerImage(repository.trim(), tag.trim() || "latest");
      onPulled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi tải Image về NAS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal open={true} onClose={onClose} maxWidth="lg" noPadding>
      <div className="flex flex-col w-full max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                Tải Image Docker Mới về NAS
              </h3>
              <p className="text-xs text-slate-400">Download image từ Docker Hub hoặc Container Registry</p>
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
        <form onSubmit={handlePull} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Popular Images Suggestions */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Image phổ biến được tin dùng:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_IMAGES.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPopular(img)}
                  className="p-2 rounded-xl text-left bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-700 hover:border-sky-500 transition-all space-y-0.5"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {img.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">
                    {img.repo}:{img.tag}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="col-span-2 space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Tên Image (Repository):</label>
              <input
                type="text"
                required
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                placeholder="VD: nginx hoặc portainer/portainer-ce"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Tag (Phiên bản):</label>
              <input
                type="text"
                required
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="latest"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Footer */}
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
              {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              <span>Tải Image về NAS</span>
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
