"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { FolderAclInfo, FolderUserAccess, PermissionLevel, InheritanceType } from "@/lib/dsm/types";
import { PermissionLevelBadge, InheritanceTagBadge, AclRightsDetailGrid } from "./PermissionBadge";
import {
  Search,
  Folder,
  FolderOpen,
  Users,
  User as UserIcon,
  Crown,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
  GitBranch,
  ArrowDownRight,
  ExternalLink,
  Filter,
  CheckCircle2,
  FolderTree,
} from "lucide-react";

interface FolderPermissionsViewProps {
  initialPath?: string;
  onSelectUser?: (username: string) => void;
}

export const FolderPermissionsView: React.FC<FolderPermissionsViewProps> = ({
  initialPath = "/projects/frontend",
  onSelectUser,
}) => {
  const { t, setActiveTab } = useAppStore();
  const [folderPath, setFolderPath] = useState<string>(initialPath);
  const [pathInput, setPathInput] = useState<string>(initialPath);
  const [aclInfo, setAclInfo] = useState<FolderAclInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTarget, setSearchTarget] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [inheritanceFilter, setInheritanceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "users" | "groups">("all");
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [realShares, setRealShares] = useState<string[]>([]);

  // Preset fallback paths
  const defaultPresetPaths = [
    "/docker",
    "/projects",
    "/projects/frontend",
    "/projects/backend",
    "/finance",
    "/finance/2026-reports",
    "/downloads",
    "/video",
    "/homes/khoavo",
    "/public-share",
  ];

  // Load real shared folders from live NAS
  useEffect(() => {
    const loadRealShares = async () => {
      try {
        const shares = await dsmClient.listFiles("/");
        if (shares && shares.length > 0) {
          const paths = shares.map((s) => s.path);
          setRealShares(paths);
          // If initialPath is a default mock and not in real shares, select first real share
          if (paths.length > 0 && initialPath === "/projects/frontend" && !paths.includes(initialPath)) {
            setFolderPath(paths[0]);
            setPathInput(paths[0]);
          }
        }
      } catch (_) {}
    };
    loadRealShares();
  }, []);

  // Fetch ACL info when folderPath changes
  useEffect(() => {
    const loadAcl = async () => {
      setLoading(true);
      try {
        const info = await dsmClient.getFolderAclInfo(folderPath);
        setAclInfo(info);
      } finally {
        setLoading(false);
      }
    };
    loadAcl();
  }, [folderPath]);

  // Handle path submission
  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      let clean = pathInput.trim();
      if (!clean.startsWith("/")) clean = "/" + clean;
      setFolderPath(clean);
    }
  };

  const selectPreset = (p: string) => {
    setPathInput(p);
    setFolderPath(p);
  };

  const displayPresetPaths = realShares.length > 0 ? realShares : defaultPresetPaths;

  // Filtered access list
  const filteredAccessList = useMemo(() => {
    if (!aclInfo) return [];
    return aclInfo.accessList.filter((item) => {
      if (searchTarget.trim()) {
        const q = searchTarget.toLowerCase();
        const matchName = item.targetName.toLowerCase().includes(q);
        const matchDisplay = (item.displayName || "").toLowerCase().includes(q);
        if (!matchName && !matchDisplay) return false;
      }

      if (typeFilter === "users" && item.isGroup) return false;
      if (typeFilter === "groups" && !item.isGroup) return false;

      if (levelFilter !== "all" && item.level !== levelFilter) {
        return false;
      }

      if (inheritanceFilter !== "all") {
        if (inheritanceFilter === "direct" && item.inheritance !== "direct" && item.inheritance !== "owner") {
          return false;
        }
        if (inheritanceFilter === "inherited" && item.inheritance !== "inherited_folder" && item.inheritance !== "inherited_group") {
          return false;
        }
        if (inheritanceFilter === "owner" && item.inheritance !== "owner" && !item.isOwner) {
          return false;
        }
      }

      return true;
    });
  }, [aclInfo, searchTarget, typeFilter, levelFilter, inheritanceFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!aclInfo) return { total: 0, users: 0, groups: 0, full: 0, rw: 0, ro: 0, deny: 0 };
    const list = aclInfo.accessList;
    const users = list.filter((i) => !i.isGroup).length;
    const groups = list.filter((i) => i.isGroup).length;
    const full = list.filter((i) => i.level === "full_control").length;
    const rw = list.filter((i) => i.level === "read_write").length;
    const ro = list.filter((i) => i.level === "read_only").length;
    const deny = list.filter((i) => i.level === "deny").length;
    return { total: list.length, users, groups, full, rw, ro, deny };
  }, [aclInfo]);

  // Path hierarchy breakdown for visual tree
  const pathParts = useMemo(() => {
    const parts = folderPath.split("/").filter(Boolean);
    const result = [{ name: "Root (/)", path: "/" }];
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      result.push({ name: part, path: current });
    }
    return result;
  }, [folderPath]);

  return (
    <div className="space-y-6">
      {/* Top Path Search Bar & Presets */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {t.permissions.folderLookupTitle}
          </label>
          <form onSubmit={handleNavigate} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="/docker, /projects/frontend, /finance..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
              />
              <FolderOpen className="w-5 h-5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-sky-500/20 shrink-0"
            >
              {t.permissions.checkPermissionBtn}
            </button>
          </form>
        </div>

        {/* Quick Presets / Live Shares */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block mb-2">
            {realShares.length > 0 ? t.permissions.sharedFoldersOnNas : t.permissions.presetFolders}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {displayPresetPaths.map((p) => (
              <button
                key={p}
                onClick={() => selectPreset(p)}
                className={`px-2.5 py-1 text-xs font-mono rounded-xl border transition-all ${
                  folderPath === p
                    ? "bg-sky-500 text-white font-bold border-sky-500 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Folder Information Card & Inheritance Chain */}
      {aclInfo && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Folder className="w-6 h-6 text-amber-500 shrink-0" />
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {aclInfo.path}
                </h2>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Real Path: {aclInfo.realPath || `/volume1${aclInfo.path}`} | POSIX: {aclInfo.posixPerm}
              </p>
            </div>

            {/* Folder Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                {t.permissions.ownerAccess}: <strong>{aclInfo.owner}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                <Users className="w-3.5 h-3.5 text-violet-500" />
                Group: <strong>@{aclInfo.group}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {t.permissions.folderAclMode}
              </span>
            </div>
          </div>

          {/* Inheritance Chain Breadcrumbs Visualizer */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <GitBranch className="w-4 h-4 text-sky-500" />
              <span>{t.permissions.inheritanceChain}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
              {pathParts.map((item, idx) => {
                const isLast = idx === pathParts.length - 1;
                return (
                  <React.Fragment key={item.path}>
                    <button
                      onClick={() => selectPreset(item.path)}
                      className={`px-2.5 py-1 rounded-lg border transition-all ${
                        isLast
                          ? "bg-sky-500 text-white font-bold border-sky-500 shadow-xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {item.name}
                    </button>
                    {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">{t.permissions.totalUsers}</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                {stats.users} <span className="text-xs font-normal text-slate-400">users</span>
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">{t.permissions.totalGroups}</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                {stats.groups} <span className="text-xs font-normal text-slate-400">groups</span>
              </span>
            </div>

            <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">{t.permissions.levelFull}</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {stats.full}
              </span>
            </div>

            <div className="p-2.5 bg-sky-500/5 dark:bg-sky-500/10 rounded-xl border border-sky-500/20">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium block">{t.permissions.levelRw}</span>
              <span className="text-base font-extrabold text-sky-600 dark:text-sky-400 mt-0.5 block">
                {stats.rw}
              </span>
            </div>

            <div className="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">{t.permissions.levelRo}</span>
              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {stats.ro}
              </span>
            </div>

            <div className="p-2.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block">{t.permissions.levelDeny}</span>
              <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block">
                {stats.deny}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search Target */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTarget}
            onChange={(e) => setSearchTarget(e.target.value)}
            placeholder={t.permissions.searchFolderPlaceholder}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <span>{t.permissions.filterTarget}:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">{t.permissions.allTargets}</option>
            <option value="users">{t.permissions.onlyUsers}</option>
            <option value="groups">{t.permissions.onlyGroups}</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0 ml-1">
            <span>{t.permissions.filterLevel}:</span>
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">{t.permissions.allLevels}</option>
            <option value="full_control">{t.permissions.levelFull}</option>
            <option value="read_write">{t.permissions.levelRw}</option>
            <option value="read_only">{t.permissions.levelRo}</option>
            <option value="deny">{t.permissions.levelDeny}</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0 ml-1">
            <span>{t.permissions.filterOrigin}:</span>
          </div>
          <select
            value={inheritanceFilter}
            onChange={(e) => setInheritanceFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">{t.permissions.allOrigins}</option>
            <option value="direct">{t.permissions.directOnly}</option>
            <option value="inherited">{t.permissions.inheritedOnly}</option>
            <option value="owner">{t.permissions.ownerOnly}</option>
          </select>
        </div>
      </div>

      {/* Users and Groups Having Access Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.permissions.accessibleUsersCount.replace("{count}", String(filteredAccessList.length))}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab("files")}
            className="text-xs text-sky-500 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>{t.permissions.openInFileStation}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {t.common.loading}
          </div>
        ) : filteredAccessList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t.common.error}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredAccessList.map((item) => {
              const isExpanded = expandedTarget === item.targetName;
              return (
                <div
                  key={item.targetName}
                  className={`transition-colors ${
                    isExpanded
                      ? "bg-sky-50/40 dark:bg-sky-950/20"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <div className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: User/Group Profile */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 mt-0.5 ${
                          item.isGroup
                            ? "bg-gradient-to-br from-violet-500 to-purple-600"
                            : "bg-gradient-to-br from-sky-500 to-indigo-600"
                        }`}
                      >
                        {item.isGroup ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          item.targetName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-sky-500 cursor-pointer"
                            onClick={() => !item.isGroup && onSelectUser?.(item.targetName)}
                          >
                            {item.displayName || item.targetName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              item.isGroup
                                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                            }`}
                          >
                            {item.isGroup ? "Group" : "User"}
                          </span>
                          {item.userGroups && (
                            <span className="text-[10px] text-slate-400">
                              (@{item.userGroups.join(", @")})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.explanation || ""}</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Badges */}
                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                      <PermissionLevelBadge level={item.level} />
                      <InheritanceTagBadge
                        inheritance={item.inheritance}
                        inheritedFrom={item.inheritedFrom}
                        isOwner={item.isOwner}
                      />
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      {!item.isGroup && (
                        <button
                          onClick={() => onSelectUser?.(item.targetName)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-600 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all flex items-center gap-1"
                          title={t.permissions.inspectUser}
                        >
                          <span>{t.permissions.inspectUser}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedTarget(isExpanded ? null : item.targetName)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title={t.permissions.rightsDetail}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable ACL Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 sm:px-6 sm:pb-5">
                      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                          <Layers className="w-3.5 h-3.5 text-sky-500" />
                          {t.permissions.aclPrivileges} ({item.targetName}):
                        </span>
                        <AclRightsDetailGrid rights={item.rights} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
