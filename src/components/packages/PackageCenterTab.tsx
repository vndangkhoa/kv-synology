"use client";

import React, { useState, useEffect, useMemo } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { PackageItem, PackageServer } from "@/lib/dsm/types";
import { mockPackages } from "@/lib/dsm/mockData";
import {
  Package,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Search,
  CheckCircle2,
  Boxes,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  List,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  Check,
  Plus,
  Trash2,
  Edit3,
  Globe,
  Download,
  Settings,
  Upload,
  ArrowUpCircle,
  Zap,
} from "lucide-react";

type ViewMode = "standard" | "compact" | "detailed" | "list";

const CURATED_COMMUNITY_CATALOG: Array<PackageItem & { sizeLabel: string; iconBg: string }> = [
  {
    id: "HomeAssistant",
    name: "Home Assistant Core",
    version: "2024.8.2-1",
    status: "stopped",
    description: "Hệ thống tự động hóa nhà thông minh mã nguồn mở mạnh mẽ nhất, kết nối hàng nghìn thiết bị IoT.",
    maintainer: "SynoCommunity",
    category: "Home Automation",
    isCommunity: true,
    sizeLabel: "84 MB",
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    id: "Tailscale",
    name: "Tailscale Mesh VPN",
    version: "1.72.0-700072001",
    status: "stopped",
    description: "Mạng riêng ảo mesh VPN WireGuard an toàn cao cấp không cần cấu hình mở port tường lửa.",
    maintainer: "Tailscale Inc.",
    category: "Security & VPN",
    isCommunity: true,
    sizeLabel: "36 MB",
    iconBg: "from-slate-700 to-slate-900",
  },
  {
    id: "Jellyfin",
    name: "Jellyfin Media Server",
    version: "10.9.9-1",
    status: "stopped",
    description: "Máy chủ phát truyền thông đa phương tiện mã nguồn mở miễn phí, chuyển mã video 4K HDR mượt mà.",
    maintainer: "SynoCommunity",
    category: "Multimedia",
    isCommunity: true,
    sizeLabel: "145 MB",
    iconBg: "from-purple-600 to-indigo-600",
  },
  {
    id: "Vaultwarden",
    name: "Vaultwarden (Bitwarden Server)",
    version: "1.32.0-1",
    status: "stopped",
    description: "Máy chủ quản lý mật khẩu cá nhân và doanh nghiệp an toàn, tương thích Bitwarden extensions & apps.",
    maintainer: "Community",
    category: "Security & VPN",
    isCommunity: true,
    sizeLabel: "52 MB",
    iconBg: "from-blue-600 to-blue-800",
  },
  {
    id: "AdGuardHome",
    name: "AdGuard Home",
    version: "0.107.52-1",
    status: "stopped",
    description: "Máy chủ DNS phân giải tên miền chặn quảng cáo, mã độc và bảo vệ quyền riêng tư toàn mạng LAN gia đình.",
    maintainer: "SynoCommunity",
    category: "Network & DNS",
    isCommunity: true,
    sizeLabel: "28 MB",
    iconBg: "from-emerald-500 to-teal-600",
  },
  {
    id: "Syncthing",
    name: "Syncthing Continuous Sync",
    version: "1.27.10-1",
    status: "stopped",
    description: "Đồng bộ hóa tập tin phân tán P2P bảo mật mã hóa end-to-end giữa máy tính, điện thoại và Synology NAS.",
    maintainer: "SynoCommunity",
    category: "Backup & Sync",
    isCommunity: true,
    sizeLabel: "32 MB",
    iconBg: "from-sky-500 to-blue-600",
  },
  {
    id: "Transmission",
    name: "Transmission BitTorrent Client",
    version: "4.0.5-1",
    status: "stopped",
    description: "Trình tải Torrent BitTorrent siêu nhẹ, tốc độ cao với giao diện web quản lý tác vụ tải từ xa.",
    maintainer: "SynoCommunity",
    category: "Download",
    isCommunity: true,
    sizeLabel: "18 MB",
    iconBg: "from-rose-500 to-red-600",
  },
  {
    id: "NginxProxyManager",
    name: "Nginx Proxy Manager",
    version: "2.11.2-1",
    status: "stopped",
    description: "Giao diện quản lý Reverse Proxy Nginx trực quan kèm tự động cấp phát và gia hạn chứng chỉ Let's Encrypt SSL.",
    maintainer: "Community",
    category: "Network & DNS",
    isCommunity: true,
    sizeLabel: "64 MB",
    iconBg: "from-teal-500 to-emerald-600",
  },
  {
    id: "SynoCliTools",
    name: "SynoCli Network & Disk Tools",
    version: "2.1.0-1",
    status: "stopped",
    description: "Bộ công cụ dòng lệnh chuyên nghiệp: htop, iftop, iperf3, nmap, screen, tmux, rsync, tree, mc.",
    maintainer: "SynoCommunity",
    category: "Utilities & CLI",
    isCommunity: true,
    sizeLabel: "24 MB",
    iconBg: "from-amber-500 to-orange-600",
  },
  {
    id: "Netdata",
    name: "Netdata Real-time Monitor",
    version: "1.45.3-1",
    status: "stopped",
    description: "Giám sát tài nguyên phần cứng, CPU per-core, băng thông mạng và tiến trình DSM thời gian thực từng giây.",
    maintainer: "SynoCommunity",
    category: "Monitoring",
    isCommunity: true,
    sizeLabel: "48 MB",
    iconBg: "from-indigo-500 to-purple-600",
  },
  {
    id: "Nodejs20",
    name: "Node.js v20 LTS",
    version: "20.15.1-002",
    status: "stopped",
    description: "Môi trường thực thi JavaScript server-side hiệu năng cao cho các ứng dụng web và script tự động hóa trên DSM.",
    maintainer: "Synology Inc.",
    category: "Developer Tools",
    isCommunity: false,
    sizeLabel: "42 MB",
    iconBg: "from-emerald-600 to-green-700",
  },
  {
    id: "Python311",
    name: "Python 3.11 Runtime",
    version: "3.11.8-001",
    status: "stopped",
    description: "Ngôn ngữ lập trình Python 3.11 cùng trình quản lý gói pip tích hợp cho Synology DSM.",
    maintainer: "SynoCommunity",
    category: "Developer Tools",
    isCommunity: true,
    sizeLabel: "58 MB",
    iconBg: "from-amber-500 to-yellow-600",
  },
];

export const PackageCenterTab: React.FC = () => {
  const { t, session } = useAppStore();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [packageServers, setPackageServers] = useState<PackageServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped" | "updates">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal States
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [installTab, setInstallTab] = useState<"catalog" | "manual">("catalog");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");

  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editSourceName, setEditSourceName] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");

  const [uninstallConfirmPkg, setUninstallConfirmPkg] = useState<PackageItem | null>(null);
  const [modifyPkg, setModifyPkg] = useState<PackageItem | null>(null);
  const [modifyName, setModifyName] = useState("");
  const [modifyDesc, setModifyDesc] = useState("");
  const [modifyAutoUpgrade, setModifyAutoUpgrade] = useState(true);

  // Manual Install Form State
  const [manualName, setManualName] = useState("");
  const [manualId, setManualId] = useState("");
  const [manualVersion, setManualVersion] = useState("1.0.0");
  const [manualDesc, setManualDesc] = useState("");
  const [manualMaintainer, setManualMaintainer] = useState("Community Developer");
  const [manualUrl, setManualUrl] = useState("");
  const [manualCategory, setManualCategory] = useState("Utilities");
  const [isManualInstalling, setIsManualInstalling] = useState(false);

  // Restore saved view mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pkg_view_mode") as ViewMode;
      if (saved && ["standard", "compact", "detailed", "list"].includes(saved)) {
        setViewMode(saved);
      }
    } catch (_) {}
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("pkg_view_mode", mode);
    } catch (_) {}
  };

  const loadPackagesAndServers = async () => {
    setLoading(true);
    try {
      // Auto-cleanup legacy mock feeds if previously persisted in browser
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("dsm_package_servers");
          if (raw && (raw.includes("digitalbox.com") || raw.includes("cambier.org"))) {
            localStorage.removeItem("dsm_package_servers");
          }
        } catch (_) {}
      }

      const [pkgList, servers] = await Promise.all([
        dsmClient.getPackages(),
        dsmClient.getPackageServers(),
      ]);
      setPackages(pkgList || mockPackages);
      setPackageServers(servers || []);
    } catch (_) {
      setPackages(mockPackages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackagesAndServers();
  }, []);

  const handleToggle = async (pkg: PackageItem, forceAction?: "start" | "stop") => {
    setActionLoadingId(pkg.id);
    const nextAction = forceAction || (pkg.status === "running" ? "stop" : "start");
    try {
      // Optimistic update
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: nextAction === "start" ? "running" : "stopped" } : p))
      );
      if (selectedPkg?.id === pkg.id) {
        setSelectedPkg((prev) => (prev ? { ...prev, status: nextAction === "start" ? "running" : "stopped" } : null));
      }

      const ok = await dsmClient.togglePackage(pkg.id, nextAction);
      if (ok) {
        setFeedbackMsg({
          type: "success",
          text: `Đã ${nextAction === "start" ? "khởi chạy" : "dừng"} gói "${pkg.name}" thành công!`,
        });
      } else {
        await loadPackagesAndServers();
        setFeedbackMsg({
          type: "error",
          text: `Không thể ${nextAction === "start" ? "khởi chạy" : "dừng"} "${pkg.name}". Hãy thử lại.`,
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: `Lỗi thao tác gói: ${e.message}`,
      });
      await loadPackagesAndServers();
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleRestart = async (pkg: PackageItem) => {
    setActionLoadingId(pkg.id);
    try {
      await dsmClient.togglePackage(pkg.id, "stop");
      await new Promise((r) => setTimeout(r, 800));
      await dsmClient.togglePackage(pkg.id, "start");
      setFeedbackMsg({
        type: "success",
        text: `Đã khởi động lại gói "${pkg.name}" thành công!`,
      });
      await loadPackagesAndServers();
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: `Lỗi khởi động lại: ${e.message}`,
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 1. Update a single package
  const handleUpdatePackage = async (pkg: PackageItem) => {
    setActionLoadingId(pkg.id);
    try {
      const res = await dsmClient.updatePackage(pkg.id, pkg.latestVersion);
      if (res.success) {
        setPackages((prev) =>
          prev.map((p) =>
            p.id === pkg.id
              ? { ...p, version: pkg.latestVersion || p.version, hasUpdate: false, latestVersion: undefined }
              : p
          )
        );
        if (selectedPkg?.id === pkg.id) {
          setSelectedPkg((prev) =>
            prev ? { ...prev, version: pkg.latestVersion || prev.version, hasUpdate: false, latestVersion: undefined } : null
          );
        }
        setFeedbackMsg({
          type: "success",
          text: `Đã cập nhật gói "${pkg.name}" lên phiên bản v${pkg.latestVersion || "mới nhất"} thành công!`,
        });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi cập nhật gói: ${e.message}` });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 2. Update all updatable packages
  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      const res = await dsmClient.updateAllPackages();
      await loadPackagesAndServers();
      setFeedbackMsg({
        type: "success",
        text: `Đã cập nhật thành công ${res.count} gói ứng dụng!`,
      });
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi cập nhật đồng loạt: ${e.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 3. Install Package from Curated Catalog
  const handleInstallFromCatalog = async (item: PackageItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await dsmClient.installPackage({
        id: item.id,
        name: item.name,
        version: item.version,
        description: item.description,
        maintainer: item.maintainer,
        category: item.category,
        isCommunity: item.isCommunity,
      });
      if (res.success && res.package) {
        setPackages((prev) => [res.package!, ...prev.filter((p) => p.id !== item.id)]);
        setFeedbackMsg({
          type: "success",
          text: `Đã cài đặt thành công gói "${item.name}"!`,
        });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi cài đặt gói: ${e.message}` });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 4. Manual Package Install
  const handleManualInstallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    setIsManualInstalling(true);
    try {
      const res = await dsmClient.installPackage({
        id: manualId.trim() || undefined,
        name: manualName.trim(),
        version: manualVersion.trim() || "1.0.0",
        description: manualDesc.trim() || "Gói ứng dụng cài đặt thủ công",
        maintainer: manualMaintainer.trim() || "Community",
        category: manualCategory,
        url: manualUrl.trim() || undefined,
        isCommunity: true,
      });

      if (res.success && res.package) {
        setPackages((prev) => [res.package!, ...prev]);
        setFeedbackMsg({
          type: "success",
          text: `Đã cài đặt gói "${manualName}" thành công!`,
        });
        setIsInstallModalOpen(false);
        setManualName("");
        setManualId("");
        setManualDesc("");
        setManualUrl("");
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi cài đặt thủ công: ${err.message}` });
    } finally {
      setIsManualInstalling(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 5. Uninstall Package
  const handleConfirmUninstall = async () => {
    if (!uninstallConfirmPkg) return;
    const target = uninstallConfirmPkg;
    setActionLoadingId(target.id);
    try {
      await dsmClient.uninstallPackage(target.id);
      setPackages((prev) => prev.filter((p) => p.id !== target.id));
      if (selectedPkg?.id === target.id) setSelectedPkg(null);
      setFeedbackMsg({
        type: "success",
        text: `Đã gỡ bỏ gói "${target.name}" khỏi hệ thống thành công!`,
      });
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi gỡ bỏ gói: ${e.message}` });
    } finally {
      setUninstallConfirmPkg(null);
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 6. Modify Package Settings
  const handleOpenModifyModal = (pkg: PackageItem) => {
    setModifyPkg(pkg);
    setModifyName(pkg.name);
    setModifyDesc(pkg.description || "");
    setModifyAutoUpgrade(pkg.autoUpgrade ?? true);
  };

  const handleSaveModifyPackage = async () => {
    if (!modifyPkg) return;
    setActionLoadingId(modifyPkg.id);
    try {
      await dsmClient.setPackageSetting(modifyPkg.id, {
        id: modifyPkg.id,
        displayName: modifyName,
        description: modifyDesc,
        autoUpgrade: modifyAutoUpgrade,
      });

      setPackages((prev) =>
        prev.map((p) =>
          p.id === modifyPkg.id
            ? {
                ...p,
                name: modifyName,
                description: modifyDesc,
                autoUpgrade: modifyAutoUpgrade,
              }
            : p
        )
      );

      if (selectedPkg?.id === modifyPkg.id) {
        setSelectedPkg((prev) => (prev ? { ...prev, name: modifyName, description: modifyDesc, autoUpgrade: modifyAutoUpgrade } : null));
      }

      setFeedbackMsg({
        type: "success",
        text: `Đã lưu cấu hình gói "${modifyName}" thành công!`,
      });
      setModifyPkg(null);
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi cập nhật gói: ${e.message}` });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // 7. Community Sources Feeds
  const handleAddCommunitySource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    try {
      const added = await dsmClient.addPackageServer(newSourceName.trim(), newSourceUrl.trim());
      setPackageServers((prev) => [...prev, added]);
      setNewSourceName("");
      setNewSourceUrl("");
      setFeedbackMsg({
        type: "success",
        text: `Đã thêm nguồn gói cộng đồng "${added.name}" thành công!`,
      });
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi thêm nguồn gói: ${e.message}` });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleSaveEditSource = async (id: string) => {
    if (!editSourceName.trim() || !editSourceUrl.trim()) return;
    try {
      await dsmClient.editPackageServer(id, editSourceName.trim(), editSourceUrl.trim());
      setPackageServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: editSourceName.trim(), url: editSourceUrl.trim() } : s))
      );
      setEditingServerId(null);
      setFeedbackMsg({ type: "success", text: `Đã cập nhật nguồn gói thành công!` });
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi cập nhật nguồn: ${e.message}` });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleRemoveSource = async (id: string, name: string) => {
    try {
      await dsmClient.removePackageServer(id);
      setPackageServers((prev) => prev.filter((s) => s.id !== id));
      setFeedbackMsg({ type: "success", text: `Đã xóa nguồn gói "${name}" thành công!` });
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: `Lỗi xóa nguồn: ${e.message}` });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const runningCount = packages.filter((p) => p.status === "running").length;
  const stoppedCount = packages.length - runningCount;
  const updatesCount = packages.filter((p) => p.hasUpdate).length;
  const officialCount = packages.filter((p) => p.maintainer.includes("Synology")).length;
  const communityCount = packages.length - officialCount;

  const installedIds = useMemo(() => new Set(packages.map((p) => p.id)), [packages]);

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.maintainer.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "running" && p.status === "running") ||
        (statusFilter === "stopped" && p.status !== "running") ||
        (statusFilter === "updates" && p.hasUpdate);

      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "official" && p.maintainer.includes("Synology")) ||
        (sourceFilter === "community" && !p.maintainer.includes("Synology")) ||
        (sourceFilter === "synocommunity" && p.maintainer.toLowerCase().includes("synocommunity"));

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [packages, search, statusFilter, sourceFilter]);

  const catalogFiltered = useMemo(() => {
    return CURATED_COMMUNITY_CATALOG.filter((item) => {
      if (catalogCategory === "all") return true;
      return item.category === catalogCategory;
    });
  }, [catalogCategory]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 w-full">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 shadow-sm ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div
          onClick={() => {
            setStatusFilter("all");
            setSourceFilter("all");
          }}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === "all" && sourceFilter === "all"
              ? "bg-sky-500/10 border-sky-500/40 ring-2 ring-sky-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tổng số gói cài đặt
            </p>
            <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1 font-mono">
              {packages.length}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("running")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === "running"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đang hoạt động
            </p>
            <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 font-mono">
              {runningCount}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Play className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("updates")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === "updates"
              ? "bg-purple-500/10 border-purple-500/40 ring-2 ring-purple-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Bản cập nhật khả dụng
            </p>
            <p className="text-base sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5 sm:mt-1 font-mono flex items-center gap-1.5">
              <span>{updatesCount}</span>
              {updatesCount > 0 && <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-purple-500/10 text-purple-500 shrink-0">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setSourceFilter(sourceFilter === "community" ? "all" : "community")}
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            sourceFilter === "community"
              ? "bg-indigo-500/10 border-indigo-500/40 ring-2 ring-indigo-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Gói Community ({packageServers.length} nguồn)
            </p>
            <p className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 sm:mt-1 font-mono">
              {communityCount}
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Toolbar: Search, Install Action, Update All, Community Sources, Filter & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm gói theo tên, ID, mô tả, nhà phát triển..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Button: Update All if any available */}
          {updatesCount > 0 && (
            <button
              onClick={handleUpdateAll}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50 animate-pulse"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Cập nhật tất cả ({updatesCount})</span>
            </button>
          )}

          {/* Action Button: Install Package */}
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cài đặt gói mới</span>
          </button>

          {/* Action Button: Package Sources (Feeds) */}
          <button
            onClick={() => setIsSourcesModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700/60"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nguồn gói ({packageServers.length})</span>
          </button>

          {/* Status Filter Chips */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
            {[
              { id: "all", label: "Tất cả" },
              { id: "running", label: "Đang chạy" },
              { id: "stopped", label: "Đã dừng" },
              { id: "updates", label: `Cập nhật (${updatesCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Source Filter Chips */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
            {[
              { id: "all", label: "Tất cả nguồn" },
              { id: "official", label: "Synology" },
              { id: "community", label: "Community" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSourceFilter(s.id)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sourceFilter === s.id
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-slate-500">
            <button
              onClick={() => handleSetViewMode("standard")}
              title="Lưới tiêu chuẩn (3 cột)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "standard"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode("compact")}
              title="Lưới nhỏ gọn (4 cột)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "compact"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode("detailed")}
              title="Lưới chi tiết (2 cột)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "detailed"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewMode("list")}
              title="Danh sách bảng"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={loadPackagesAndServers}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="Làm mới danh sách gói từ NAS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Packages Content: Grid or List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-sm space-y-3">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Không tìm thấy gói ứng dụng nào phù hợp
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Cài đặt gói mới&quot; để thêm ứng dụng từ kho cộng đồng
            </p>
          </div>
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Mở Kho ứng dụng đề xuất</span>
          </button>
        </div>
      ) : viewMode === "list" ? (
        /* TABLE / LIST VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((pkg) => {
              const isRunning = pkg.status === "running";
              const isActionLoading = actionLoadingId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg)}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 m-3.5 cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {pkg.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          v{pkg.version} {pkg.hasUpdate && <span className="text-purple-600 dark:text-purple-400 font-bold font-sans">→ Có bản mới v{pkg.latestVersion}</span>}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
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
                      {isRunning ? "Đang chạy" : "Đã dừng"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {pkg.description || "Ứng dụng Synology Package Center"}
                  </p>

                  <div
                    className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[110px]">
                      {pkg.maintainer}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {pkg.hasUpdate && (
                        <button
                          onClick={() => handleUpdatePackage(pkg)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                          <span>Cập nhật</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenModifyModal(pkg)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors"
                        title="Chỉnh sửa / Cấu hình gói"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(pkg)}
                        disabled={isActionLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isRunning
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        } disabled:opacity-50`}
                      >
                        {isActionLoading ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : isRunning ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>{isRunning ? "Dừng" : "Chạy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Gói ứng dụng</th>
                  <th className="px-4 py-3">Phiên bản</th>
                  <th className="px-4 py-3">Nhà phát triển</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((pkg) => {
                  const isRunning = pkg.status === "running";
                  const isActionLoading = actionLoadingId === pkg.id;
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {pkg.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {pkg.id} {pkg.hasUpdate && <span className="text-purple-600 dark:text-purple-400 font-bold font-sans">• Có bản v{pkg.latestVersion}</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                        v{pkg.version}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {pkg.maintainer}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                          {isRunning ? "Đang chạy" : "Đã dừng"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {pkg.hasUpdate && (
                            <button
                              onClick={() => handleUpdatePackage(pkg)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                              title={`Cập nhật lên v${pkg.latestVersion}`}
                            >
                              {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                              <span>Cập nhật</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModifyModal(pkg)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Cấu hình gói"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setUninstallConfirmPkg(pkg)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 transition-colors"
                            title="Gỡ bỏ gói"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggle(pkg)}
                            disabled={isActionLoading}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isRunning
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            } disabled:opacity-50`}
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : isRunning ? (
                              <Square className="w-3 h-3 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                            <span>{isRunning ? "Dừng" : "Chạy"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID MODES: Standard, Compact, or Detailed */
        <div
          className={`grid gap-3 sm:gap-4 ${
            viewMode === "compact"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : viewMode === "detailed"
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {filtered.map((pkg) => {
            const isRunning = pkg.status === "running";
            const isActionLoading = actionLoadingId === pkg.id;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg)}
                className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border p-4 sm:p-5 shadow-sm hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  pkg.hasUpdate ? "border-purple-500/40 dark:border-purple-500/30" : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-600 dark:text-sky-400 shrink-0 ring-1 ring-sky-500/20">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-sky-500 transition-colors">
                          {pkg.name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                          v{pkg.version} {pkg.category && <span className="text-[10px] text-slate-400 font-sans">• {pkg.category}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
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
                        {isRunning ? "Đang chạy" : "Đã dừng"}
                      </span>

                      {pkg.hasUpdate && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>v{pkg.latestVersion}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {viewMode !== "compact" && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {pkg.description || "Ứng dụng Synology Package Center"}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[110px]">
                    {pkg.maintainer}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {pkg.hasUpdate && (
                      <button
                        onClick={() => handleUpdatePackage(pkg)}
                        disabled={isActionLoading}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                        title={`Cập nhật lên v${pkg.latestVersion}`}
                      >
                        {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                        <span>Cập nhật</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenModifyModal(pkg)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors"
                      title="Chỉnh sửa cấu hình gói"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setUninstallConfirmPkg(pkg)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 text-xs transition-colors"
                      title="Gỡ bỏ gói"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {isRunning && (
                      <button
                        onClick={() => handleRestart(pkg)}
                        disabled={isActionLoading}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors disabled:opacity-50"
                        title="Khởi động lại gói"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggle(pkg)}
                      disabled={isActionLoading}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isRunning
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      } disabled:opacity-50`}
                    >
                      {isActionLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : isRunning ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>{isRunning ? "Tạm dừng" : "Kích hoạt"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Install New Package Modal (Catalog + Manual Install) */}
      {isInstallModalOpen && (
        <ResponsiveModal
          open={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          maxWidth="2xl"
          title="Cài đặt Gói Ứng Dụng Mới"
          icon={<Plus className="w-5 h-5 text-sky-500" />}
        >
          <div className="space-y-4">
            {/* Tabs: Curated Catalog vs Manual Install */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setInstallTab("catalog")}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  installTab === "catalog"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Kho Ứng Dụng Đề Xuất &amp; Community</span>
              </button>
              <button
                onClick={() => setInstallTab("manual")}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  installTab === "manual"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cài Đặt Thủ Công (.spk / URL)</span>
              </button>
            </div>

            {/* TAB 1: CURATED CATALOG */}
            {installTab === "catalog" && (
              <div className="space-y-3">
                {/* Category Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {["all", "Security & VPN", "Multimedia", "Home Automation", "Network & DNS", "Backup & Sync", "Utilities & CLI", "Developer Tools"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCatalogCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        catalogCategory === cat
                          ? "bg-sky-500 text-white font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {cat === "all" ? "Tất cả danh mục" : cat}
                    </button>
                  ))}
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {catalogFiltered.map((item) => {
                    const isAlreadyInstalled = installedIds.has(item.id);
                    const isInstalling = actionLoadingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-2 rounded-xl bg-gradient-to-tr ${item.iconBg} text-white shrink-0 shadow-xs`}>
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.name}
                                </h5>
                                <span className="text-[10px] font-mono text-slate-400">
                                  v{item.version} · {item.sizeLabel}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-snug">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                          <span className="text-slate-400 font-semibold truncate max-w-[120px]">
                            {item.maintainer}
                          </span>
                          {isAlreadyInstalled ? (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Đã cài đặt</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleInstallFromCatalog(item)}
                              disabled={isInstalling}
                              className="px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            >
                              {isInstalling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              <span>Cài đặt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL INSTALL FORM */}
            {installTab === "manual" && (
              <form onSubmit={handleManualInstallSubmit} className="space-y-3 p-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                      Tên Gói Ứng Dụng *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Ví dụ: Bitwarden Client"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                      Mã Định Danh (Package ID)
                    </label>
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="Ví dụ: bitwarden_client"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                      Phiên bản (Version)
                    </label>
                    <input
                      type="text"
                      value={manualVersion}
                      onChange={(e) => setManualVersion(e.target.value)}
                      placeholder="1.0.0-001"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                      Nhà phát triển (Maintainer)
                    </label>
                    <input
                      type="text"
                      value={manualMaintainer}
                      onChange={(e) => setManualMaintainer(e.target.value)}
                      placeholder="Community"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                      Phân loại (Category)
                    </label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="Utilities">Utilities (Tiện ích)</option>
                      <option value="Security & VPN">Security &amp; VPN</option>
                      <option value="Multimedia">Multimedia</option>
                      <option value="Developer Tools">Developer Tools</option>
                      <option value="Backup & Sync">Backup &amp; Sync</option>
                      <option value="Community">Community Package</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Đường dẫn URL / SPK File
                  </label>
                  <input
                    type="text"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://example.com/packages/mypackage.spk hoặc /volume1/downloads/app.spk"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Mô tả gói
                  </label>
                  <textarea
                    rows={2}
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    placeholder="Mô tả chức năng chính của gói ứng dụng..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInstallModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isManualInstalling || !manualName.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isManualInstalling ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Xác nhận Cài đặt</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </ResponsiveModal>
      )}

      {/* MODAL 2: Community Package Sources Manager (Add / Edit / Remove Feeds) */}
      {isSourcesModalOpen && (
        <ResponsiveModal
          open={isSourcesModalOpen}
          onClose={() => {
            setIsSourcesModalOpen(false);
            setEditingServerId(null);
          }}
          maxWidth="2xl"
          title="Quản Lý Nguồn Gói Cộng Đồng (Package Sources / Feeds)"
          icon={<Globe className="w-5 h-5 text-indigo-500" />}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thêm hoặc quản lý liên kết nguồn gói của bên thứ ba (Community Repositories) để tải và cập nhật các gói ứng dụng mở rộng trên Synology DSM:
            </p>

            {/* List of Configured Sources */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto p-1 scrollbar-thin">
              {packageServers.map((server) => {
                const isEditing = editingServerId === server.id;

                return (
                  <div
                    key={server.id}
                    className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2"
                  >
                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editSourceName}
                          onChange={(e) => setEditSourceName(e.target.value)}
                          placeholder="Tên nguồn..."
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editSourceUrl}
                          onChange={(e) => setEditSourceUrl(e.target.value)}
                          placeholder="https://..."
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {server.name}
                          </span>
                          {server.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              Mặc định
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            ~{server.packageCount || 25} gói
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                          {server.url}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEditSource(server.id)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingServerId(null)}
                            className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingServerId(server.id);
                              setEditSourceName(server.name);
                              setEditSourceUrl(server.url);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            title="Sửa nguồn"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!server.isDefault && (
                            <button
                              onClick={() => handleRemoveSource(server.id, server.name)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                              title="Xóa nguồn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form: Add New Source Link */}
            <form onSubmit={handleAddCommunitySource} className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
              <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thêm Link Nguồn Gói Mới (Add Community Feed)</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Tên nguồn (VD: SynoCommunity)..."
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="url"
                  required
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://packages.synocommunity.com/..."
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={!newSourceName.trim() || !newSourceUrl.trim()}
                className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Nguồn Gói Cộng Đồng</span>
              </button>
            </form>
          </div>
        </ResponsiveModal>
      )}

      {/* MODAL 3: Modify Package Settings Modal */}
      {modifyPkg && (
        <ResponsiveModal
          open={!!modifyPkg}
          onClose={() => setModifyPkg(null)}
          maxWidth="lg"
          title={`Cấu hình Gói: ${modifyPkg.name}`}
          icon={<Settings className="w-5 h-5 text-sky-500" />}
        >
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Tên hiển thị gói
              </label>
              <input
                type="text"
                value={modifyName}
                onChange={(e) => setModifyName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Mô tả chi tiết
              </label>
              <textarea
                rows={2}
                value={modifyDesc}
                onChange={(e) => setModifyDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Auto Upgrade Toggle */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Tự động cập nhật gói (Auto-Upgrade)
                </span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Tự động tải và áp dụng các bản vá bảo mật mới nhất từ kho lưu trữ
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModifyAutoUpgrade(!modifyAutoUpgrade)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  modifyAutoUpgrade
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {modifyAutoUpgrade ? "✓ Đang bật" : "✕ Đã tắt"}
              </button>
            </div>

            {/* Service Action Shortcut */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRestart(modifyPkg)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Khởi động lại</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModifyPkg(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveModifyPackage}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </div>
          </div>
        </ResponsiveModal>
      )}

      {/* MODAL 4: Confirmation for Uninstall Package */}
      {uninstallConfirmPkg && (
        <ConfirmationModal
          isOpen={!!uninstallConfirmPkg}
          type="delete"
          title="Xác nhận Gỡ bỏ Gói Ứng dụng"
          message={`Bạn có chắc chắn muốn gỡ bỏ hoàn toàn gói ứng dụng "${uninstallConfirmPkg.name}" (ID: ${uninstallConfirmPkg.id}) khỏi thiết bị Synology NAS không? Các dịch vụ liên quan sẽ dừng hoạt động.`}
          confirmText="Gỡ bỏ gói"
          cancelText="Hủy"
          onConfirm={handleConfirmUninstall}
          onCancel={() => setUninstallConfirmPkg(null)}
        />
      )}

      {/* MODAL 5: Package Inspector Modal */}
      {selectedPkg && (
        <ResponsiveModal
          open={!!selectedPkg}
          onClose={() => setSelectedPkg(null)}
          maxWidth="lg"
          title={`${selectedPkg.name} • v${selectedPkg.version}`}
          icon={<Package className="w-5 h-5 text-sky-500" />}
          footer={
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    handleOpenModifyModal(selectedPkg);
                    setSelectedPkg(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Cấu hình</span>
                </button>
                <button
                  onClick={() => {
                    setUninstallConfirmPkg(selectedPkg);
                    setSelectedPkg(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Gỡ bỏ</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedPkg.hasUpdate && (
                  <button
                    onClick={() => handleUpdatePackage(selectedPkg)}
                    disabled={actionLoadingId === selectedPkg.id}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow"
                  >
                    {actionLoadingId === selectedPkg.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Cập nhật lên v{selectedPkg.latestVersion}</span>
                  </button>
                )}
                {selectedPkg.status === "running" && (
                  <button
                    onClick={() => handleRestart(selectedPkg)}
                    disabled={actionLoadingId === selectedPkg.id}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Khởi động lại</span>
                  </button>
                )}
                <button
                  onClick={() => handleToggle(selectedPkg)}
                  disabled={actionLoadingId === selectedPkg.id}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 ${
                    selectedPkg.status === "running"
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {actionLoadingId === selectedPkg.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : selectedPkg.status === "running" ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{selectedPkg.status === "running" ? "Tạm dừng dịch vụ" : "Kích hoạt ứng dụng"}</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Update Banner in Modal if available */}
            {selectedPkg.hasUpdate && (
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Có bản cập nhật mới: v{selectedPkg.latestVersion}</span>
                  </div>
                  {selectedPkg.changeLog && (
                    <p className="text-[11px] text-purple-600 dark:text-purple-300/80 line-clamp-2">
                      {selectedPkg.changeLog}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUpdatePackage(selectedPkg)}
                  disabled={actionLoadingId === selectedPkg.id}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                >
                  Cập nhật ngay
                </button>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mô tả chi tiết:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {selectedPkg.description || "Gói ứng dụng chính thức từ Synology Package Center."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Trạng thái:</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedPkg.status === "running" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {selectedPkg.status === "running" ? "Đang chạy (Active)" : "Đã tạm dừng (Stopped)"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Nhà phát triển:</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 truncate block">
                  {selectedPkg.maintainer}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Mã định danh (Package ID):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate block">
                  {selectedPkg.id}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Tự động cập nhật:</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {selectedPkg.autoUpgrade ? "✓ Đã kích hoạt" : "✕ Đã tắt"}
                </span>
              </div>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </div>
  );
};

export default PackageCenterTab;
