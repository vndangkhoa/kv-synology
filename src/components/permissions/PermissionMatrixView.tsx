"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { PermissionMatrixData, SecurityAuditItem, PermissionLevel } from "@/lib/dsm/types";
import { PermissionLevelBadge, InheritanceTagBadge } from "./PermissionBadge";
import {
  Table,
  ShieldCheck,
  ShieldAlert,
  Download,
  FileSpreadsheet,
  FileCode,
  Crown,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface PermissionMatrixViewProps {
  onSelectUser?: (username: string) => void;
  onInspectFolder?: (path: string) => void;
}

export const PermissionMatrixView: React.FC<PermissionMatrixViewProps> = ({
  onSelectUser,
  onInspectFolder,
}) => {
  const { t } = useAppStore();
  const [matrixData, setMatrixData] = useState<PermissionMatrixData | null>(null);
  const [auditReport, setAuditReport] = useState<SecurityAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    user: string;
    folder: string;
    level: PermissionLevel;
    inheritance: any;
    inheritedFrom?: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [m, a] = await Promise.all([
          dsmClient.getPermissionMatrixData(),
          dsmClient.getSecurityAuditReport(),
        ]);
        setMatrixData(m);
        setAuditReport(a);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportCsv = () => {
    if (!matrixData) return;
    const header = ["User", ...matrixData.folders.map((f) => f.path)].join(",");
    const rows = matrixData.users.map((u) => {
      const userCells = matrixData.folders.map((f) => {
        const cell = matrixData.matrix[u.name]?.[f.path];
        return cell ? `${cell.level} (${cell.inheritance})` : "no_access";
      });
      return [u.name, ...userCells].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `synology_permission_matrix_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    if (!matrixData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ matrixData, auditReport }, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `synology_permission_audit_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Security Audit Findings Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t.permissions.auditTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {t.permissions.auditDesc}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {auditReport.length} findings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {auditReport.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.severity === "critical"
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50"
                  : item.severity === "warning"
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50"
                  : "bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {item.severity === "critical" ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white uppercase">
                    Critical
                  </span>
                ) : item.severity === "warning" ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white uppercase">
                    Warning
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500 text-white uppercase">
                    Info
                  </span>
                )}
                <span className="font-bold text-xs text-slate-800 dark:text-white truncate">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                {item.description}
              </p>
              <div className="pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                <strong className="font-semibold text-slate-700 dark:text-slate-300">Recommendation:</strong> {item.recommendation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Matrix Grid Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header & Export Actions */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-sky-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t.permissions.matrixOverviewTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {t.permissions.matrixOverviewDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t.permissions.exportMatrix}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-500" />
              <span>{t.permissions.exportJson}</span>
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        {loading || !matrixData ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {t.common.loading}
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5 font-bold text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-800/90 z-10 min-w-[160px]">
                    {t.common.name} (User)
                  </th>
                  {matrixData.folders.map((folder) => (
                    <th
                      key={folder.path}
                      className="p-3.5 font-bold text-slate-700 dark:text-slate-200 text-center min-w-[130px] border-l border-slate-200/60 dark:border-slate-800 cursor-pointer hover:text-sky-500"
                      onClick={() => onInspectFolder?.(folder.path)}
                      title={`${t.permissions.inspectFolder} ${folder.path}`}
                    >
                      <div className="font-mono text-xs">{folder.path}</div>
                      <div className="text-[10px] font-normal text-slate-400 font-sans">
                        {folder.volume}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {matrixData.users.map((user) => (
                  <tr
                    key={user.name}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td
                      className="p-3.5 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 cursor-pointer hover:text-sky-500 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]"
                      onClick={() => onSelectUser?.(user.name)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{user.name}</span>
                        {user.isAdmin && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                      </div>
                    </td>

                    {matrixData.folders.map((folder) => {
                      const cell = matrixData.matrix[user.name]?.[folder.path] || {
                        level: "no_access",
                        inheritance: "direct",
                      };

                      const isSelected =
                        selectedCell?.user === user.name && selectedCell?.folder === folder.path;

                      return (
                        <td
                          key={folder.path}
                          onClick={() =>
                            setSelectedCell({
                              user: user.name,
                              folder: folder.path,
                              level: cell.level,
                              inheritance: cell.inheritance,
                              inheritedFrom: cell.inheritedFrom,
                            })
                          }
                          className={`p-2 text-center border-l border-slate-200/60 dark:border-slate-800 cursor-pointer transition-all ${
                            isSelected ? "ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/40" : ""
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <PermissionLevelBadge level={cell.level} size="sm" showIcon={false} />
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">
                              {cell.isOwner
                                ? "Owner"
                                : cell.inheritance === "direct"
                                ? "Direct"
                                : cell.inheritance === "inherited_folder"
                                ? "Inherited"
                                : cell.inheritance === "inherited_group"
                                ? `@${cell.inheritedFrom || "group"}`
                                : "N/A"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Cell Modal / Drawer Detail */}
      {selectedCell && (
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                {t.common.details}:
              </span>
              <span className="font-bold text-sm">
                User: <strong>{selectedCell.user}</strong> ➔ Folder: <strong>{selectedCell.folder}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>{t.permissions.filterLevel}:</span>
              <PermissionLevelBadge level={selectedCell.level} size="sm" />
              <span>{t.permissions.filterOrigin}:</span>
              <InheritanceTagBadge
                inheritance={selectedCell.inheritance}
                inheritedFrom={selectedCell.inheritedFrom}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => onSelectUser?.(selectedCell.user)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
            >
              {t.permissions.inspectUser}
            </button>
            <button
              onClick={() => onInspectFolder?.(selectedCell.folder)}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-semibold text-white"
            >
              {t.permissions.inspectFolder}
            </button>
            <button
              onClick={() => setSelectedCell(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
