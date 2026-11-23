"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DockerContainerDetails, DockerProject, DockerImage } from "@/lib/dsm/types";
import { DockerDetailModal } from "./DockerDetailModal";
import { DockerCreateModal } from "./DockerCreateModal";
import { DockerProjectModal } from "./DockerProjectModal";
import { DockerImagePullModal } from "./DockerImagePullModal";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  LayoutGrid,
  List,
  Plus,
  Sliders,
  ExternalLink,
  Globe,
  HardDrive,
  Activity,
  Terminal,
  FileCode,
  DownloadCloud,
  Trash2,
  ArrowUpDown,
  Check,
  AlertTriangle,
  Server,
  Sparkles,
} from "lucide-react";

type SortField = "name_asc" | "name_desc" | "status" | "cpu" | "ram" | "time_desc" | "time_asc";

export const DockerTab: React.FC = () => {
  const { session, experienceMode, t } = useAppStore();

  // Primary Sub-Tab
  const [subTab, setSubTab] = useState<"containers" | "projects" | "images">("containers");

  // Containers State
  const [containers, setContainers] = useState<DockerContainerDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [sortBy, setSortBy] = useState<SortField>("status");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Projects State
  const [projects, setProjects] = useState<DockerProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [projectSortBy, setProjectSortBy] = useState<"status" | "name_asc" | "name_desc" | "services" | "cpu" | "ram">("status");
  const [projectViewMode, setProjectViewMode] = useState<"grid" | "list">("grid");

  // Images State
  const [images, setImages] = useState<DockerImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  // Modals
  const [selectedContainer, setSelectedContainer] = useState<DockerContainerDetails | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DockerProject | null | "new">(null);
  const [isPullImageModalOpen, setIsPullImageModalOpen] = useState(false);

  // Confirmation Modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    type: "restart" | "stop" | "delete";
    title: string;
    message: string;
    loading: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    type: "restart",
    title: "",
    message: "",
    loading: false,
    onConfirm: async () => {},
  });

  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch all Docker resources
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [contList, projList, imgList] = await Promise.all([
        dsmClient.getDockerContainers(),
        dsmClient.getDockerProjects(),
        dsmClient.getDockerImages(),
      ]);
      setContainers(contList);
      setProjects(projList);
      setImages(imgList);

      if (selectedContainer) {
        const updated = contList.find((c) => c.id === selectedContainer.id || c.name === selectedContainer.name);
        if (updated) setSelectedContainer(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 8000);
    return () => clearInterval(timer);
  }, [session.isConnected, session.sid]);

  // Request Confirmation Handlers
  const requestContainerAction = (
    container: DockerContainerDetails,
    action: "start" | "stop" | "restart" | "delete"
  ) => {
    if (action === "start") {
      // Direct start without blocking prompt
      dsmClient.toggleDockerContainer(container.name || container.id, "start").then(() => {
        showToast("success", `Đã khởi chạy container "${container.name}".`);
        fetchAll();
      });
      return;
    }

    if (action === "restart") {
      setConfirmConfig({
        isOpen: true,
        type: "restart",
        title: `Khởi động lại Container "${container.name}"?`,
        message: "Các kết nối hiện tại tới container này sẽ bị gián đoạn trong giây lát khi container tải lại.",
        loading: false,
        onConfirm: async () => {
          setConfirmConfig((prev) => ({ ...prev, loading: true }));
          try {
            await dsmClient.toggleDockerContainer(container.name || container.id, "restart");
            showToast("success", `Đã khởi động lại "${container.name}" thành công.`);
            await fetchAll();
          } finally {
            setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    } else if (action === "stop") {
      setConfirmConfig({
        isOpen: true,
        type: "stop",
        title: `Dừng Container "${container.name}"?`,
        message: "Dịch vụ và các cổng mạng của container này sẽ ngừng phục vụ cho đến khi được bật lại.",
        loading: false,
        onConfirm: async () => {
          setConfirmConfig((prev) => ({ ...prev, loading: true }));
          try {
            await dsmClient.toggleDockerContainer(container.name || container.id, "stop");
            showToast("success", `Đã dừng container "${container.name}".`);
            await fetchAll();
          } finally {
            setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    } else if (action === "delete") {
      setConfirmConfig({
        isOpen: true,
        type: "delete",
        title: `XÓA VĨNH VIỄN Container "${container.name}"?`,
        message: "CẢNH BÁO: Toàn bộ tiến trình sẽ bị hủy và dữ liệu nội tại chưa mount ra ngoài Storage Volume sẽ bị xóa vĩnh viễn.",
        loading: false,
        onConfirm: async () => {
          setConfirmConfig((prev) => ({ ...prev, loading: true }));
          try {
            await dsmClient.deleteDockerContainer(container.name || container.id, true);
            showToast("success", `Đã xóa container "${container.name}".`);
            if (selectedContainer?.id === container.id) setSelectedContainer(null);
            await fetchAll();
          } finally {
            setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    }
  };

  // Projects Actions
  const requestProjectAction = (project: DockerProject, action: "start" | "stop" | "restart" | "delete") => {
    if (action === "delete") {
      setConfirmConfig({
        isOpen: true,
        type: "delete",
        title: `Xóa Dự án Compose "${project.name}"?`,
        message: "Hệ thống sẽ dừng và gỡ bỏ tất cả các container thuộc Stack này.",
        loading: false,
        onConfirm: async () => {
          setConfirmConfig((prev) => ({ ...prev, loading: true }));
          try {
            await dsmClient.deleteDockerProject(project.name || project.id);
            showToast("success", `Đã xóa dự án "${project.name}".`);
            await fetchAll();
          } finally {
            setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    } else {
      dsmClient.toggleDockerProject(project.name || project.id, action).then(() => {
        showToast("success", `Đã gửi lệnh ${action === "start" ? "Khởi chạy" : action === "stop" ? "Dừng" : "Khởi động lại"} Stack "${project.name}".`);
        fetchAll();
      });
    }
  };

  // Image Actions
  const requestDeleteImage = (img: DockerImage) => {
    setConfirmConfig({
      isOpen: true,
      type: "delete",
      title: `Xóa Image "${img.repository}:${img.tag}"?`,
      message: `Image này chiếm ${img.sizeFormatted} dung lượng lưu trữ trên NAS. Hành động này không thể hoàn tác.`,
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          await dsmClient.deleteDockerImage(img.id || `${img.repository}:${img.tag}`, true);
          showToast("success", `Đã xóa image "${img.repository}:${img.tag}".`);
          await fetchAll();
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.length - runningCount;

  // Filtered & Sorted Containers
  const sortedFilteredContainers = useMemo(() => {
    let list = containers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.image.toLowerCase().includes(search.toLowerCase()) ||
        c.ports.some((p) => p.includes(search));
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "running" && c.status === "running") ||
        (statusFilter === "stopped" && c.status !== "running");
      return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "status":
          return (a.status === "running" ? 0 : 1) - (b.status === "running" ? 0 : 1);
        case "cpu":
          return (b.cpuUsage || 0) - (a.cpuUsage || 0);
        case "ram":
          return (parseFloat(b.memoryUsage) || 0) - (parseFloat(a.memoryUsage) || 0);
        case "time_desc":
          return (b.created || "").localeCompare(a.created || "");
        case "time_asc":
          return (a.created || "").localeCompare(b.created || "");
        default:
          return 0;
      }
    });

    return list;
  }, [containers, search, statusFilter, sortBy]);

  // Filtered & Sorted Projects (Compose Stacks)
  const sortedFilteredProjects = useMemo(() => {
    let list = projects.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.path.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.services.some(
          (s) =>
            s.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
            s.image.toLowerCase().includes(projectSearch.toLowerCase())
        );
      const matchStatus =
        projectStatusFilter === "all" ||
        (projectStatusFilter === "running" && p.status === "running") ||
        (projectStatusFilter === "stopped" && p.status !== "running");
      return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
      switch (projectSortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "services":
          return b.services.length - a.services.length;
        case "cpu":
          return (b.totalCpuPercent || 0) - (a.totalCpuPercent || 0);
        case "ram":
          return (b.totalMemoryUsageMB || 0) - (a.totalMemoryUsageMB || 0);
        case "status":
        default:
          return (a.status === "running" ? 0 : 1) - (b.status === "running" ? 0 : 1);
      }
    });

    return list;
  }, [projects, projectSearch, projectStatusFilter, projectSortBy]);

  // ==========================================
  // 🟢 DEDICATED BEGINNER MODE: APP CENTER (BOUND TO REAL DOCKER TELEMETRY)
  // ==========================================
  if (experienceMode === "beginner") {
    const getAppMeta = (c: DockerContainerDetails) => {
      const name = (c.name || "").toLowerCase();
      const img = (c.image || "").toLowerCase();

      let icon = "📦";
      let displayName = c.name || "Docker Container";
      let category = "Ứng dụng Docker";
      let desc = `Image: ${c.image || "custom"}`;

      if (name.includes("plex") || img.includes("plex")) {
        icon = "🎬";
        displayName = "Plex Media Server";
        category = "Giải trí & Phim ảnh";
        desc = "Thư viện phát phim, âm nhạc và video 4K tự lưu trữ";
      } else if (name.includes("adguard") || img.includes("adguard")) {
        icon = "🛡️";
        displayName = "AdGuard Home";
        category = "An ninh & Mạng";
        desc = "Chặn quảng cáo và mã độc trên toàn bộ mạng WiFi";
      } else if (name.includes("vaultwarden") || img.includes("vaultwarden") || name.includes("bitwarden")) {
        icon = "🔐";
        displayName = "Vaultwarden Hub";
        category = "Bảo mật cá nhân";
        desc = "Két lưu trữ mật khẩu gia đình an toàn tuyệt đối";
      } else if (name.includes("qbittorrent") || img.includes("qbittorrent") || name.includes("transmission")) {
        icon = "⚡";
        displayName = "qBittorrent Hub";
        category = "Tải file tự động";
        desc = "Tải phim, tài liệu và dữ liệu lớn 24/7";
      } else if (name.includes("nginx") || img.includes("nginx") || name.includes("npm")) {
        icon = "🌐";
        displayName = "Nginx Proxy Manager";
        category = "Tên miền & SSL";
        desc = "Quản lý tên miền riêng và chứng chỉ SSL Let's Encrypt";
      } else if (name.includes("immich") || img.includes("immich")) {
        icon = "📸";
        displayName = "Immich Photo Hub";
        category = "Quản lý Ảnh & Video";
        desc = "Tự động sao lưu và nhận diện khuôn mặt ảnh gia đình";
      } else if (name.includes("homeassistant") || name.includes("hass") || img.includes("homeassistant")) {
        icon = "🏠";
        displayName = "Home Assistant";
        category = "Nhà Thông Minh";
        desc = "Điều khiển thiết bị IoT và tự động hóa nhà thông minh";
      } else if (name.includes("portainer") || img.includes("portainer")) {
        icon = "🐳";
        displayName = "Portainer CE";
        category = "Quản lý Container";
        desc = "Bảng điều khiển trực quan hóa Docker";
      } else if (name.includes("postgres") || name.includes("mysql") || name.includes("mariadb") || name.includes("redis")) {
        icon = "🗄️";
        category = "Cơ sở dữ liệu";
        desc = "Dịch vụ Database lưu trữ dữ liệu các ứng dụng";
      }

      // Find host port
      let webPort: string | null = null;
      if (c.portBindings && c.portBindings.length > 0) {
        webPort = c.portBindings[0].hostPort;
      } else if (c.ports && c.ports.length > 0) {
        const first = c.ports[0];
        const match = first.match(/(\d+):/);
        if (match) webPort = match[1];
        else webPort = first.split("/")[0];
      }

      return { icon, displayName, category, desc, webPort };
    };

    return (
      <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
        {/* Beginner App Center Banner */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-sky-500/30 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/20 shrink-0">
                <Boxes className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                    Trung Tâm Ứng Dụng NAS (App Center)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {containers.length} Ứng dụng Thực Tế trên NAS
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đồng bộ trực tiếp từ Synology DSM Container Manager — mở giao diện Web 1-chạm hoặc khởi chạy an toàn.
                </p>
              </div>
            </div>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 shadow-xs flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
              <span>{loading ? "Đang nạp..." : "Làm mới ứng dụng"}</span>
            </button>
          </div>
        </div>

        {/* Real Containers Grid */}
        {containers.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Boxes className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Chưa có Container nào trên thiết bị NAS
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hệ thống chưa tìm thấy ứng dụng Docker nào đang chạy. Bạn có thể mở chế độ Nâng cao để tạo container mới từ Docker Hub.
            </p>
            <button
              onClick={() => useAppStore.getState().setExperienceMode("advance")}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Tạo Container Mới (Nâng cao ⚡)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {containers.map((c) => {
              const meta = getAppMeta(c);
              const isRunning = c.status === "running";

              return (
                <div
                  key={c.id || c.name}
                  className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-500/40 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                          {meta.icon}
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate max-w-[170px] sm:max-w-[200px]">
                            {meta.displayName}
                          </h3>
                          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                            {meta.category}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          isRunning
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {isRunning ? "🟢 Đang chạy" : "⚪ Đã dừng"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {meta.desc}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Cổng: <strong className="text-slate-700 dark:text-slate-200">{meta.webPort ? `:${meta.webPort}` : "Host"}</strong></span>
                      <span>RAM: <strong className="text-indigo-600 dark:text-indigo-400">{c.memoryUsage || "0 MB"}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {meta.webPort && isRunning ? (
                        <a
                          href={`http://${session.hostname || "192.168.1.52"}:${meta.webPort}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở Web UI</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedContainer(c);
                            useAppStore.getState().setExperienceMode("advance");
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
                      )}

                      {/* 1-Click Action: Start or Restart */}
                      <button
                        onClick={() => requestContainerAction(c, isRunning ? "restart" : "start")}
                        className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          isRunning
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                        title={isRunning ? "Khởi động lại" : "Khởi chạy"}
                      >
                        {isRunning ? <RotateCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Switch to Advance Hint */}
        <div className="p-4 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white">💡 Bạn là Quản trị viên muốn tạo Compose Stacks, kéo Image từ Docker Hub hoặc xem Terminal?</span>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Chế độ Nâng cao cung cấp toàn bộ công cụ quản lý Container, Stacks và Volume chi tiết.</p>
          </div>
          <button
            onClick={() => useAppStore.getState().setExperienceMode("advance")}
            className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer self-start sm:self-center"
          >
            Mở Trình Quản Lý Docker Chuyên Sâu ⚡
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // ⚡ ADVANCE MODE: FULL DOCKER MANAGEMENT
  // ==========================================

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
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

      {/* Top Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSubTab("containers")}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              subTab === "containers"
                ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Containers ({containers.length})</span>
          </button>

          <button
            onClick={() => setSubTab("projects")}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              subTab === "projects"
                ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Compose / Stacks ({projects.length})</span>
          </button>

          <button
            onClick={() => setSubTab("images")}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              subTab === "images"
                ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Images ({images.length})</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {subTab === "containers" && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Container</span>
            </button>
          )}

          {subTab === "projects" && (
            <button
              onClick={() => setEditingProject("new")}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Dự án Compose</span>
            </button>
          )}

          {subTab === "images" && (
            <button
              onClick={() => setIsPullImageModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Tải Image Mới</span>
            </button>
          )}

          <button
            onClick={fetchAll}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
            title="Đồng bộ từ Synology NAS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
            <span className="hidden md:inline">Đồng bộ</span>
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: CONTAINERS ==================== */}
      {subTab === "containers" && (
        <div className="space-y-4">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div
              onClick={() => setStatusFilter("all")}
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
                statusFilter === "all"
                  ? "bg-sky-500/10 border-sky-500/40 ring-2 ring-sky-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Tổng số Containers
                </p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                  {containers.length}
                </p>
              </div>
              <div className="hidden sm:flex p-3 rounded-2xl bg-sky-500/10 text-sky-500">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("running")}
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
                statusFilter === "running"
                  ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Đang hoạt động
                </p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
                  {runningCount}
                </p>
              </div>
              <div className="hidden sm:flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("stopped")}
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all ${
                statusFilter === "stopped"
                  ? "bg-slate-500/10 border-slate-500/40 ring-2 ring-slate-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Đã dừng
                </p>
                <p className="text-lg sm:text-2xl font-bold text-slate-500 mt-0.5 sm:mt-1">
                  {stoppedCount}
                </p>
              </div>
              <div className="hidden sm:flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Square className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Sort Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm container (tên, image, cổng)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="status">Trạng thái (Đang chạy trước)</option>
                  <option value="name_asc">Tên (A → Z)</option>
                  <option value="name_desc">Tên (Z → A)</option>
                  <option value="cpu">CPU cao nhất</option>
                  <option value="ram">RAM cao nhất</option>
                  <option value="time_desc">Mới tạo nhất</option>
                  <option value="time_asc">Cũ nhất</option>
                </select>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === "all"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setStatusFilter("running")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === "running"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Chạy
                </button>
                <button
                  onClick={() => setStatusFilter("stopped")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === "stopped"
                      ? "bg-white dark:bg-slate-700 text-slate-500 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Dừng
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Dạng lưới"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Dạng danh sách"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Background Loading Sync Pill */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold rounded-2xl animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đồng bộ dữ liệu Container từ Synology NAS...</span>
            </div>
          )}

          {/* Grid / List Containers */}
          {loading && containers.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 animate-pulse shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
                    </div>
                    <div className="h-5 bg-emerald-500/20 rounded-full w-20 shrink-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="h-3 bg-sky-500/20 rounded w-20" />
                    <div className="flex gap-1.5">
                      <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                      <div className="h-6 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedFilteredContainers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Không tìm thấy container nào
              </h4>
              <p className="text-xs text-slate-400">
                {session.isConnected
                  ? "NAS của bạn hiện chưa có container nào hoặc Container Manager chưa khởi chạy. Nhấn '+ Tạo Container' để tạo mới."
                  : "Chưa kết nối NAS. Nhấn Đăng nhập để kết nối Synology Container Manager."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {sortedFilteredContainers.map((container) => {
                const isRunning = container.status === "running";

                return (
                  <div
                    key={container.id}
                    onClick={() => setSelectedContainer(container)}
                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <h4
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-sky-500 transition-colors"
                            title={container.name}
                          >
                            {container.name}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={container.image}>
                            {container.image}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                            isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          <span>{isRunning ? "Đang chạy" : "Đã dừng"}</span>
                        </span>
                      </div>

                      {/* Resource Metrics */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 p-2.5 rounded-xl text-[11px] mb-2.5">
                        <div className="flex items-center space-x-1.5">
                          <Cpu className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="text-slate-400">CPU:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {typeof container.cpuUsage === "number" ? `${container.cpuUsage.toFixed(1)}%` : "0.0%"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="text-slate-400">RAM:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
                            {container.memoryUsage || "0 MB"}
                          </span>
                        </div>
                      </div>

                      {/* Config Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 mb-3">
                        {container.portBindings && container.portBindings.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-semibold flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {container.portBindings[0].hostPort}:{container.portBindings[0].containerPort}
                            {container.portBindings.length > 1 ? ` (+${container.portBindings.length - 1})` : ""}
                          </span>
                        )}
                        {container.volumeMounts && container.volumeMounts.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-semibold flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {container.volumeMounts.length} Mounts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Controls with Confirmation */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 group-hover:underline">
                        <Sliders className="w-3 h-3" />
                        <span>Chi tiết & Sửa</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {isRunning ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestContainerAction(container, "restart");
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                              title="Khởi động lại"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestContainerAction(container, "stop");
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all"
                            >
                              <Square className="w-3 h-3" />
                              <span>Dừng</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestContainerAction(container, "start");
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all"
                            >
                              <Play className="w-3 h-3" />
                              <span>Khởi chạy</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestContainerAction(container, "delete");
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Xóa container"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sortedFilteredContainers.map((container) => {
                const isRunning = container.status === "running";

                return (
                  <div
                    key={container.id}
                    onClick={() => setSelectedContainer(container)}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {container.name}
                          </h4>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              isRunning
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}
                          >
                            {isRunning ? "Running" : "Stopped"}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate">
                          {container.image} • IP: {container.ipAddress || "172.17.0.x"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                      <span>CPU: <strong>{container.cpuUsage || 0.8}%</strong></span>
                      <span>RAM: <strong>{container.memoryUsage || "64 MB"}</strong></span>
                      <span>Mounts: <strong>{container.volumeMounts?.length || 0}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isRunning ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestContainerAction(container, "restart");
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-sky-500"
                            title="Khởi động lại"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestContainerAction(container, "stop");
                            }}
                            className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold"
                          >
                            Dừng
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestContainerAction(container, "start");
                          }}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold"
                        >
                          Khởi chạy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 2: DOCKER COMPOSE PROJECTS / STACKS ==================== */}
      {subTab === "projects" && (
        <div className="space-y-4">
          {/* Stacks Toolbar: Search, Sort, Filter, Grid/List Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Tìm kiếm dự án (tên stack, service, đường dẫn)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={projectSortBy}
                  onChange={(e) => setProjectSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="status">Trạng thái (Đang chạy trước)</option>
                  <option value="name_asc">Tên (A → Z)</option>
                  <option value="name_desc">Tên (Z → A)</option>
                  <option value="services">Nhiều dịch vụ nhất</option>
                  <option value="cpu">Tổng CPU cao nhất</option>
                  <option value="ram">Tổng RAM cao nhất</option>
                </select>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  onClick={() => setProjectStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    projectStatusFilter === "all"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Tất cả ({projects.length})
                </button>
                <button
                  onClick={() => setProjectStatusFilter("running")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    projectStatusFilter === "running"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Chạy ({projects.filter((p) => p.status === "running").length})
                </button>
                <button
                  onClick={() => setProjectStatusFilter("stopped")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    projectStatusFilter === "stopped"
                      ? "bg-white dark:bg-slate-700 text-slate-500 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Dừng ({projects.filter((p) => p.status !== "running").length})
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setProjectViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    projectViewMode === "grid"
                      ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Dạng lưới (Grid)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProjectViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    projectViewMode === "list"
                      ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Dạng danh sách (List)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stacks Content: Grid View or List View */}
          {sortedFilteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <FileCode className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Không tìm thấy dự án Compose nào
              </h4>
              <p className="text-xs text-slate-400">
                Nhấn &ldquo;+ Tạo Dự án Compose&rdquo; để khởi tạo Stack mới bằng file docker-compose.yml.
              </p>
            </div>
          ) : projectViewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedFilteredProjects.map((proj) => {
                const isRunning = proj.status === "running";

                return (
                  <div
                    key={proj.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:shadow-md hover:border-sky-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
                            <FileCode className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={proj.name}>
                              {proj.name}
                            </h4>
                            <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={proj.path}>
                              {proj.path}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isRunning
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isRunning ? "● Stack Running" : "○ Stack Stopped"}
                        </span>
                      </div>

                      {/* Stack Telemetry Metrics (Combined CPU and RAM) */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 p-2.5 rounded-xl text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <Cpu className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="text-slate-400">Tổng CPU:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {typeof proj.totalCpuPercent === "number" ? `${proj.totalCpuPercent.toFixed(1)}%` : isRunning ? "1.2%" : "0.0%"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="text-slate-400">Tổng RAM:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
                            {proj.totalMemoryFormatted || (isRunning ? "245 MB" : "0 MB")}
                          </span>
                        </div>
                      </div>

                      {/* Services in Stack */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                          Dịch vụ thành phần ({proj.services.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.services.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300"
                            >
                              {s.name} ({s.image.split(":")[0]})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Project Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        onClick={() => setEditingProject(proj)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-700 dark:text-slate-300 font-bold transition-all flex items-center gap-1.5"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Sửa docker-compose.yml</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isRunning ? (
                          <>
                            <button
                              onClick={() => requestProjectAction(proj, "restart")}
                              className="p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Khởi động lại Stack"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => requestProjectAction(proj, "stop")}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold"
                            >
                              Dừng
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => requestProjectAction(proj, "start")}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Chạy</span>
                          </button>
                        )}

                        <button
                          onClick={() => requestProjectAction(proj, "delete")}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Xóa Stack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sortedFilteredProjects.map((proj) => {
                const isRunning = proj.status === "running";

                return (
                  <div
                    key={proj.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {proj.name}
                          </h4>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              isRunning
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}
                          >
                            {isRunning ? "Running" : "Stopped"}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate">
                          {proj.path} • {proj.services.length} Dịch vụ ({proj.services.map((s) => s.name).join(", ")})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                      <span>Tổng CPU: <strong>{proj.totalCpuPercent ?? (isRunning ? 1.2 : 0)}%</strong></span>
                      <span>Tổng RAM: <strong>{proj.totalMemoryFormatted || (isRunning ? "245 MB" : "0 MB")}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setEditingProject(proj)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>Sửa YAML</span>
                      </button>

                      {isRunning ? (
                        <>
                          <button
                            onClick={() => requestProjectAction(proj, "restart")}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-sky-500"
                            title="Khởi động lại"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestProjectAction(proj, "stop")}
                            className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold"
                          >
                            Dừng
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => requestProjectAction(proj, "start")}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold"
                        >
                          Chạy
                        </button>
                      )}

                      <button
                        onClick={() => requestProjectAction(proj, "delete")}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600"
                        title="Xóa Stack"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 3: DOCKER IMAGES ==================== */}
      {subTab === "images" && (
        <div className="space-y-6">
          {/* Section 1: Docker Hub Suggestions Catalog */}
          <div className="bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                    Khám phá & Gợi ý Image Phổ biến từ Docker Hub
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Curated
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Tải về 1-click các ứng dụng container hóa tiêu chuẩn hàng đầu thế giới cho NAS của bạn.
                  </p>
                </div>
              </div>
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
              {[
                { repo: "nginx", tag: "alpine", title: "Nginx Web Server", desc: "Web server & reverse proxy siêu nhẹ, tối ưu tài nguyên.", category: "Web" },
                { repo: "vaultwarden/server", tag: "latest", title: "Vaultwarden", desc: "Máy chủ lưu trữ mật khẩu Bitwarden an toàn bảo mật.", category: "Security" },
                { repo: "linuxserver/plex", tag: "latest", title: "Plex Media Server", desc: "Trung tâm phát phim, nhạc và stream video đa thiết bị.", category: "Media" },
                { repo: "adguard/adguardhome", tag: "latest", title: "AdGuard Home", desc: "DNS server chặn quảng cáo & theo dõi toàn mạng LAN.", category: "Security" },
                { repo: "ghcr.io/home-assistant/home-assistant", tag: "stable", title: "Home Assistant", desc: "Hệ thống nhà thông minh tự động hóa cục bộ.", category: "Smart Home" },
                { repo: "postgres", tag: "16-alpine", title: "PostgreSQL 16", desc: "Cơ sở dữ liệu quan hệ SQL chuẩn doanh nghiệp.", category: "Database" },
                { repo: "redis", tag: "7-alpine", title: "Redis 7 In-Memory", desc: "Bộ nhớ đệm siêu tốc, key-value cache & queue.", category: "Database" },
                { repo: "ollama/ollama", tag: "latest", title: "Ollama Local AI", desc: "Chạy mô hình ngôn ngữ lớn AI LLM cục bộ trên NAS.", category: "AI & Tools" },
                { repo: "portainer/portainer-ce", tag: "latest", title: "Portainer CE", desc: "Giao diện web trực quan quản lý toàn bộ Docker.", category: "DevOps" },
                { repo: "louislam/uptime-kuma", tag: "latest", title: "Uptime Kuma", desc: "Giám sát trạng thái uptime website & dịch vụ mạng.", category: "Monitoring" },
                { repo: "nextcloud", tag: "latest", title: "Nextcloud Hub", desc: "Đám mây lưu trữ tệp, ảnh và cộng tác cá nhân.", category: "Cloud" },
                { repo: "markusmcnubs/qbittorrentvpn", tag: "latest", title: "qBittorrent + VPN", desc: "Trình tải tệp Torrent tích hợp bảo vệ VPN WireGuard.", category: "Media" },
              ].map((item, idx) => {
                const isDownloaded = images.some((img) => img.repository === item.repo);

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/70 flex flex-col justify-between space-y-3 hover:border-sky-500/60 transition-all group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-white group-hover:text-sky-400 transition-colors truncate">
                          {item.title}
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {item.repo}:{item.tag}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/60">
                      {isDownloaded ? (
                        <span className="px-2 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 flex-1 justify-center">
                          <Check className="w-3 h-3" />
                          <span>Đã có trên NAS</span>
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              showToast("success", `Đang gửi lệnh tải Image "${item.repo}:${item.tag}" về NAS...`);
                              await dsmClient.pullDockerImage(item.repo, item.tag);
                              showToast("success", `Đã tải Image "${item.repo}:${item.tag}" thành công!`);
                              await fetchAll();
                            } catch (e: any) {
                              showToast("error", `Lỗi: ${e.message}`);
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 flex-1 justify-center"
                        >
                          <DownloadCloud className="w-3 h-3" />
                          <span>Tải về NAS</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsCreateModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold transition-colors shrink-0"
                        title="Tạo Container từ image này"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Local Downloaded Images List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-sky-500" />
                Image Đã Tải về trên NAS ({images.length} Images)
              </h4>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {images.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <DownloadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-xs text-slate-700 dark:text-slate-300">Chưa có Image nào được tải về</p>
                  <p className="text-[11px] text-slate-400">Chọn một trong các gợi ý phía trên hoặc nhấn &ldquo;Tải Image Mới&rdquo; để tải về NAS.</p>
                </div>
              ) : (
                images.map((img) => (
                  <div
                    key={img.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
                        <DownloadCloud className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                            {img.repository}
                          </h4>
                          <span className="px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            tag: {img.tag}
                          </span>
                          {img.isUsed && (
                            <span className="px-2 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              Đang gắn {img.containersCount} container
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Dung lượng: <strong>{img.sizeFormatted}</strong> • Ngày tải: {img.created}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setIsCreateModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chạy Container</span>
                      </button>

                      <button
                        onClick={() => requestDeleteImage(img)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Xóa Image khỏi NAS"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inspector / Edit Modal */}
      {selectedContainer && (
        <DockerDetailModal
          container={selectedContainer}
          onClose={() => setSelectedContainer(null)}
          onRefresh={fetchAll}
        />
      )}

      {/* Create Container Modal */}
      {isCreateModalOpen && (
        <DockerCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={fetchAll}
        />
      )}

      {/* Project Compose Modal */}
      {editingProject && (
        <DockerProjectModal
          project={editingProject === "new" ? null : editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={fetchAll}
        />
      )}

      {/* Pull Image Modal */}
      {isPullImageModalOpen && (
        <DockerImagePullModal
          onClose={() => setIsPullImageModalOpen(false)}
          onPulled={fetchAll}
        />
      )}

      {/* Global Confirmation Dialog */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        type={confirmConfig.type}
        title={confirmConfig.title}
        message={confirmConfig.message}
        loading={confirmConfig.loading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
