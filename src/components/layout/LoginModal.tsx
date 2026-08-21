"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DSMConnectionConfig } from "@/lib/dsm/types";
import {
  X,
  Server,
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Globe,
  Zap,
} from "lucide-react";

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, openLoginModal, setSession, t } = useAppStore();

  const [host, setHost] = useState("");
  const [port, setPort] = useState("5001");
  const [https, setHttps] = useState(true);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [ignoreCert, setIgnoreCert] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const session = await dsmClient.login(config, false);
      setSession(session);
      openLoginModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || t.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    const config: DSMConnectionConfig = {
      host: "demo.synology.lan",
      port: 5001,
      https: true,
      account: "demo_admin",
    };
    const session = await dsmClient.login(config, true);
    setSession(session);
    setLoading(false);
    openLoginModal(false);
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {t.auth.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.auth.subtitle}
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

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center space-x-2 border border-slate-200/60 dark:border-slate-700/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.auth.loginDemoButton}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
