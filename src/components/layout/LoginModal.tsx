"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DSMConnectionConfig } from "@/lib/dsm/types";
import { persistSession, loadPersistedCredentials, getNasProfiles, saveNasProfile, setActiveProfileId, NasProfile } from "@/lib/sessionStorage";
import {
  X,
  Server,
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Zap,
  Clock,
  BookmarkCheck,
  Shield,
  Layers,
} from "lucide-react";

import ResponsiveModal from "@/components/common/ResponsiveModal";

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, openLoginModal, setSession, t } = useAppStore();

  const [savedProfiles, setSavedProfiles] = useState<NasProfile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("5001");
  const [https, setHttps] = useState(true);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [ignoreCert, setIgnoreCert] = useState(true);
  const [remember, setRemember] = useState(true);
  const [stay7Days, setStay7Days] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prefill from saved credentials or active profile when modal opens
  useEffect(() => {
    if (!isLoginModalOpen) return;
    const profs = getNasProfiles();
    setSavedProfiles(profs);

    const activeProf = profs.find((p) => p.isCurrent) || profs[0];
    if (activeProf) {
      setProfileName(activeProf.name || "");
      setHost(activeProf.host || "");
      setPort(String(activeProf.port || (activeProf.https ? 5001 : 5000)));
      setHttps(activeProf.https ?? true);
      setAccount(activeProf.account || "");
      if (activeProf.password) {
        try {
          setPassword(atob(activeProf.password));
        } catch {
          setPassword(activeProf.password);
        }
      }
      setIgnoreCert(activeProf.ignoreCert ?? true);
      setRemember(activeProf.remember ?? true);
      setStay7Days(activeProf.stay7Days ?? true);
    } else {
      const creds = loadPersistedCredentials();
      if (creds) {
        if (creds.host) setHost(creds.host);
        if (creds.port) setPort(String(creds.port));
        if (typeof creds.https === "boolean") setHttps(creds.https);
        if (creds.account) setAccount(creds.account);
        if (creds.password) setPassword(creds.password);
        if (typeof creds.ignoreCert === "boolean") setIgnoreCert(creds.ignoreCert);
        setRemember(creds.remember ?? true);
        setStay7Days(creds.stay7Days ?? true);
      }
    }
  }, [isLoginModalOpen]);

  const selectProfile = (prof: NasProfile) => {
    setProfileName(prof.name);
    setHost(prof.host);
    setPort(String(prof.port));
    setHttps(prof.https);
    setAccount(prof.account);
    if (prof.password) {
      try {
        setPassword(atob(prof.password));
      } catch {
        setPassword(prof.password);
      }
    } else {
      setPassword("");
    }
    setIgnoreCert(prof.ignoreCert ?? true);
    setRemember(prof.remember ?? true);
    setStay7Days(prof.stay7Days ?? true);
  };

  if (!isLoginModalOpen) return null;

  const handleProtocolSelect = (isHttps: boolean) => {
    setHttps(isHttps);
    if (isHttps && port === "5000") setPort("5001");
    if (!isHttps && port === "5001") setPort("5000");
  };

  const handlePortSelect = (selectedPort: string, isHttps: boolean) => {
    setPort(selectedPort);
    setHttps(isHttps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    let cleanHost = host.trim();
    let cleanPort = parseInt(port, 10) || (https ? 5001 : 5000);

    // Auto-parse full URLs pasted by user
    if (cleanHost.startsWith("http://") || cleanHost.startsWith("https://")) {
      try {
        const u = new URL(cleanHost);
        cleanHost = u.hostname;
        if (u.port) {
          cleanPort = parseInt(u.port, 10);
        } else {
          cleanPort = u.protocol === "https:" ? 443 : 80;
        }
        setHttps(u.protocol === "https:");
        setPort(String(cleanPort));
      } catch (_) {}
    } else if (cleanHost.includes(":")) {
      const lastColon = cleanHost.lastIndexOf(":");
      const possiblePort = cleanHost.slice(lastColon + 1);
      if (/^\d+$/.test(possiblePort)) {
        cleanPort = parseInt(possiblePort, 10);
        cleanHost = cleanHost.slice(0, lastColon);
        setPort(String(cleanPort));
      }
    }

    const config: DSMConnectionConfig = {
      host: cleanHost,
      port: cleanPort,
      https,
      account: account.trim(),
      password,
      otp: otp.trim(),
      ignoreCert,
    };

    try {
      const session = await dsmClient.login(config);
      // Persist per user choice
      persistSession(session, config, { stay7Days, remember });

      // Save custom name if specified
      if (profileName.trim()) {
        const profileId = `nas_${config.host.replace(/\./g, "_")}_${config.port}_${config.account}`;
        saveNasProfile({
          id: profileId,
          name: profileName.trim(),
          host: config.host,
          port: config.port,
          https: config.https,
          account: config.account,
          password: remember && config.password ? btoa(config.password) : undefined,
          ignoreCert: config.ignoreCert,
          stay7Days,
          remember,
          model: session.model || "DS920+",
          versionString: session.versionString || "DSM 7.2.1",
          lastConnectedAt: Date.now(),
          session: stay7Days ? { ...session } : undefined,
        });
      }

      setSession(session);
      openLoginModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || t.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  // QuickConnect ID detector
  const isQuickConnectInput =
    host.trim().toLowerCase().endsWith(".quickconnect.to") ||
    (host.trim() && !host.includes(".") && !host.includes(":") && !host.startsWith("http") && host.toLowerCase() !== "localhost");

  return (
    <ResponsiveModal open={isLoginModalOpen} onClose={() => openLoginModal(false)} maxWidth="md" noPadding>
      <div className="flex flex-col w-full">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-sky-500/20 shrink-0 ring-1 ring-sky-500/10">
              <img src="/logo.svg" alt="S logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {t.auth.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {savedProfiles.length > 0 ? "Chọn thiết bị đã lưu hoặc thêm NAS mới" : t.auth.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLoginModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form — Simplified */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Saved devices - compact */}
          {savedProfiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {savedProfiles.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => selectProfile(prof)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    host === prof.host && account === prof.account
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${host === prof.host ? "bg-sky-400" : "bg-slate-400"}`} />
                  {prof.name || prof.host}
                </button>
              ))}
            </div>
          )}

          {/* Primary credentials */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t.auth.host}
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.10 • my-nas.synology.me • QuickConnect ID"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent transition-all"
              />
              {isQuickConnectInput && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                  <Zap className="w-3 h-3" /> Tự động kết nối qua QuickConnect relay
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {t.auth.account}
                </label>
                <input
                  type="text"
                  required
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t.auth.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced - collapsible */}
          <details className="group">
            <summary className="flex items-center justify-between py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer list-none">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Tùy chọn nâng cao
              </span>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full group-open:hidden">
                {https ? "HTTPS:" + port : "HTTP:" + port}{otp ? " • OTP" : ""} {ignoreCert ? "• SSL bỏ qua" : ""}
              </span>
              <span className="hidden group-open:inline text-slate-400">Thu gọn</span>
            </summary>
            <div className="mt-3 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Giao thức</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                  <button type="button" onClick={() => handleProtocolSelect(true)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${https ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}>HTTPS</button>
                  <button type="button" onClick={() => handleProtocolSelect(false)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${!https ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}>HTTP</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Cổng</label>
                  <input type="number" required value={port} onChange={(e) => setPort(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Tên hiển thị</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="VD: DS920+ Nhà" className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white" />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {[
                  { p: "5001", https: true, label: "5001" },
                  { p: "5000", https: false, label: "5000" },
                  { p: "443", https: true, label: "443" },
                  { p: "80", https: false, label: "80" },
                ].map((preset) => (
                  <button key={preset.p} type="button" onClick={() => handlePortSelect(preset.p, preset.https)} className={`px-2.5 py-1 rounded-full text-xs font-mono border ${port === preset.p && https === preset.https ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>{preset.label}</button>
                ))}
                {https && (
                  <label className="ml-auto flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={ignoreCert} onChange={(e) => setIgnoreCert(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                    <span className="text-slate-600 dark:text-slate-300">Bỏ qua SSL</span>
                  </label>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><KeyRound className="w-3 h-3" /> {t.auth.otp} <span className="font-normal opacity-60">(nếu bật 2FA)</span></label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-center text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white" />
              </div>

              <div className="flex gap-3 pt-1">
                <label className="flex-1 flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Ghi nhớ</span>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                </label>
                <label className="flex-1 flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Duy trì 7 ngày</span>
                  <input type="checkbox" checked={stay7Days} onChange={(e) => setStay7Days(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                </label>
              </div>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.auth.loggingIn}</span>
                </div>
              ) : (
                <span>{t.auth.loginButton}</span>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-400">Kết nối trực tiếp tới DSM qua LAN, DDNS hoặc QuickConnect. Dữ liệu không qua trung gian.</p>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
