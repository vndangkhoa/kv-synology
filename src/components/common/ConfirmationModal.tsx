"use client";

import React from "react";
import { AlertTriangle, RotateCw, Square, Trash2, X, Check } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  type: "restart" | "stop" | "delete" | "generic";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  title,
  message,
  confirmText,
  cancelText = "Hủy",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getStyle = () => {
    switch (type) {
      case "restart":
        return {
          icon: RotateCw,
          iconBg: "bg-sky-500/10 text-sky-500 border-sky-500/20",
          btnColor: "bg-sky-600 hover:bg-sky-500 text-white",
          defaultConfirm: "Khởi động lại",
        };
      case "stop":
        return {
          icon: Square,
          iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          btnColor: "bg-amber-600 hover:bg-amber-500 text-white",
          defaultConfirm: "Dừng tiến trình",
        };
      case "delete":
        return {
          icon: Trash2,
          iconBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
          btnColor: "bg-rose-600 hover:bg-rose-500 text-white",
          defaultConfirm: "Xóa vĩnh viễn",
        };
      default:
        return {
          icon: AlertTriangle,
          iconBg: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
          btnColor: "bg-indigo-600 hover:bg-indigo-500 text-white",
          defaultConfirm: "Xác nhận",
        };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl border shrink-0 ${style.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ${style.btnColor} disabled:opacity-50`}
          >
            {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{confirmText || style.defaultConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
