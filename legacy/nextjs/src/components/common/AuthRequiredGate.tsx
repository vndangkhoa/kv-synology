"use client";

import React from "react";
import { ShieldAlert, LogIn, Server, KeyRound, Lock, ArrowRight, Settings } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";

interface AuthRequiredGateProps {
  tabName?: string;
}

export const AuthRequiredGate: React.FC<AuthRequiredGateProps> = ({ tabName }) => {
  const { openLoginModal, setActiveTab } = useAppStore();

  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-xl text-center space-y-6">
        {/* Animated Icon Glow */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-sky-500/20 dark:bg-sky-500/10 blur-xl scale-125 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 p-[1px] shadow-xl shadow-sky-500/20">
            <div className="w-full h-full rounded-[23px] bg-white dark:bg-slate-900 flex items-center justify-center">
              <Lock className="w-9 h-9 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Chế độ Dữ liệu mẫu đã tắt • Yêu cầu xác thực</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {tabName ? `Cần đăng nhập để xem ${tabName}` : "Yêu cầu đăng nhập Synology DSM"}
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Ứng dụng hoạt động với dữ liệu thời gian thực từ thiết bị NAS của bạn. Vui lòng kết nối để truy cập bảng điều khiển và toàn bộ công cụ quản trị.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openLoginModal(true)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập Synology DSM ngay</span>
            <ArrowRight className="w-4 h-4 opacity-75" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Cài đặt cấu hình</span>
          </button>
        </div>

        {/* Features / Security Guarantees */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
              <Server className="w-4 h-4 shrink-0" />
              <span>Kết nối trực tiếp</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Truy cập thẳng tới Synology qua LAN hoặc QuickConnect. Không thông qua máy chủ thứ ba.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Bảo mật chuẩn DSM</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Hỗ trợ đầy đủ mã xác thực 2 bước 2FA OTP và mã hóa SSL/TLS an toàn.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Dữ liệu thực 100%</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Thông số CPU, RAM, SMART đĩa và Docker hoàn toàn từ phần cứng thực tế.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
