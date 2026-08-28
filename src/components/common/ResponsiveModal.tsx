"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  "6xl": "sm:max-w-6xl",
  full: "sm:max-w-full",
};

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: MaxWidth;
  dismissable?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Optional class overrides for the inner panel (e.g. full-screen on md). */
  panelClassName?: string;
  /** Disable default p-4 sm:p-5 container padding */
  noPadding?: boolean;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  open,
  onClose,
  title,
  icon,
  maxWidth = "md",
  dismissable = true,
  footer,
  children,
  panelClassName = "",
  noPadding = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackdrop = useCallback(() => {
    if (dismissable) onClose();
  }, [dismissable, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissable, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleBackdrop();
      }}
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full ${MAX_WIDTH_CLASS[maxWidth]} max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden mb-0 sm:my-auto animate-in slide-in-from-bottom-4 sm:fade-in duration-200 ${panelClassName}`}
      >
        {(title || icon) && (
          <div className="flex items-center justify-between gap-3 px-3.5 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && <span className="shrink-0 text-sky-500">{icon}</span>}
              {title && (
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {title}
                </h3>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${noPadding ? "" : "p-3.5 sm:p-5"}`}>{children}</div>

        {footer && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-3.5 sm:px-5 py-3 bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ResponsiveModal;
