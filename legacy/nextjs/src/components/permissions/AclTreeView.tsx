"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FolderTreeNode, AclLevel } from "@/lib/permissions/types";
import { cleanPath } from "@/lib/permissions/aclEngine";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  Folder,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Search,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

interface AclTreeViewProps {
  folders: Map<string, FolderTreeNode>;
  rootSharedFolders: string[];
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
}

export const AclTreeView: React.FC<AclTreeViewProps> = ({
  folders,
  rootSharedFolders,
  selectedPath,
  onSelectPath,
}) => {
  const { t } = useAppStore();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedSharedFolder, setSelectedSharedFolder] = useState("ALL");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("ALL");
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<string>("ALL");

  // Automatically expand top-level folders (depth <= 2)
  useEffect(() => {
    const initExpanded = new Set<string>();
    for (const [path, node] of folders.entries()) {
      if (node.depth <= 2) {
        initExpanded.add(path);
      }
    }
    setExpandedPaths(initExpanded);
  }, [folders]);

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Flattened hierarchical tree items with filtering
  const treeItems = useMemo(() => {
    const items: {
      path: string;
      node: FolderTreeNode;
      depth: number;
      hasChildren: boolean;
    }[] = [];

    const search = cleanPath(searchFilter).toLowerCase();
    const isSearching = searchFilter.trim().length > 0;
    const isAllShares = selectedSharedFolder === "ALL";
    const isAllLevels = selectedLevelFilter === "ALL";
    const isAllOrigins = selectedOriginFilter === "ALL";
    const shareLower = selectedSharedFolder.toLowerCase();

    const matchesFilter = (node: FolderTreeNode): boolean => {
      const matchShare = isAllShares || node.lowerSharedFolder === shareLower || node.lowerPath.includes(shareLower);
      const matchLevel = isAllLevels || (node.levels && node.levels.includes(selectedLevelFilter as AclLevel));
      const matchOrigin =
        isAllOrigins ||
        (selectedOriginFilter === "DIRECT" && node.hasDirect) ||
        (selectedOriginFilter === "INHERITED" && node.hasInherited);
      const matchSearch =
        !isSearching || node.lowerName.includes(search) || node.lowerPath.includes(search);

      return matchShare && matchLevel && matchOrigin && matchSearch;
    };

    if (isSearching) {
      let count = 0;
      for (const [p, node] of folders.entries()) {
        if (matchesFilter(node)) {
          items.push({
            path: p,
            node,
            depth: node.depth,
            hasChildren: node.childrenPaths.length > 0,
          });
          if (++count >= 1500) break;
        }
      }
      return items;
    }

    const traverse = (path: string, depth: number) => {
      const node = folders.get(path);
      if (!node) return;
      if (!isAllShares && !(node.lowerSharedFolder === shareLower || node.lowerPath.includes(shareLower)) && node.depth > 1) {
        return;
      }

      const match = matchesFilter(node);
      const hasChildren = node.childrenPaths.length > 0;

      if (match || (isAllLevels && isAllOrigins)) {
        items.push({
          path,
          node,
          depth,
          hasChildren,
        });
      }

      if (expandedPaths.has(path)) {
        for (const childPath of node.childrenPaths) {
          traverse(childPath, depth + 1);
        }
      }
    };

    for (const [p, node] of folders.entries()) {
      if (!node.parentPath || !folders.has(node.parentPath)) {
        traverse(p, 0);
      }
    }

    return items;
  }, [
    folders,
    expandedPaths,
    searchFilter,
    selectedSharedFolder,
    selectedLevelFilter,
    selectedOriginFilter,
  ]);

  const hasActiveFilters =
    searchFilter !== "" ||
    selectedSharedFolder !== "ALL" ||
    selectedLevelFilter !== "ALL" ||
    selectedOriginFilter !== "ALL";

  const handleResetFilters = () => {
    setSearchFilter("");
    setSelectedSharedFolder("ALL");
    setSelectedLevelFilter("ALL");
    setSelectedOriginFilter("ALL");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Search & Filter Top Bar */}
      <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (text && (text.includes("\\") || /^[a-zA-Z]:/.test(text))) {
                e.preventDefault();
                setSearchFilter(cleanPath(text));
              }
            }}
            placeholder={t.permissions.searchFolderPlaceholder}
            className="w-full pl-9 pr-7 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Shared folder selector */}
          <select
            value={selectedSharedFolder}
            onChange={(e) => setSelectedSharedFolder(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs"
          >
            <option value="ALL">Tất cả Shared Folders ({rootSharedFolders.length})</option>
            {rootSharedFolders.map((sf) => (
              <option key={sf} value={sf}>
                /{sf}
              </option>
            ))}
          </select>

          {/* Level filter */}
          <select
            value={selectedLevelFilter}
            onChange={(e) => setSelectedLevelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs"
          >
            <option value="ALL">{t.permissions.allLevels}</option>
            <option value="FULL_CONTROL">{t.permissions.levelFull}</option>
            <option value="READ_WRITE">{t.permissions.levelRw}</option>
            <option value="READ">{t.permissions.levelRo}</option>
            <option value="DENY">{t.permissions.levelDeny}</option>
          </select>

          {/* Origin filter */}
          <select
            value={selectedOriginFilter}
            onChange={(e) => setSelectedOriginFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs"
          >
            <option value="ALL">{t.permissions.allOrigins}</option>
            <option value="DIRECT">{t.permissions.directOnly}</option>
            <option value="INHERITED">{t.permissions.inheritedOnly}</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Đang lọc: {treeItems.length} thư mục khớp
            </span>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-sky-500 hover:text-sky-600 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* Hierarchical Tree Container */}
      <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-slate-900 font-mono text-xs select-none max-h-[620px] min-h-[420px]">
        {treeItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2 font-sans">
            <Folder className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Không tìm thấy thư mục nào phù hợp với bộ lọc
            </p>
            <p className="text-xs text-slate-400">
              Thử xóa bớt từ khóa tìm kiếm hoặc chọn "Tất cả Shared Folders".
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {treeItems.map((item) => {
              const isSelected = selectedPath === item.path;
              const isExpanded = expandedPaths.has(item.path);
              const paddingLeft = Math.max(item.depth * 14, 6);

              return (
                <div
                  key={item.path}
                  onClick={() => onSelectPath(item.path)}
                  style={{ paddingLeft: `${paddingLeft}px` }}
                  className={`flex items-center gap-1.5 py-2 pr-2.5 rounded-xl cursor-pointer transition-all border-l-2 ${
                    isSelected
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500 font-bold shadow-xs"
                      : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {/* Expand/Collapse Chevron */}
                  {item.hasChildren ? (
                    <button
                      onClick={(e) => toggleExpand(item.path, e)}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}

                  {/* Node Icon */}
                  {item.depth === 0 || item.depth === 1 ? (
                    <HardDrive className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Folder className={`w-4 h-4 shrink-0 ${item.node.directPermCount > 0 ? "text-sky-500" : "text-slate-400"}`} />
                  )}

                  {/* Folder Name */}
                  <span className="truncate flex-1 font-sans text-xs" title={item.path}>
                    {item.node.name}
                  </span>

                  {/* Badges: Deny Alert & Direct Count */}
                  <div className="flex items-center gap-1 shrink-0 font-sans">
                    {item.node.hasDeny && (
                      <span title="Có quy tắc Deny (Bị chặn)">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      </span>
                    )}
                    {item.node.directPermCount > 0 && (
                      <span
                        className="px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-500/25"
                        title={`${item.node.directPermCount} quyền gán trực tiếp (Direct ACL)`}
                      >
                        {item.node.directPermCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
