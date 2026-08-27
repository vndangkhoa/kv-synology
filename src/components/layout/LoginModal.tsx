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
        if (u.port) cleanPort = parseInt(u.port, 10);
      } catch (_) {}
    } else if (cleanHost.includes(":") && !cleanHost.includes(".quickconnect.to")) {
      const [h, p] = cleanHost.split(":");
      cleanHost = h;
      if (p) cleanPort = parseInt(p, 10);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Quick Saved NAS Profiles Selector */}
          {savedProfiles.length > 0 && (
            <div className="space-y-1.5 pb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Thiết bị NAS đã lưu ({savedProfiles.length}):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {savedProfiles.map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => selectProfile(prof)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                      host === prof.host && account === prof.account
                        ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400"
                    }`}
                  >
                    <Server className="w-3 h-3" />
                    <span>{prof.name || prof.host}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Profile Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Tên định danh NAS (Tùy chọn)</span>
              <span className="text-[10px] text-slate-400 font-normal">Để nhận diện nhiều NAS</span>
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="VD: DS920+ Cơ quan hoặc DS220+ Gia đình"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Protocol Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => handleProtocolSelect(true)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                https
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HTTPS (Bảo mật)</span>
            </button>
            <button
              type="button"
              onClick={() => handleProtocolSelect(false)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                !https
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>HTTP (Nội bộ)</span>
            </button>
          </div>

          {/* Address & Port Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.auth.host}
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100 hoặc my-nas.synology.me"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.auth.port}
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold text-center"
              />
            </div>
          </div>

          {/* QuickConnect Badge Indicator */}
          {isQuickConnectInput && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center space-x-2 font-medium">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>QuickConnect ID: Tự động phân giải qua relay — cổng sẽ được tự động chọn, không cần nhập 5001.</span>
            </div>
          )}

          {/* Port Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Cổng nhanh:</span>
            {[
              { p: "5001", https: true, label: "5001 (HTTPS)" },
              { p: "5000", https: false, label: "5000 (HTTP)" },
              { p: "8443", https: true, label: "8443" },
              { p: "443", https: true, label: "443" },
              { p: "8080", https: false, label: "8080" },
            ].map((preset) => {
              const isSelected = port === preset.p && https === preset.https;
              return (
                <button
                  key={preset.p}
                  type="button"
                  onClick={() => handlePortSelect(preset.p, preset.https)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-mono transition-all ${
                    isSelected
                      ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* SSL Bypass Option */}
          {https && (
            <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer text-xs transition-colors">
              <input
                type="checkbox"
                checked={ignoreCert}
                onChange={(e) => setIgnoreCert(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Bỏ qua lỗi chứng chỉ SSL (Self-signed / IP nội bộ)
              </span>
            </label>
          )}

          {/* Account Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.auth.account}</span>
            </label>
            <input
              type="text"
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="admin"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Password Input with Show/Hide Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.auth.password}</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2FA OTP Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.auth.otp}</span>
              <span className="text-[10px] text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã 6 chữ số nếu bật 2FA"
              maxLength={6}
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-center placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 ${
                otp.trim() ? "font-mono font-bold tracking-widest text-sm" : "font-sans tracking-normal"
              }`}
            />
          </div>

          {/* Remember & Stay 7 days — Visual options */}
          <div className="space-y-2.5 pt-1">
            {/* Stay 7 days */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${stay7Days ? "bg-sky-500/10 border-sky-500/30 dark:bg-sky-500/10" : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stay7Days ? "bg-sky-500 text-white shadow-md" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t.auth.stay7Days}</p>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">7 NGÀY</span>
                </div>
                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 mt-0.5">{t.auth.stay7DaysDesc}</p>
              </div>
              <div className="shrink-0 pt-1">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={stay7Days} onChange={(e) => setStay7Days(e.target.checked)} className="sr-only peer" />
                  <div className={`w-11 h-6 rounded-full peer transition-all ${stay7Days ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                  <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform ${stay7Days ? "translate-x-5" : "translate-x-0.5"} top-0.5 left-0`} />
                </div>
              </div>
            </label>

            {/* Remember */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${remember ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/10" : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${remember ? "bg-emerald-500 text-white shadow-md" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t.auth.remember}</p>
                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 mt-0.5">{t.auth.rememberDesc}</p>
              </div>
              <div className="shrink-0 pt-1">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only peer" />
                  <div className={`w-11 h-6 rounded-full peer transition-all ${remember ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                  <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform ${remember ? "translate-x-5" : "translate-x-0.5"} top-0.5 left-0`} />
                </div>
              </div>
            </label>

            {/* Info hint when stay enabled */}
            {stay7Days && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 text-[11px] leading-relaxed">
                <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Phiên sẽ tự động khôi phục trong 7 ngày — đóng tab/trình duyệt vẫn giữ đăng nhập. Dữ liệu lưu cục bộ trên thiết bị này và có thể xóa bằng “Đăng xuất”.</span>
              </div>
            )}
          </div>

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
    </div>
  );
};
