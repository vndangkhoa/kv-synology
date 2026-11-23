"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { ReverseProxyRule, ReverseProxyPayload, ReverseProxyHealthInfo } from "@/lib/dsm/types";
import { ReverseProxyModal } from "./ReverseProxyModal";
import {
  Globe,
  ShieldCheck,
  Server,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Check,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Grid3X3,
  Grid2X2,
  List,
  LogIn,
  AlertCircle,
} from "lucide-react";

type ViewGridMode = "grid-3" | "grid-2" | "list";

export const ReverseProxyTab: React.FC = () => {
  const { session, openLoginModal, t } = useAppStore();
  const rp = t.reverseProxy;

  const [rules, setRules] = useState<ReverseProxyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [protoFilter, setProtoFilter] = useState<"all" | "https" | "http">("all");
  const [gridMode, setGridMode] = useState<ViewGridMode>("grid-3");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReverseProxyRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<ReverseProxyRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Health diagnosis state
  const [diagnosing, setDiagnosing] = useState(false);
  const [healthInfo, setHealthInfo] = useState<ReverseProxyHealthInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load gridMode preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dsm_reverse_proxy_view_mode") as ViewGridMode;
      if (saved && ["grid-3", "grid-2", "list"].includes(saved)) {
        setGridMode(saved);
      }
    } catch {}
  }, []);

  const changeGridMode = (mode: ViewGridMode) => {
    setGridMode(mode);
    try {
      localStorage.setItem("dsm_reverse_proxy_view_mode", mode);
    } catch {}
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadRules = async (silent = false) => {
    if (!session.isConnected) {
      setRules([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const data = await dsmClient.getReverseProxyRules();
      setRules(data);
    } catch (err: any) {
      console.error("Failed to load reverse proxy rules:", err);
      setLoadError(err.message || "Không thể kết nối đến WebAPI Reverse Proxy trên NAS");
      showToast("error", err.message || "Lỗi tải danh sách Reverse Proxy");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [session.isConnected]);

  // Statistics
  const stats = useMemo(() => {
    const total = rules.length;
    const httpsCount = rules.filter((r) => r.frontend.protocol === 1).length;
    const wsCount = rules.filter((r) =>
      r.customize_headers?.some((h) => h.name.toLowerCase() === "upgrade")
    ).length;
    const uniqueHosts = new Set(rules.map((r) => r.backend.fqdn)).size;

    return { total, httpsCount, wsCount, uniqueHosts };
  }, [rules]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      // Protocol filter
      if (protoFilter === "https" && r.frontend.protocol !== 1) return false;
      if (protoFilter === "http" && r.frontend.protocol !== 0) return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchDesc = r.description.toLowerCase().includes(query);
        const matchDomain = r.frontend.fqdn.toLowerCase().includes(query);
        const matchTarget = `${r.backend.fqdn}:${r.backend.port}`.toLowerCase().includes(query);
        const matchPort = String(r.frontend.port).includes(query);
        return matchDesc || matchDomain || matchTarget || matchPort;
      }
      return true;
    });
  }, [rules, protoFilter, search]);

  const handleSaveRule = async (payload: ReverseProxyPayload) => {
    if (payload.UUID) {
      // Update
      const res = await dsmClient.updateReverseProxyRule(payload as ReverseProxyRule);
      if (res.success) {
        showToast("success", rp.saveSuccess);
        loadRules(true);
      } else {
        throw new Error(res.error || rp.saveError);
      }
    } else {
      // Create
      const res = await dsmClient.createReverseProxyRule(payload);
      if (res.success) {
        showToast("success", rp.saveSuccess);
        loadRules(true);
      } else {
        throw new Error(res.error || rp.saveError);
      }
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    try {
      setIsDeleting(true);
      const res = await dsmClient.deleteReverseProxyRule(deletingRule.UUID);
      if (res.success) {
        showToast("success", rp.deleteSuccess);
        const removedUuid = deletingRule.UUID;
        setDeletingRule(null);
        setRules((prev) => prev.filter((r) => r.UUID !== removedUuid));
        loadRules(true);
      } else {
        showToast("error", res.error || "Không thể xóa rule");
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi xóa rule");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDiagnose = async () => {
    try {
      setDiagnosing(true);
      const info = await dsmClient.diagnoseReverseProxyHealth();
      setHealthInfo(info);
      showToast("success", info.nginxDetails || rp.diagnosticOk);
    } catch (err: any) {
      showToast("error", err.message || "Lỗi kiểm tra Nginx");
    } finally {
      setDiagnosing(false);
    }
  };

  const copyRuleUrl = (rule: ReverseProxyRule) => {
    const proto = rule.frontend.protocol === 1 ? "https" : "http";
    const portStr =
      (rule.frontend.protocol === 1 && rule.frontend.port === 443) ||
      (rule.frontend.protocol === 0 && rule.frontend.port === 80)
        ? ""
        : `:${rule.frontend.port}`;
    const url = `${proto}://${rule.frontend.fqdn}${portStr}`;
    navigator.clipboard.writeText(url);
    setCopiedId(rule.UUID);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 border ${
            toastMessage.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-400/30"
              : "bg-rose-500/90 text-white border-rose-400/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-sky-500" />
            Cổng ủy quyền ngược (Reverse Proxy)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Quản trị các quy tắc điều hướng tên miền và bảo mật SSL trực tiếp trên Nginx DSM
          </p>
        </div>

        {session.isConnected && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleDiagnose}
              disabled={diagnosing}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              title="Kiểm tra cú pháp Nginx và tình trạng Reverse Proxy"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-500 ${diagnosing ? "animate-spin" : ""}`} />
              <span>{diagnosing ? rp.diagnosing : rp.diagnoseBtn}</span>
            </button>

            <button
              onClick={() => loadRules()}
              disabled={loading}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
            </button>

            <button
              onClick={() => {
                setEditingRule(null);
                setIsModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm shadow-sky-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{rp.addRule}</span>
            </button>
          </div>
        )}
      </div>

      {/* Disconnected State Prompt */}
      {!session.isConnected ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/10 text-sky-500 mx-auto flex items-center justify-center ring-8 ring-sky-500/5">
            <Globe className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Kết nối Synology DSM để Quản lý Reverse Proxy Thực tế
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Tính năng Reverse Proxy hoạt động 100% bằng dữ liệu thực từ máy chủ NAS của bạn qua WebAPI (SYNO.Core.AppPortal.ReverseProxy). Vui lòng đăng nhập để xem, tạo mới và chỉnh sửa quy tắc.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => openLoginModal(true)}
              className="px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-lg shadow-sky-500/25 inline-flex items-center gap-2 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập & Kết nối NAS</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{rp.totalRules}</p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</h4>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{rp.httpsRules}</p>
                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.httpsCount}</h4>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{rp.wsRules}</p>
                <h4 className="text-xl font-black text-amber-500 mt-0.5">{stats.wsCount}</h4>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{rp.targetHosts}</p>
                <h4 className="text-xl font-black text-indigo-500 mt-0.5">{stats.uniqueHosts}</h4>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 w-full md:w-auto items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={rp.searchPlaceholder}
                  className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Filter Protocol */}
              <select
                value={protoFilter}
                onChange={(e) => setProtoFilter(e.target.value as any)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">{rp.filterAll}</option>
                <option value="https">{rp.filterHttps}</option>
                <option value="http">{rp.filterHttp}</option>
              </select>
            </div>

            {/* Grid View Controls */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-slate-500 shrink-0">
              <button
                onClick={() => changeGridMode("grid-3")}
                className={`p-1.5 rounded-lg transition-colors ${
                  gridMode === "grid-3"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
                title="3 Cột (Tiêu chuẩn)"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeGridMode("grid-2")}
                className={`p-1.5 rounded-lg transition-colors ${
                  gridMode === "grid-2"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
                title="2 Cột (Chi tiết)"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeGridMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  gridMode === "list"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Danh sách (Thu gọn)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Load Error Alert */}
          {loadError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                onClick={() => loadRules()}
                className="px-3 py-1 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shrink-0"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Rules Presentation based on Grid Mode */}
          {loading && rules.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-sky-500 opacity-60" />
              <p className="text-xs font-medium">Đang tải danh sách Reverse Proxy thực tế từ DSM...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 mx-auto flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">{rp.emptyTitle}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{rp.emptyDesc}</p>
              <button
                onClick={() => {
                  setEditingRule(null);
                  setIsModalOpen(true);
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{rp.addRule}</span>
              </button>
            </div>
          ) : gridMode === "list" ? (
            /* LIST VIEW MODE */
            <div className="flex flex-col space-y-2.5">
              {filteredRules.map((rule) => {
                const isHttps = rule.frontend.protocol === 1;
                const hasWs = rule.customize_headers?.some((h) => h.name.toLowerCase() === "upgrade");
                const targetUrl = `${isHttps ? "https" : "http"}://${rule.frontend.fqdn}${
                  (isHttps && rule.frontend.port === 443) || (!isHttps && rule.frontend.port === 80)
                    ? ""
                    : `:${rule.frontend.port}`
                }`;

                return (
                  <div
                    key={rule.UUID}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/40 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    {/* Left: Info & Description */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isHttps
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {rule.description}
                          </span>
                          {isHttps ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> HTTPS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                              HTTP
                            </span>
                          )}
                          {hasWs && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-500/20">
                              WS
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          UUID: {rule.UUID.slice(0, 16)}...
                        </p>
                      </div>
                    </div>

                    {/* Middle: Route Mapping */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs shrink-0">
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                      >
                        <span>{rule.frontend.fqdn}</span>
                        <span className="text-slate-400 font-normal">:{rule.frontend.port}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </a>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {rule.backend.fqdn}:{rule.backend.port}
                      </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-end gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => copyRuleUrl(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={copiedId === rule.UUID ? rp.copied : rp.copyUrl}
                      >
                        {copiedId === rule.UUID ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>

                      <button
                        onClick={() => setDeletingRule(rule)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Xóa rule này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* GRID VIEW MODE (grid-3 or grid-2) */
            <div
              className={`grid gap-4 ${
                gridMode === "grid-2"
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {filteredRules.map((rule) => {
                const isHttps = rule.frontend.protocol === 1;
                const hasWs = rule.customize_headers?.some((h) => h.name.toLowerCase() === "upgrade");
                const targetUrl = `${isHttps ? "https" : "http"}://${rule.frontend.fqdn}${
                  (isHttps && rule.frontend.port === 443) || (!isHttps && rule.frontend.port === 80)
                    ? ""
                    : `:${rule.frontend.port}`
                }`;

                return (
                  <div
                    key={rule.UUID}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/50 dark:hover:border-sky-500/40 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Header: Description & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {rule.description}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono select-all truncate block">
                            UUID: {rule.UUID.slice(0, 13)}...
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isHttps ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> HTTPS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                              HTTP
                            </span>
                          )}

                          {hasWs && (
                            <span
                              className="px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-500/20"
                              title="Bật WebSocket Upgrade"
                            >
                              WS
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Routing Visual: Source -> Destination */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 mb-3">
                        {/* Source */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-400">Nguồn (Domain):</span>
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                          >
                            <span className="truncate">{rule.frontend.fqdn}</span>
                            <span className="text-slate-400 font-normal">:{rule.frontend.port}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                          </a>
                        </div>

                        <div className="flex items-center justify-center text-slate-300 dark:text-slate-600 py-0.5">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>

                        {/* Destination */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-400">Đích (Backend):</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                            {rule.backend.protocol === 1 ? "https://" : "http://"}
                            {rule.backend.fqdn}:
                            <span className="text-emerald-700 dark:text-emerald-300 font-black">{rule.backend.port}</span>
                          </span>
                        </div>
                      </div>

                      {/* Meta Details: HSTS, Headers */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {rule.frontend.https?.hsts && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" /> HSTS
                          </span>
                        )}

                        {rule.customize_headers && rule.customize_headers.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {rule.customize_headers.length} header tùy biến
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Action Buttons */}
                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyRuleUrl(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={copiedId === rule.UUID ? rp.copied : rp.copyUrl}
                        >
                          {copiedId === rule.UUID ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                          title={rp.openLink}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => setDeletingRule(rule)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Xóa rule này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <ReverseProxyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRule}
        editingRule={editingRule}
        existingRules={rules}
      />

      {/* Delete Confirmation Dialog */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {rp.deleteConfirmTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deletingRule.description}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {rp.deleteConfirmMsg} <strong className="text-slate-900 dark:text-white">{deletingRule.frontend.fqdn}</strong> (trỏ tới cổng {deletingRule.backend.port})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRule(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteRule}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Đang xóa..." : "Xác nhận Xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
