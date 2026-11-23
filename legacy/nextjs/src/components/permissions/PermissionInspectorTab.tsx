"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { UserPermissionsView } from "./UserPermissionsView";
import { FolderPermissionsView } from "./FolderPermissionsView";
import { PermissionMatrixView } from "./PermissionMatrixView";
import { AclTreeView } from "./AclTreeView";
import { EffectivePermTester } from "./EffectivePermTester";
import { AclImportModal } from "./AclImportModal";
import { buildDatasetFromLiveNas } from "@/lib/permissions/aclEngine";
import { AclDataset } from "@/lib/permissions/types";
import { dsmClient } from "@/lib/dsm/client";
import {
  ShieldCheck,
  User as UserIcon,
  FolderOpen,
  Table,
  RefreshCw,
  FolderTree,
  UploadCloud,
  FileSpreadsheet,
  Server,
  Loader2,
} from "lucide-react";

export const PermissionInspectorTab: React.FC = () => {
  const { t, language, session, permissionInspectPath, setPermissionInspectPath } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<"tree" | "byUser" | "byFolder" | "matrix">("tree");
  const [currentInspectFolder, setCurrentInspectFolder] = useState<string>("/volume1/homes");
  const [selectedUserToInspect, setSelectedUserToInspect] = useState<string>("khoavo");
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(true);

  // Default stage: Real live data from the connected NAS machine
  const [aclDataset, setAclDataset] = useState<AclDataset>({
    folders: new Map(),
    rootSharedFolders: [],
    permissionsByFolder: new Map(),
    permissionsByAccount: new Map(),
    accountsList: [],
    auditIssues: [],
    totalRows: 0,
    fileName: session.hostname || "Live NAS Machine",
  });

  // Fetch real data from machine on mount & refresh with parallel loading
  const loadLiveMachineData = useCallback(async (forceRefresh = false) => {
    setIsLoadingLive(true);
    try {
      const liveData = await buildDatasetFromLiveNas(dsmClient, forceRefresh);
      setAclDataset(liveData);
      setIsLiveMode(true);
      const first = liveData.folders.keys().next().value;
      if (first) {
        setCurrentInspectFolder(first);
      }
    } catch (err) {
      console.error("Error loading live NAS ACL data:", err);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    loadLiveMachineData();
  }, [loadLiveMachineData, refreshKey]);

  // If navigated with a target folder from File Station
  useEffect(() => {
    if (permissionInspectPath) {
      setCurrentInspectFolder(permissionInspectPath);
      setActiveSubTab("tree");
      setPermissionInspectPath(undefined);
    }
  }, [permissionInspectPath, setPermissionInspectPath]);

  const handleInspectFolder = (path: string) => {
    setCurrentInspectFolder(path);
    setActiveSubTab("tree");
  };

  const handleSelectUser = (username: string) => {
    setSelectedUserToInspect(username);
    setActiveSubTab("byUser");
  };

  // Called when user explicitly loads Demo data or uploads a CSV
  const handleDataLoaded = (newDataset: AclDataset) => {
    setAclDataset(newDataset);
    setIsLiveMode(false);
    const firstFolder = newDataset.folders.keys().next().value;
    if (firstFolder) {
      setCurrentInspectFolder(firstFolder);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t.permissions.title}
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Visualizer Pro
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                isLiveMode
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}>
                {isLiveMode ? (
                  <Server className="w-3 h-3 text-emerald-500" />
                ) : (
                  <FileSpreadsheet className="w-3 h-3 text-amber-500" />
                )}
                <span className="truncate max-w-[200px] font-mono">
                  {isLiveMode
                    ? (language === "vi" ? `NAS Thực Tế: ${session.hostname || "DS920+"}` : `Live NAS: ${session.hostname || "DS920+"}`)
                    : (language === "vi" ? `Dữ liệu Demo: ${aclDataset.fileName}` : `Demo Data: ${aclDataset.fileName}`)}
                </span>
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {t.permissions.subtitle}
            </p>
          </div>
        </div>

        {/* Top Actions: Live toggle, Import CSV & Refresh */}
        <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
          {!isLiveMode && (
            <button
              type="button"
              onClick={() => loadLiveMachineData(true)}
              className="flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Server className="w-4 h-4 text-emerald-500" />
              <span>{language === "vi" ? "Quay về NAS Thực tế" : "Switch to Live NAS"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t.permissions.importAcl}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshKey((k) => k + 1);
              loadLiveMachineData(true);
            }}
            disabled={isLoadingLive}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${isLoadingLive ? "animate-spin" : ""}`} />
            <span>{t.common.refresh}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl max-w-fit border border-slate-200/60 dark:border-slate-700/50 flex-wrap">
        <button
          onClick={() => setActiveSubTab("tree")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "tree"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm shadow-black/5"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>{t.permissions.treeView}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("byUser")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "byUser"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm shadow-black/5"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>{t.permissions.byUser}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("byFolder")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "byFolder"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm shadow-black/5"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>{t.permissions.byFolder}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "matrix"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm shadow-black/5"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Table className="w-4 h-4" />
          <span>{t.permissions.matrix}</span>
        </button>
      </div>

      {/* Main SubTab Content */}
      <div key={refreshKey}>
        {/* Tab 1: Tree View & Effective Perm Tester */}
        {activeSubTab === "tree" && (
          <div>
            {isLoadingLive && aclDataset.folders.size === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-16 text-center space-y-3">
                <Loader2 className="w-10 h-10 mx-auto text-sky-500 animate-spin" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {language === "vi"
                    ? "Đang truy vấn cây thư mục và phân quyền trực tiếp từ thiết bị NAS..."
                    : "Fetching directory tree and ACL permissions directly from NAS..."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 h-[620px]">
                  <AclTreeView
                    folders={aclDataset.folders}
                    rootSharedFolders={aclDataset.rootSharedFolders}
                    selectedPath={currentInspectFolder}
                    onSelectPath={(p) => setCurrentInspectFolder(p)}
                  />
                </div>
                <div className="lg:col-span-7 h-[620px]">
                  <EffectivePermTester
                    selectedPath={currentInspectFolder}
                    folders={aclDataset.folders}
                    permissionsByFolder={aclDataset.permissionsByFolder}
                    accountsList={aclDataset.accountsList}
                    onSelectUser={handleSelectUser}
                    onInspectFolder={handleInspectFolder}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: By User View */}
        {activeSubTab === "byUser" && (
          <UserPermissionsView
            initialUser={selectedUserToInspect}
            onInspectFolder={handleInspectFolder}
          />
        )}

        {/* Tab 3: By Folder View */}
        {activeSubTab === "byFolder" && (
          <FolderPermissionsView
            initialPath={currentInspectFolder}
            onSelectUser={handleSelectUser}
          />
        )}

        {/* Tab 4: 2D Matrix & Security Audit */}
        {activeSubTab === "matrix" && (
          <PermissionMatrixView
            onSelectUser={handleSelectUser}
            onInspectFolder={handleInspectFolder}
          />
        )}
      </div>

      {/* Import Modal */}
      <AclImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />
    </div>
  );
};
