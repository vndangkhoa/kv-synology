"use client";

import React, { useState, useMemo } from "react";
import {
  AclRuleItem,
  FolderTreeNode,
  AclAccountInfo,
  AclLevel,
  AclOrigin,
} from "@/lib/permissions/types";
import { calculateEffectivePermission } from "@/lib/permissions/aclEngine";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  User,
  Users,
  Sparkles,
  FolderOpen,
  XCircle,
  Crown,
  FileCheck,
  FileLock,
  Ban,
  MousePointerClick,
  Filter,
} from "lucide-react";

interface EffectivePermTesterProps {
  selectedPath: string | null;
  folders: Map<string, FolderTreeNode>;
  permissionsByFolder: Map<string, AclRuleItem[]>;
  accountsList: AclAccountInfo[];
  onSelectUser?: (username: string) => void;
  onInspectFolder?: (path: string) => void;
}

export const EffectivePermTester: React.FC<EffectivePermTesterProps> = ({
  selectedPath,
  folders,
  permissionsByFolder,
  accountsList,
  onSelectUser,
  onInspectFolder,
}) => {
  const { t, language } = useAppStore();
  const [activeTab, setActiveTab] = useState<"ALL_RULES" | "EFFECTIVE_TEST">("ALL_RULES");
  const [testAccount, setTestAccount] = useState<string>("");
  const [ruleLevelFilter, setRuleLevelFilter] = useState<string>("all");
  const [ruleOriginFilter, setRuleOriginFilter] = useState<string>("all");

  const currentNode = useMemo(() => {
    return selectedPath ? folders.get(selectedPath) : null;
  }, [selectedPath, folders]);

  const allRulesForFolder = useMemo(() => {
    return selectedPath ? permissionsByFolder.get(selectedPath) || [] : [];
  }, [selectedPath, permissionsByFolder]);

  const directRules = useMemo(() => {
    return allRulesForFolder.filter((r) => !r.isInherited);
  }, [allRulesForFolder]);

  const inheritedRules = useMemo(() => {
    return allRulesForFolder.filter((r) => r.isInherited);
  }, [allRulesForFolder]);

  // Statistics calculation for the current folder
  const folderStats = useMemo(() => {
    const total = allRulesForFolder.length;
    const full = allRulesForFolder.filter((r) => r.level === "FULL_CONTROL").length;
    const rw = allRulesForFolder.filter((r) => r.level === "READ_WRITE").length;
    const ro = allRulesForFolder.filter((r) => r.level === "READ").length;
    const deny = allRulesForFolder.filter((r) => r.accessControl === "Deny" || r.level === "DENY").length;
    const direct = directRules.length;
    const inherited = inheritedRules.length;
    return { total, full, rw, ro, deny, direct, inherited };
  }, [allRulesForFolder, directRules, inheritedRules]);

  // Filtered rules list based on card filter clicks
  const filteredRules = useMemo(() => {
    return allRulesForFolder.filter((r) => {
      if (ruleLevelFilter !== "all") {
        if (ruleLevelFilter === "DENY" && !(r.accessControl === "Deny" || r.level === "DENY")) {
          return false;
        }
        if (ruleLevelFilter !== "DENY" && r.level !== ruleLevelFilter) {
          return false;
        }
      }

      if (ruleOriginFilter !== "all") {
        if (ruleOriginFilter === "DIRECT" && r.isInherited) return false;
        if (ruleOriginFilter === "INHERITED" && !r.isInherited) return false;
      }

      return true;
    });
  }, [allRulesForFolder, ruleLevelFilter, ruleOriginFilter]);

  const handleCardFilterClick = (level: string) => {
    if (ruleLevelFilter === level) {
      setRuleLevelFilter("all");
    } else {
      setRuleLevelFilter(level);
      setRuleOriginFilter("all");
    }
  };

  const handleOriginToggle = () => {
    if (ruleOriginFilter === "all") {
      setRuleOriginFilter("DIRECT");
    } else if (ruleOriginFilter === "DIRECT") {
      setRuleOriginFilter("INHERITED");
    } else {
      setRuleOriginFilter("all");
    }
    setRuleLevelFilter("all");
  };

  // Derive groups for test account if available
  const testAccountGroups = useMemo(() => {
    if (!testAccount) return [];
    const acc = accountsList.find((a) => a.name === testAccount);
    return acc ? [] : [];
  }, [testAccount, accountsList]);

  // Effective permission calculation result
  const effectiveResult = useMemo(() => {
    if (!testAccount || !selectedPath) return null;
    return calculateEffectivePermission(testAccount, testAccountGroups, directRules, inheritedRules);
  }, [testAccount, selectedPath, directRules, inheritedRules, testAccountGroups]);

  const renderLevelBadge = (level: AclLevel, accessControl = "Allow") => {
    if (accessControl === "Deny" || level === "DENY") {
      return (
        <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs">
          <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{t.permissions.levelDeny}</span>
        </span>
      );
    }
    switch (level) {
      case "FULL_CONTROL":
        return (
          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs">
            <Crown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{t.permissions.levelFull}</span>
          </span>
        );
      case "READ_WRITE":
        return (
          <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs">
            <FileCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{t.permissions.levelRw}</span>
          </span>
        );
      case "READ":
        return (
          <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs">
            <FileLock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{t.permissions.levelRo}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 font-medium px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 text-xs">
            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{t.permissions.levelNone}</span>
          </span>
        );
    }
  };

  const renderOriginTag = (origin: AclOrigin) => {
    switch (origin) {
      case "DIRECT":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
            {t.permissions.directTag}
          </span>
        );
      case "GROUP":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
            {t.permissions.inheritedGroupTag}
          </span>
        );
      case "INHERITED":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {t.permissions.inheritedFolderTag}
          </span>
        );
    }
  };

  if (!selectedPath || !currentNode) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3 h-full flex flex-col items-center justify-center transition-colors">
        <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 animate-pulse" />
        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
          {language === "vi"
            ? "Chọn một thư mục ở cây bên trái để xem bảng phân quyền chi tiết"
            : "Select a folder from the tree on the left to inspect its permissions"}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm">
          {language === "vi"
            ? "Duyệt cây thư mục, tìm theo đường dẫn hoặc thử nghiệm quyền hiệu lực cho từng User/Group."
            : "Browse the directory tree, search paths, or simulate effective permissions for any user/group."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full transition-colors">
      {/* Folder Header Information Card */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                {currentNode.sharedFolder} • {language === "vi" ? `Cấp độ ${currentNode.depth}` : `Depth Level ${currentNode.depth}`}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono break-all mt-0.5">
              {currentNode.path}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 shadow-xs">
              {allRulesForFolder.length} {language === "vi" ? "Quy tắc ACL" : "ACL Rules"}
            </span>
          </div>
        </div>

        {/* Sub-tab Switcher (All Rules vs Effective Perm Tester) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab("ALL_RULES")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL_RULES"
                ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {language === "vi" ? `Tất cả quy tắc (${allRulesForFolder.length})` : `All Rules (${allRulesForFolder.length})`}
          </button>

          <button
            onClick={() => setActiveTab("EFFECTIVE_TEST")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "EFFECTIVE_TEST"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>{language === "vi" ? "Thử Nghiệm Quyền Hiệu Lực (Effective Perm)" : "Test Effective Permissions"}</span>
          </button>
        </div>

        {/* Folder Summary Metric Cards (Interactive Clickable Filters) */}
        {activeTab === "ALL_RULES" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
            {/* Total */}
            <button
              type="button"
              onClick={() => {
                setRuleLevelFilter("all");
                setRuleOriginFilter("all");
              }}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                ruleLevelFilter === "all" && ruleOriginFilter === "all"
                  ? "bg-slate-100 dark:bg-slate-800 border-sky-500 ring-2 ring-sky-500 shadow-xs"
                  : "bg-white dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block truncate">
                  {language === "vi" ? "Tất cả" : "Total"}
                </span>
                <MousePointerClick className="w-2.5 h-2.5 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-slate-800 dark:text-white">
                  {folderStats.total}
                </span>
                <span className="text-[10px] text-slate-400">rules</span>
              </div>
            </button>

            {/* Full Control */}
            <button
              type="button"
              onClick={() => handleCardFilterClick("FULL_CONTROL")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                ruleLevelFilter === "FULL_CONTROL"
                  ? "bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500 shadow-xs"
                  : "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                  {t.permissions.levelFull}
                </span>
                <MousePointerClick className="w-2.5 h-2.5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {folderStats.full}
                </span>
              </div>
            </button>

            {/* Read & Write */}
            <button
              type="button"
              onClick={() => handleCardFilterClick("READ_WRITE")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                ruleLevelFilter === "READ_WRITE"
                  ? "bg-sky-500/15 dark:bg-sky-500/20 border-sky-500 ring-2 ring-sky-500 shadow-xs"
                  : "bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold block truncate">
                  {t.permissions.levelRw}
                </span>
                <MousePointerClick className="w-2.5 h-2.5 text-sky-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-sky-600 dark:text-sky-400">
                  {folderStats.rw}
                </span>
              </div>
            </button>

            {/* Read */}
            <button
              type="button"
              onClick={() => handleCardFilterClick("READ")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                ruleLevelFilter === "READ"
                  ? "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 ring-2 ring-amber-500 shadow-xs"
                  : "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block truncate">
                  {t.permissions.levelRo}
                </span>
                <MousePointerClick className="w-2.5 h-2.5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  {folderStats.ro}
                </span>
              </div>
            </button>

            {/* Denied */}
            <button
              type="button"
              onClick={() => handleCardFilterClick("DENY")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                ruleLevelFilter === "DENY"
                  ? "bg-rose-500/15 dark:bg-rose-500/20 border-rose-500 ring-2 ring-rose-500 shadow-xs"
                  : "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block truncate">
                  {t.permissions.levelDeny}
                </span>
                <MousePointerClick className="w-2.5 h-2.5 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black text-rose-600 dark:text-rose-400">
                  {folderStats.deny}
                </span>
              </div>
            </button>

            {/* Direct / Inherited */}
            <button
              type="button"
              onClick={handleOriginToggle}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                ruleOriginFilter !== "all"
                  ? "bg-indigo-500/15 dark:bg-indigo-500/20 border-indigo-500 ring-2 ring-indigo-500 shadow-xs"
                  : "bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block truncate">
                  {ruleOriginFilter === "DIRECT"
                    ? "Chỉ Trực tiếp"
                    : ruleOriginFilter === "INHERITED"
                    ? "Chỉ Kế thừa"
                    : "Direct / Inherited"}
                </span>
                <MousePointerClick className="w-2.5 h-2.5 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {folderStats.direct} <span className="font-normal text-slate-400">/</span> {folderStats.inherited}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: All ACL Rules List */}
      {activeTab === "ALL_RULES" && (
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[580px] space-y-3">
          {filteredRules.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {language === "vi"
                ? "Không có quy tắc ACL nào phù hợp với bộ lọc."
                : "No ACL rules match the selected filter."}
            </div>
          ) : (
            filteredRules.map((rule) => {
              const isGroup = rule.accountType === "group";
              const origin: AclOrigin = rule.isInherited ? "INHERITED" : "DIRECT";

              return (
                <div
                  key={rule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-500/50 transition-colors gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
                        isGroup
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {isGroup ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isGroup) {
                              onSelectUser?.(rule.account);
                            }
                          }}
                          className={`font-bold text-slate-900 dark:text-white font-mono text-xs text-left ${
                            !isGroup ? "hover:text-sky-500 hover:underline cursor-pointer" : "cursor-default"
                          }`}
                          title={!isGroup ? "Bấm để xem chi tiết phân quyền của User này" : undefined}
                        >
                          {rule.account}
                        </button>
                        {renderOriginTag(origin)}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {rule.accountDesc || (isGroup ? (language === "vi" ? "Nhóm người dùng" : "User Group") : (language === "vi" ? "Tài khoản cá nhân" : "Individual User"))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {renderLevelBadge(rule.level, rule.accessControl)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Effective Permission Tester */}
      {activeTab === "EFFECTIVE_TEST" && (
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[580px] space-y-5">
          {/* Account Selector Dropdown */}
          <div className="space-y-2 max-w-lg">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === "vi" ? "Chọn User hoặc Group để kiểm tra quyền thực tế:" : "Select a User or Group to evaluate effective rights:"}
            </label>
            <select
              value={testAccount}
              onChange={(e) => setTestAccount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
            >
              <option value="">{language === "vi" ? "-- Chọn User / Nhóm cần test --" : "-- Select User / Group --"}</option>
              {accountsList.map((acc) => (
                <option key={acc.name} value={acc.name}>
                  [{acc.type.toUpperCase()}] {acc.name} {acc.desc ? `— ${acc.desc}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Test Results */}
          {testAccount && effectiveResult && (
            <div className="space-y-4 p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-purple-500/30">
              {/* Summary Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {language === "vi" ? "Quyền hiệu lực cuối cùng:" : "Evaluated Effective Permission:"}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                    {testAccount}
                  </h3>
                </div>
                <div>
                  {renderLevelBadge(
                    effectiveResult.effectiveLevel,
                    effectiveResult.isDenied ? "Deny" : "Allow"
                  )}
                </div>
              </div>

              {/* Contributing Rules Breakdown */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {language === "vi"
                    ? `Các quy tắc đóng góp (${effectiveResult.contributingRules.length}):`
                    : `Contributing Rules (${effectiveResult.contributingRules.length}):`}
                </span>

                {effectiveResult.contributingRules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {language === "vi"
                      ? "Tài khoản này không có quyền trực tiếp hay kế thừa tại đây (No Access)."
                      : "This account has neither direct nor inherited privileges on this folder (No Access)."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {effectiveResult.contributingRules.map((cRule, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs gap-2 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          {renderOriginTag(cRule.origin)}
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {cRule.sourceDesc}
                          </span>
                        </div>
                        <div className="shrink-0 self-end sm:self-auto">
                          {renderLevelBadge(cRule.rule.level, cRule.rule.accessControl)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
