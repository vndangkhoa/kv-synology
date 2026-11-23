"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DsmUser, UserFolderAccess } from "@/lib/dsm/types";
import { PermissionLevelBadge, InheritanceTagBadge, AclRightsDetailGrid } from "./PermissionBadge";
import {
  Search,
  User as UserIcon,
  Folder,
  FolderOpen,
  Crown,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  HardDrive,
  MousePointerClick,
} from "lucide-react";

interface UserPermissionsViewProps {
  initialUser?: string;
  onInspectFolder?: (path: string) => void;
}

export const UserPermissionsView: React.FC<UserPermissionsViewProps> = ({
  initialUser,
  onInspectFolder,
}) => {
  const { t, setActiveTab, setPermissionInspectPath } = useAppStore();
  const [users, setUsers] = useState<DsmUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(initialUser || "khoavo");
  const [userAccessList, setUserAccessList] = useState<UserFolderAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFolder, setSearchFolder] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [inheritanceFilter, setInheritanceFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Sync initialUser when prop changes (e.g. clicked from EffectivePermTester)
  useEffect(() => {
    if (initialUser) {
      setSelectedUser(initialUser);
    }
  }, [initialUser]);

  // Load user list
  useEffect(() => {
    const fetchUsers = async () => {
      const uList = await dsmClient.getDsmUsers();
      setUsers(uList);
      if (uList.length > 0 && !initialUser) {
        const loggedIn = dsmClient.getSession().account;
        const targetUser = uList.find((u) => u.name.toLowerCase() === loggedIn?.toLowerCase()) || uList[0];
        setSelectedUser(targetUser.name);
      }
    };
    fetchUsers();
  }, [initialUser]);

  // Load access list when selected user changes
  useEffect(() => {
    if (!selectedUser) return;
    const fetchUserAccess = async () => {
      setLoading(true);
      try {
        const list = await dsmClient.getUserFolderAccessList(selectedUser);
        setUserAccessList(list);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAccess();
  }, [selectedUser]);

  const currentUserObj = useMemo(() => {
    return users.find((u) => u.name.toLowerCase() === selectedUser.toLowerCase());
  }, [users, selectedUser]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = userAccessList.length;
    const full = userAccessList.filter((i) => i.level === "full_control").length;
    const rw = userAccessList.filter((i) => i.level === "read_write").length;
    const ro = userAccessList.filter((i) => i.level === "read_only").length;
    const deny = userAccessList.filter((i) => i.level === "deny").length;
    const direct = userAccessList.filter((i) => i.inheritance === "direct" || i.inheritance === "owner").length;
    const inherited = userAccessList.filter((i) => i.inheritance === "inherited_folder" || i.inheritance === "inherited_group").length;
    return { total, full, rw, ro, deny, direct, inherited };
  }, [userAccessList]);

  // Filtered access list
  const filteredList = useMemo(() => {
    return userAccessList.filter((item) => {
      if (searchFolder.trim()) {
        const q = searchFolder.toLowerCase();
        const matchPath = item.path.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        if (!matchPath && !matchName) return false;
      }

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
  }, [userAccessList, searchFolder, levelFilter, inheritanceFilter]);

  const handleCardFilterClick = (level: string) => {
    if (levelFilter === level) {
      setLevelFilter("all");
    } else {
      setLevelFilter(level);
      setInheritanceFilter("all");
    }
  };

  const handleInheritanceToggle = () => {
    if (inheritanceFilter === "all") {
      setInheritanceFilter("direct");
    } else if (inheritanceFilter === "direct") {
      setInheritanceFilter("inherited");
    } else {
      setInheritanceFilter("all");
    }
    setLevelFilter("all");
  };

  const handleOpenInFileStation = (path: string) => {
    setActiveTab("files");
    setPermissionInspectPath(path);
  };

  return (
    <div className="space-y-6">
      {/* Top User Selector & Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* User Dropdown Picker */}
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {t.permissions.userLookupTitle}
            </label>
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer shadow-xs"
              >
                {users.map((u) => (
                  <option key={u.name} value={u.name}>
                    👤 {u.name} {u.isAdmin ? "(Admin)" : ""} — {u.description || "User"}
                  </option>
                ))}
              </select>
              <UserIcon className="w-5 h-5 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* User Quick Info Box */}
          {currentUserObj && (
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 lg:min-w-[320px]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-sky-500/20 shrink-0">
                {currentUserObj.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {currentUserObj.name}
                  </span>
                  {currentUserObj.isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Crown className="w-3 h-3" /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUserObj.description || currentUserObj.email || "UID: " + currentUserObj.uid}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentUserObj.groups.map((g) => (
                    <span
                      key={g}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      @{g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Statistics Metric Cards (Clickable Filter Boxes) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          {/* Total Box */}
          <button
            type="button"
            onClick={() => {
              setLevelFilter("all");
              setInheritanceFilter("all");
            }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              levelFilter === "all" && inheritanceFilter === "all"
                ? "bg-slate-100 dark:bg-slate-800 border-sky-500 ring-2 ring-sky-500 shadow-sm"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">
                {t.permissions.totalFolders}
              </span>
              <MousePointerClick className="w-3 h-3 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-800 dark:text-white">
                {stats.total}
              </span>
              <span className="text-xs text-slate-400 font-medium">folders</span>
            </div>
          </button>

          {/* Full Control Box */}
          <button
            type="button"
            onClick={() => handleCardFilterClick("full_control")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              levelFilter === "full_control"
                ? "bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500 shadow-sm"
                : "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                {t.permissions.levelFull}
              </span>
              <MousePointerClick className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.full}
              </span>
            </div>
          </button>

          {/* Read & Write Box */}
          <button
            type="button"
            onClick={() => handleCardFilterClick("read_write")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              levelFilter === "read_write"
                ? "bg-sky-500/15 dark:bg-sky-500/20 border-sky-500 ring-2 ring-sky-500 shadow-sm"
                : "bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold block">
                {t.permissions.levelRw}
              </span>
              <MousePointerClick className="w-3 h-3 text-sky-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                {stats.rw}
              </span>
            </div>
          </button>

          {/* Read-Only Box */}
          <button
            type="button"
            onClick={() => handleCardFilterClick("read_only")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              levelFilter === "read_only"
                ? "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 ring-2 ring-amber-500 shadow-sm"
                : "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block">
                {t.permissions.levelRo}
              </span>
              <MousePointerClick className="w-3 h-3 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {stats.ro}
              </span>
            </div>
          </button>

          {/* Deny Box */}
          <button
            type="button"
            onClick={() => handleCardFilterClick("deny")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              levelFilter === "deny"
                ? "bg-rose-500/15 dark:bg-rose-500/20 border-rose-500 ring-2 ring-rose-500 shadow-sm"
                : "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block">
                {t.permissions.levelDeny}
              </span>
              <MousePointerClick className="w-3 h-3 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                {stats.deny}
              </span>
            </div>
          </button>

          {/* Direct / Inherited Box */}
          <button
            type="button"
            onClick={handleInheritanceToggle}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              inheritanceFilter !== "all"
                ? "bg-indigo-500/15 dark:bg-indigo-500/20 border-indigo-500 ring-2 ring-indigo-500 shadow-sm"
                : "bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold block truncate">
                {inheritanceFilter === "direct"
                  ? "Chỉ Trực tiếp"
                  : inheritanceFilter === "inherited"
                  ? "Chỉ Kế thừa"
                  : `${t.permissions.directAccess} / ${t.permissions.inheritedAccess}`}
              </span>
              <MousePointerClick className="w-3 h-3 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {stats.direct} <span className="text-xs font-normal text-slate-400">/</span> {stats.inherited}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={t.permissions.searchFolderPlaceholder}
            value={searchFolder}
            onChange={(e) => setSearchFolder(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchFolder && (
            <button
              onClick={() => setSearchFolder("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Level Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="all">{t.permissions.allLevels}</option>
              <option value="full_control">{t.permissions.levelFull}</option>
              <option value="read_write">{t.permissions.levelRw}</option>
              <option value="read_only">{t.permissions.levelRo}</option>
              <option value="deny">{t.permissions.levelDeny}</option>
            </select>
          </div>

          {/* Inheritance Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
            <select
              value={inheritanceFilter}
              onChange={(e) => setInheritanceFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="all">{t.permissions.allOrigins}</option>
              <option value="direct">{t.permissions.directOnly}</option>
              <option value="inherited">{t.permissions.inheritedOnly}</option>
              <option value="owner">{t.permissions.ownerOnly}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Access Folder List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-sky-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.permissions.accessibleFoldersCount
                .replace("{user}", selectedUser)
                .replace("{count}", String(filteredList.length))}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang phân tích quyền truy cập của người dùng...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Folder className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">
              Không tìm thấy thư mục nào phù hợp với bộ lọc đã chọn.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredList.map((item) => {
              const isExpanded = expandedRow === item.path;
              return (
                <div
                  key={item.path}
                  className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => onInspectFolder?.(item.path)}
                            className="font-bold text-sm text-slate-900 dark:text-white font-mono hover:text-sky-500 cursor-pointer"
                            title="Bấm để kiểm tra phân quyền thư mục này"
                          >
                            {item.path}
                          </span>
                          <InheritanceTagBadge inheritance={item.inheritance} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {item.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <PermissionLevelBadge level={item.level} />
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : item.path)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        {isExpanded ? (
                          <>
                            <span>{t.common.cancel}</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>{t.permissions.rightsDetail}</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectFolder?.(item.path)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                        title={t.permissions.inspectFolder}
                      >
                        <HardDrive className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInFileStation(item.path)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                        title={t.permissions.openInFileStation}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded 11 ACL Rights Grid */}
                  {isExpanded && (
                    <div className="pt-2 animate-in fade-in duration-150">
                      <AclRightsDetailGrid rights={item.rights} />
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
