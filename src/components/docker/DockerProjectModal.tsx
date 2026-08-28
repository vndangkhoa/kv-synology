"use client";

import React, { useState } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { DockerProject } from "@/lib/dsm/types";
import { dsmClient } from "@/lib/dsm/client";
import {
  X,
  FileCode,
  Check,
  AlertTriangle,
  RotateCw,
  Copy,
  Sparkles,
  Maximize2,
  Minimize2,
  Plus,
  Layers,
  Wand2,
  Terminal,
} from "lucide-react";

interface DockerProjectModalProps {
  project?: DockerProject | null;
  onClose: () => void;
  onSaved: () => void;
}

const TEMPLATES: Array<{ id: string; label: string; name: string; yaml: string }> = [
  {
    id: "wordpress",
    label: "WordPress + MySQL",
    name: "wordpress-stack",
    yaml: `version: '3.8'

services:
  wordpress:
    image: wordpress:latest
    container_name: wp-app
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wp_user
      WORDPRESS_DB_PASSWORD: wp_password
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - /volume2/docker/wordpress/html:/var/www/html

  db:
    image: mariadb:10.6
    container_name: wp-db
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wp_user
      MYSQL_PASSWORD: wp_password
      MYSQL_ROOT_PASSWORD: root_password
    volumes:
      - /volume2/docker/wordpress/db:/var/lib/mysql
`,
  },
  {
    id: "monitoring",
    label: "Prometheus + Grafana",
    name: "monitoring-stack",
    yaml: `version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - /volume2/docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - /volume2/docker/prometheus/data:/prometheus

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /volume2/docker/grafana/data:/var/lib/grafana
`,
  },
  {
    id: "nextcloud",
    label: "Nextcloud + PostgreSQL",
    name: "nextcloud-stack",
    yaml: `version: '3.8'

services:
  nextcloud:
    image: nextcloud:latest
    container_name: nextcloud
    restart: unless-stopped
    ports:
      - "8088:80"
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_DB=nextcloud
      - POSTGRES_USER=nextcloud
      - POSTGRES_PASSWORD=secret
    volumes:
      - /volume2/docker/nextcloud/data:/var/www/html

  db:
    image: postgres:15-alpine
    container_name: nextcloud-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=nextcloud
      - POSTGRES_USER=nextcloud
      - POSTGRES_PASSWORD=secret
    volumes:
      - /volume2/docker/nextcloud/db:/var/lib/postgresql/data
`,
  },
];

export const DockerProjectModal: React.FC<DockerProjectModalProps> = ({
  project,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(project?.name || "");
  const [path, setPath] = useState(project?.path || (project?.name ? `/volume2/docker/${project.name}` : "/volume2/docker/"));
  const [yamlContent, setYamlContent] = useState(
    project?.yamlContent ||
      `version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: my-web
    restart: unless-stopped
    ports:
      - "8080:80"
`
  );
  const [loading, setLoading] = useState(false);
  const [fetchingYaml, setFetchingYaml] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchExactYaml = async () => {
    if (!project) return;
    setFetchingYaml(true);
    try {
      const liveYaml = await dsmClient.getDockerProjectYaml(project.name, project.path);
      if (liveYaml && liveYaml.trim()) {
        setYamlContent(liveYaml);
      }
    } catch (_) {
    } finally {
      setFetchingYaml(false);
    }
  };

  React.useEffect(() => {
    if (project) {
      fetchExactYaml();
    }
  }, [project?.id, project?.name]);

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    if (!name || name === "my-stack") setName(tmpl.name);
    setPath(`/volume2/docker/${tmpl.name}`);
    setYamlContent(tmpl.yaml);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick insertion helpers for mobile editing
  const insertSnippet = (snippet: string) => {
    setYamlContent((prev) => `${prev.trimEnd()}\n${snippet}\n`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !yamlContent.trim()) {
      setErrorMsg("Vui lòng nhập tên dự án và nội dung compose YAML!");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await dsmClient.saveDockerProject({
        id: project?.id,
        name: name.trim(),
        path: path.trim() || `/volume2/docker/${name.trim()}`,
        yamlContent: yamlContent.trim(),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi lưu cấu hình Project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal open={true} onClose={onClose} maxWidth="4xl" panelClassName="h-full sm:h-auto">
      <div
        className={`bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all ${
          isFullscreen
            ? "fixed inset-0 rounded-none w-full h-full"
            : "w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-3xl"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
              <FileCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-base text-slate-900 dark:text-white truncate">
                {project ? `Chỉnh sửa Dự án: ${project.name}` : "Tạo Dự án / Stack Compose Mới"}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Định nghĩa kiến trúc bằng docker-compose.yml</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:flex"
              title={isFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 flex-1 flex flex-col">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Templates */}
          {!project && (
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Mẫu Compose có sẵn:
              </label>
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project Name & Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[11px] sm:text-xs text-slate-700 dark:text-slate-300">Tên Dự án (Stack Name):</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!project) setPath(`/volume2/docker/${e.target.value}`);
                }}
                placeholder="VD: homelab-stack"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[11px] sm:text-xs text-slate-700 dark:text-slate-300">Đường dẫn thư mục lưu YAML:</label>
              <input
                type="text"
                required
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/volume2/docker/stack"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          {/* Mobile-Friendly Code Snippets Toolbar */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-semibold hidden sm:inline">Chèn nhanh:</span>
              <button
                type="button"
                onClick={() => insertSnippet("    ports:\n      - \"8080:80\"")}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                + Port
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("    volumes:\n      - /volume2/docker/data:/data")}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                + Volume
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("    environment:\n      - TZ=Asia/Ho_Chi_Minh")}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                + Env
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("    restart: unless-stopped")}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 font-mono transition-colors"
              >
                + Restart
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {project && (
                <button
                  type="button"
                  disabled={fetchingYaml}
                  onClick={fetchExactYaml}
                  className="text-[11px] text-slate-400 hover:text-sky-500 hover:underline flex items-center gap-1 font-semibold"
                  title="Nạp lại file docker-compose.yml thực tế từ ổ đĩa NAS"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${fetchingYaml ? "animate-spin text-sky-500" : ""}`} />
                  <span>{fetchingYaml ? "Đang nạp..." : "Nạp lại từ NAS"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-sky-500 hover:underline flex items-center gap-1 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Đã chép" : "Sao chép"}</span>
              </button>
            </div>
          </div>

          {/* YAML Editor Textarea */}
          <div className="flex-1 flex flex-col min-h-[220px] relative">
            {fetchingYaml && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10 text-sky-400 font-mono text-xs gap-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Đang đọc file docker-compose.yml từ NAS...</span>
              </div>
            )}
            <textarea
              required
              rows={isFullscreen ? 24 : 14}
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              className="w-full flex-1 p-3 sm:p-4 bg-slate-950 text-emerald-400 font-mono text-xs sm:text-xs leading-relaxed rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner resize-none select-text"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
            />
          </div>

          {/* Footer with Safe Area */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{project ? "Lưu & Cập nhật Stack" : "Tạo & Triển khai Stack"}</span>
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
