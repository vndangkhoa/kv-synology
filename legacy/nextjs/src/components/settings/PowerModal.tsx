"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import ResponsiveModal from "@/components/common/ResponsiveModal";
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

  const titleNode = (
    <div>
      <div className="text-base font-bold text-slate-900 dark:text-white leading-none">{isReboot ? t.settings.reboot : t.settings.shutdown}</div>
      <div className="text-xs text-slate-400 font-normal">Synology DiskStation</div>
    </div>
  );

  return (
    <ResponsiveModal
      open={isPowerModalOpen}
      onClose={closePowerModal}
      maxWidth="md"
      title={titleNode}
      icon={
        <div className={`p-2 rounded-xl ${isReboot ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
          {isReboot ? <RotateCw className="w-5 h-5" /> : <Power className="w-5 h-5" />}
        </div>
      }
      footer={
        !successMsg ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={closePowerModal}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${isReboot ? "bg-amber-600 hover:bg-amber-500" : "bg-rose-600 hover:bg-rose-500"}`}
            >
              {loading ? "Đang gửi lệnh..." : t.common.confirm}
            </button>
          </div>
        ) : undefined
      }
    >
      {successMsg ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{isReboot ? t.settings.rebootConfirm : t.settings.shutdownConfirm}</span>
        </div>
      )}
    </ResponsiveModal>
  );
};
