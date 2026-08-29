"use client";

import React, { useState, useRef } from "react";
import { parseAclCsv } from "@/lib/permissions/aclEngine";
import { SAMPLE_NAS_ACL_CSV } from "@/lib/permissions/sampleData";
import { AclDataset } from "@/lib/permissions/types";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  X,
  CheckCircle2,
  HardDrive,
  Cpu,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface AclImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (dataset: AclDataset) => void;
}

export const AclImportModal: React.FC<AclImportModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const { t } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  if (!isOpen) return null;

  const processCsvContent = (content: string, fileName = "Imported_ACL.csv") => {
    setIsLoading(true);
    setStatusMessage("Đang phân tích cú pháp và lập chỉ mục cây thư mục...");
    try {
      setTimeout(() => {
        const dataset = parseAclCsv(content);
        dataset.fileName = fileName;
        setIsLoading(false);
        onDataLoaded(dataset);
        onClose();
      }, 100);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      alert("Lỗi khi phân tích file CSV: " + String(err));
    }
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setStatusMessage(`Đang nạp ${file.name}...`);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCsvContent(text, file.name);
    };
    reader.onerror = () => {
      setIsLoading(false);
      alert("Không thể đọc file đã chọn.");
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = () => {
    processCsvContent(SAMPLE_NAS_ACL_CSV, "Sample_Synology_NAS_ACL.csv");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Nhập Dữ Liệu Phân Quyền (NAS ACL Import)
              </h3>
              <p className="text-xs text-slate-400">
                Hỗ trợ định dạng CSV từ Synology DSM hoặc QNAP NAS (Xử lý 100% Client-side).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              isDragging
                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-sky-400"
            }`}
          >
            {isLoading ? (
              <div className="py-6 space-y-3">
                <Loader2 className="w-10 h-10 mx-auto text-sky-500 animate-spin" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {statusMessage}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Kéo thả file CSV ACL vào đây hoặc{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sky-500 hover:text-sky-600 underline font-extrabold cursor-pointer"
                    >
                      chọn từ máy tính
                    </button>
                  </p>
                  <p className="text-xs text-slate-400">
                    Tương thích file CSV xuất từ Synology File Station Permission Export
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                <HardDrive className="w-4 h-4" />
                <span>Tree Hierarchy</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tự động bóc tách cấu trúc cây thư mục nhiều cấp mượt mà.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-4 h-4" />
                <span>Effective Perm</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tính toán quyền thực tế: Deny ưu tiên cao nhất, gộp Group.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <span>Audit Tự Động</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cảnh báo quyền quá rộng tại gốc và tài khoản cá nhân có Full Control.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Nạp Dữ Liệu Mẫu (Enterprise Demo Data)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Chọn File CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
