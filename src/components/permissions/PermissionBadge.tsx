"use client";

import React from "react";
import { PermissionLevel, InheritanceType, AclRights } from "@/lib/dsm/types";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  ShieldCheck,
  Users,
  Crown,
  Ban,
  CheckCircle2,
  XCircle,
  KeyRound,
  FileCheck,
  FileLock,
  ArrowDownRight,
} from "lucide-react";

interface PermissionLevelBadgeProps {
  level: PermissionLevel;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export const PermissionLevelBadge: React.FC<PermissionLevelBadgeProps> = ({
  level,
  showIcon = true,
  size = "md",
}) => {
  const { t } = useAppStore();
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  switch (level) {
    case "full_control":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 ${sizeClasses[size]}`}
          title={t.permissions.levelFull}
        >
          {showIcon && <Crown className="w-3.5 h-3.5 shrink-0 text-emerald-500" />}
          {t.permissions.levelFull}
        </span>
      );
    case "read_write":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 ${sizeClasses[size]}`}
          title={t.permissions.levelRw}
        >
          {showIcon && <FileCheck className="w-3.5 h-3.5 shrink-0 text-sky-500" />}
          {t.permissions.levelRw}
        </span>
      );
    case "read_only":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 ${sizeClasses[size]}`}
          title={t.permissions.levelRo}
        >
          {showIcon && <FileLock className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
          {t.permissions.levelRo}
        </span>
      );
    case "deny":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 ${sizeClasses[size]}`}
          title={t.permissions.levelDeny}
        >
          {showIcon && <Ban className="w-3.5 h-3.5 shrink-0 text-rose-500" />}
          {t.permissions.levelDeny}
        </span>
      );
    case "custom":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 ${sizeClasses[size]}`}
          title={t.permissions.levelCustom}
        >
          {showIcon && <KeyRound className="w-3.5 h-3.5 shrink-0 text-purple-500" />}
          {t.permissions.levelCustom}
        </span>
      );
    case "no_access":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${sizeClasses[size]}`}
          title={t.permissions.levelNone}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
          {t.permissions.levelNone}
        </span>
      );
  }
};

interface InheritanceTagBadgeProps {
  inheritance: InheritanceType;
  inheritedFrom?: string;
  isOwner?: boolean;
  size?: "sm" | "md";
}

export const InheritanceTagBadge: React.FC<InheritanceTagBadgeProps> = ({
  inheritance,
  inheritedFrom,
  isOwner,
  size = "md",
}) => {
  const { t } = useAppStore();
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10.5px]",
    md: "px-2.5 py-1 text-xs",
  };

  if (isOwner || inheritance === "owner") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 ${sizeClasses[size]}`}
        title={t.permissions.ownerTag}
      >
        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>{t.permissions.ownerTag}</span>
      </span>
    );
  }

  switch (inheritance) {
    case "direct":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 ${sizeClasses[size]}`}
          title={t.permissions.directTag}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{t.permissions.directTag}</span>
        </span>
      );

    case "inherited_folder":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 ${sizeClasses[size]}`}
          title={`${t.permissions.inheritedFolderTag}: ${inheritedFrom || ""}`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            {t.permissions.inheritedFolderTag}: <strong className="font-semibold">{inheritedFrom || ""}</strong>
          </span>
        </span>
      );

    case "inherited_group":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 ${sizeClasses[size]}`}
          title={`${t.permissions.inheritedGroupTag}: @${inheritedFrom || "group"}`}
        >
          <Users className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span>
            {t.permissions.inheritedGroupTag}: <strong className="font-semibold">@{inheritedFrom || "group"}</strong>
          </span>
        </span>
      );

    default:
      return null;
  }
};

interface AclRightsDetailProps {
  rights: AclRights;
}

export const AclRightsDetailGrid: React.FC<AclRightsDetailProps> = ({ rights }) => {
  const { t } = useAppStore();
  const items = [
    { key: "read", label: t.permissions.readData, val: rights.read },
    { key: "write", label: t.permissions.writeData, val: rights.write },
    { key: "execute", label: t.permissions.executeFile, val: rights.execute },
    { key: "append", label: t.permissions.appendData, val: rights.append },
    { key: "delete", label: t.permissions.deleteFile, val: rights.delete },
    { key: "deleteChild", label: t.permissions.deleteSubfolder, val: rights.deleteChild },
    { key: "readAttr", label: t.permissions.readAttributes, val: rights.readAttr },
    { key: "writeAttr", label: t.permissions.writeAttributes, val: rights.writeAttr },
    { key: "readPerm", label: t.permissions.readPermissions, val: rights.readPerm },
    { key: "writePerm", label: t.permissions.writePermissions, val: rights.writePerm },
    { key: "takeOwner", label: t.permissions.takeOwnership, val: rights.takeOwner },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
      {items.map((item) => (
        <div
          key={item.key}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
            item.val
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 text-slate-400 dark:text-slate-500"
          }`}
        >
          {item.val ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
