"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import {
  getNasProfiles,
  saveNasProfile,
  removeNasProfile,
  getActiveProfileId,
  setActiveProfileId,
  NasProfile,
  persistSession,
} from "@/lib/sessionStorage";
import {
  Server,
  Plus,
  Trash2,
  Check,
  LogOut,
  LogIn,
  RotateCw,
  Layers,
  ShieldCheck,
  HardDrive,
  Globe,
  Radio,
  X,
} from "lucide-react";

export const NasTabBar: React.FC = () => {
  const { session, setSession, openLoginModal, fetchNotifications, t } = useAppStore();
  const [profiles, setProfiles] = useState<NasProfile[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const refreshProfiles = () => {
    setProfiles(getNasProfiles());
  };

  useEffect(() => {
    refreshProfiles();
  }, [session.isConnected]);

  const handleSwitchNas = async (prof: NasProfile) => {
    if (prof.id === getActiveProfileId() && session.isConnected) return;
    setSwitchingId(prof.id);
    try {
      dsmClient.clearCaches();
      useAppStore.setState({
        systemInfo: null,
        utilization: null,
        utilizationHistory: [],
        notifications: [],
      });

      if (prof.password) {
        let clearPassword = prof.password;
        try {
          clearPassword = atob(prof.password);
        } catch {}

        const config = {
          host: prof.host,
          port: prof.port,
          https: prof.https,
          account: prof.account,
          password: clearPassword,
          ignoreCert: prof.ignoreCert ?? true,
        };
        const newSession = await dsmClient.login(config);
        persistSession(newSession, config, {
          stay7Days: prof.stay7Days ?? true,
          remember: prof.remember ?? true,
        });
        setActiveProfileId(prof.id);
        setSession(newSession);
        refreshProfiles();
        await fetchNotifications(true);
      } else {
        setActiveProfileId(prof.id);
        openLoginModal(true);
      }
    } catch (e: any) {
      console.error("Switch failed", e);
      openLoginModal(true);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRemoveProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa thiết bị NAS này khỏi danh sách quản lý?")) return;
    removeNasProfile(id);
    refreshProfiles();
  };

  // Only render if user has at least 1 saved profile or is connected
  if (profiles.length === 0 && !session.isConnected) {
    return null;
  }

  const activeId = getActiveProfileId();

  return (
    <div className="w-full bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-2.5 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto no-scrollbar transition-all relative z-10">
      {/* Left: Multi-NAS Instance Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-x-auto py-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 hidden md:inline-flex items-center gap-1.5 mr-1">
          <Server className="w-3.5 h-3.5 text-sky-500" />
          Thiết bị NAS:
        </span>

        {profiles.map((prof) => {
          const isActive =
            session.isConnected &&
            (prof.id === activeId || prof.isCurrent || (session.hostname && prof.name.includes(session.hostname)));
          const isSwitching = switchingId === prof.id;

          return (
            <div
              key={prof.id}
              onClick={() => !isActive && handleSwitchNas(prof)}
              className={`group px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none border ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border-sky-500/40 shadow-sm ring-1 ring-sky-500/20"
                  : "bg-white/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/70"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-300 dark:bg-slate-600 group-hover:bg-sky-400"
                  }`}
                />
                {isSwitching ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-sky-500" />
                )}
                <span className="truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[180px]">
                  {prof.name || prof.host}
                </span>
              </div>

              {isActive && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                  Đang chọn
                </span>
              )}

              {/* Remove button on hover */}
              {profiles.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveProfile(e, prof.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 transition-opacity"
                  title="Xóa hồ sơ NAS"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add NAS Button */}
        <button
          onClick={() => openLoginModal(true)}
          className="px-2.5 py-1 sm:py-1.5 rounded-xl bg-sky-600/10 hover:bg-sky-600 hover:text-white text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/30 transition-all shrink-0 flex items-center gap-1 shadow-xs"
          title="Thêm và đăng nhập NAS mới"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm NAS</span>
        </button>
      </div>

      {/* Right: Active NAS quick specs */}
      {session.isConnected && (
        <div className="hidden lg:flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <span className="font-bold text-slate-800 dark:text-slate-200">{session.model || "DS920+"}</span>
          <span>•</span>
          <span>{session.account || "admin"}</span>
          <span>•</span>
          <span>{session.versionString || "DSM 7.2.1"}</span>
        </div>
      )}
    </div>
  );
};
