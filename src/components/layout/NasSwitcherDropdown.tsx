"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
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
} from "lucide-react";

export const NasSwitcherDropdown: React.FC = () => {
  const { session, setSession, openLoginModal, t } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<NasProfile[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshProfiles = () => {
    setProfiles(getNasProfiles());
  };

  useEffect(() => {
    refreshProfiles();
  }, [session.isConnected]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSwitchNas = async (prof: NasProfile) => {
    setSwitchingId(prof.id);
    try {
      if (prof.password) {
        const clearPassword = atob(prof.password);
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
        setIsOpen(false);
      } else {
        // Prompt login with prefilled profile
        setActiveProfileId(prof.id);
        setIsOpen(false);
        openLoginModal(true);
      }
    } catch (e: any) {
      console.error("Switch failed", e);
      // Open login modal to re-authenticate
      openLoginModal(true);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRemoveProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa thiết bị NAS này khỏi danh sách đã lưu?")) return;
    removeNasProfile(id);
    refreshProfiles();
  };

  const handleSignOutActive = () => {
    dsmClient.logout();
    setSession({
      sid: "",
      isConnected: false,
      dsmVersion: 7,
      versionString: "",
      model: "",
      hostname: "",
      account: "",
    });
    setIsOpen(false);
  };

  const currentProf = profiles.find((p) => p.isCurrent || (session.isConnected && p.host.includes(session.hostname || "")));
  const displayName = session.isConnected
    ? (session.hostname || currentProf?.name || session.model || "Synology NAS")
    : "Chưa kết nối NAS";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          refreshProfiles();
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
          session.isConnected
            ? "bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-slate-700"
            : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
        }`}
        title="Quản lý và Chuyển đổi thiết bị NAS"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              session.isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`}
          />
          <Server className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate max-w-[110px] sm:max-w-[160px]">{displayName}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl z-50 p-3 sm:p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-500">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Danh sách Thiết bị NAS ({profiles.length})
                </h4>
                <p className="text-[10px] text-slate-400">
                  Chuyển đổi tức thì hoặc thêm NAS mới
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                openLoginModal(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm NAS</span>
            </button>
          </div>

          {/* Profiles List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {profiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <Server className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Chưa lưu NAS nào</p>
                <p className="text-[11px]">Nhấn nút &ldquo;Thêm NAS&rdquo; để đăng nhập và lưu hồ sơ thiết bị.</p>
              </div>
            ) : (
              profiles.map((prof) => {
                const isActive =
                  session.isConnected &&
                  (prof.isCurrent || (session.hostname && prof.name.includes(session.hostname)) || prof.host === dsmClient.getConfig()?.host);
                const isSwitching = switchingId === prof.id;

                return (
                  <div
                    key={prof.id}
                    onClick={() => !isActive && handleSwitchNas(prof)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isActive
                        ? "bg-sky-50/70 dark:bg-sky-950/30 border-sky-500/40 ring-1 ring-sky-500/20"
                        : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isActive
                            ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {isSwitching ? (
                          <RotateCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Server className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {prof.name}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Đang dùng
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {prof.account} • {prof.host}:{prof.port} ({prof.https ? "HTTPS" : "HTTP"})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => handleSwitchNas(prof)}
                          disabled={isSwitching}
                          className="px-2.5 py-1 rounded-xl bg-sky-600/10 hover:bg-sky-600 hover:text-white text-sky-600 dark:text-sky-400 text-[11px] font-bold transition-colors"
                        >
                          Kết nối
                        </button>
                      )}
                      <button
                        onClick={(e) => handleRemoveProfile(e, prof.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Xóa hồ sơ NAS"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls */}
          {session.isConnected && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                Phiên làm việc: {session.model} ({session.versionString})
              </span>
              <button
                onClick={handleSignOutActive}
                className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-[11px] flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
