"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { Power, RotateCw, AlertTriangle, X, Check } from "lucide-react";

export const PowerModal: React.FC = () => {
  const { isPowerModalOpen, powerModalType, closePowerModal, t } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isPowerModalOpen) return null;

  const isReboot = powerModalType === "reboot";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await dsmClient.powerAction(powerModalType, true);
      setSuccessMsg(t.settings.powerActionTriggered);
      setTimeout(() => {
        setSuccessMsg(null);
        closePowerModal();
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-2xl ${
                isReboot
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              {isReboot ? <RotateCw className="w-5 h-5" /> : <Power className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isReboot ? t.settings.reboot : t.settings.shutdown}
              </h3>
              <p className="text-xs text-slate-400">Synology DiskStation</p>
            </div>
          </div>
          <button onClick={closePowerModal}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Warning Body */}
        {successMsg ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isReboot ? t.settings.rebootConfirm : t.settings.shutdownConfirm}
            </span>
          </div>
        )}

        {/* Actions */}
        {!successMsg && (
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={closePowerModal}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                isReboot
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {loading ? "Đang gửi lệnh..." : t.common.confirm}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
