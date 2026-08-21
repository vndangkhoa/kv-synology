"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { FileItem, ShareLink } from "@/lib/dsm/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { FilePreviewModal } from "./FilePreviewModal";
import {
  Folder,
  FolderPlus,
  FilePlus,
  Upload,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
  Disc,
  Trash2,
  Edit2,
  ChevronRight,
  Eye,
  X,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
} from "lucide-react";

export const FileStationTab: React.FC = () => {
  const { t } = useAppStore();
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState<string>("");

  // Modals state
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");

  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState("");
  const [newFileContentInput, setNewFileContentInput] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Sharing State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingTarget, setSharingTarget] = useState<FileItem | null>(null);
  const [createdShareLink, setCreatedShareLink] = useState<ShareLink | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Shared Links Manager State
  const [shareManagerOpen, setShareManagerOpen] = useState(false);
  const [activeShareLinks, setActiveShareLinks] = useState<ShareLink[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadFolder = async (path: string) => {
    setLoading(true);
    setCurrentPath(path);
    try {
      const items = await dsmClient.listFiles(path);
      setFiles(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolder("/");
  }, []);

  const handleNavigate = (path: string) => {
    loadFolder(path);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    await dsmClient.createFolder(currentPath, folderNameInput.trim());
    setFolderNameInput("");
    setNewFolderOpen(false);
    showToast(`Đã tạo thư mục "${folderNameInput.trim()}" thành công!`);
    loadFolder(currentPath);
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileNameInput.trim()) return;
    setCreatingFile(true);
    try {
      const ok = await dsmClient.saveTextFile(currentPath, newFileNameInput.trim(), newFileContentInput);
      if (ok) {
        setNewFileNameInput("");
        setNewFileContentInput("");
        setNewFileOpen(false);
        showToast(`Đã tạo tệp tin "${newFileNameInput.trim()}" thành công!`);
        loadFolder(currentPath);
      } else {
        alert("Không thể tạo tệp tin trên NAS");
      }
    } finally {
      setCreatingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Đang tải lên (${i + 1}/${selectedFiles.length}): ${file.name}...`);
        await dsmClient.uploadFile(currentPath, file);
      }
      showToast(`Đã tải lên ${selectedFiles.length} tệp tin thành công!`);
      loadFolder(currentPath);
    } catch (err: any) {
      alert(`Lỗi khi tải lên tệp: ${err.message || err}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenShare = async (file: FileItem) => {
    setSharingTarget(file);
    setCreatedShareLink(null);
    setCreatingShare(true);
    setShareModalOpen(true);
    try {
      const link = await dsmClient.createShareLink(file.path);
      setCreatedShareLink(link);
    } catch (err: any) {
      alert(`Không thể tạo liên kết chia sẻ: ${err.message}`);
      setShareModalOpen(false);
    } finally {
      setCreatingShare(false);
    }
  };

  const handleOpenShareManager = async () => {
    setShareManagerOpen(true);
    setLoadingShares(true);
    try {
      const list = await dsmClient.listShareLinks();
      setActiveShareLinks(list);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleDeleteShare = async (id: string) => {
    await dsmClient.deleteShareLink(id);
    setActiveShareLinks((prev) => prev.filter((s) => s.id !== id));
    showToast("Đã thu hồi liên kết chia sẻ!");
  };

  const handleDelete = async (file: FileItem) => {
    if (confirm(`${t.files.deleteConfirm} (${file.name})`)) {
      await dsmClient.deleteFile(file.path);
      showToast(`Đã xóa "${file.name}"`);
      loadFolder(currentPath);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !renameInput.trim()) return;
    await dsmClient.renameFile(renameItem.path, renameInput.trim());
    setRenameItem(null);
    setRenameInput("");
    showToast(`Đã đổi tên thành "${renameInput.trim()}"`);
    loadFolder(currentPath);
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isdir) return <Folder className="w-5 h-5 text-sky-500 fill-sky-500/20 shrink-0" />;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"].includes(ext))
      return <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext))
      return <Film className="w-5 h-5 text-indigo-500 shrink-0" />;
    if (["mp3", "flac", "wav", "aac", "m4a", "ogg"].includes(ext))
      return <Music className="w-5 h-5 text-amber-500 shrink-0" />;
    if (["zip", "tar", "gz", "7z", "rar", "bz2"].includes(ext))
      return <FileArchive className="w-5 h-5 text-rose-500 shrink-0" />;
    if (["iso", "img", "bin", "dmg"].includes(ext))
      return <Disc className="w-5 h-5 text-purple-400 shrink-0" />;
    if (["csv", "tsv", "xlsx", "xls"].includes(ext))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    if (["js", "ts", "tsx", "jsx", "json", "yml", "yaml", "sh", "py", "html", "css", "env", "sql", "xml", "conf", "ini", "log", "txt", "md"].includes(ext))
      return <FileCode className="w-5 h-5 text-blue-500 shrink-0" />;
    return <FileText className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  const getFileTypeLabel = (file: FileItem) => {
    if (file.isdir) return "Thư mục";
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return `Ảnh (${ext.toUpperCase()})`;
    if (["mp4", "mkv", "mov", "webm"].includes(ext)) return `Video (${ext.toUpperCase()})`;
    if (["mp3", "flac", "wav", "m4a"].includes(ext)) return `Nhạc (${ext.toUpperCase()})`;
    if (ext === "pdf") return "Tài liệu PDF";
    return `Tệp tin .${ext.toUpperCase()}`;
  };

  // Breadcrumbs builder
  const pathParts = currentPath.split("/").filter(Boolean);
  const breadcrumbs = [
    { name: "Root (Gốc)", path: "/" },
    ...pathParts.map((part, idx) => ({
      name: part,
      path: "/" + pathParts.slice(0, idx + 1).join("/"),
    })),
  ];

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Banner */}
      {uploading && (
        <div className="p-3.5 bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
          <span>{uploadProgress || "Đang tải tệp tin lên máy chủ NAS..."}</span>
        </div>
      )}

      {/* Hidden File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Breadcrumb & Toolbar */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Breadcrumb Path */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs text-slate-600 dark:text-slate-300 no-scrollbar">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <button
                onClick={() => handleNavigate(crumb.path)}
                className={`px-2.5 py-1 rounded-xl transition-colors font-medium shrink-0 ${
                  idx === breadcrumbs.length - 1
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[140px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tệp..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Create Text File */}
            <button
              onClick={() => setNewFileOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
              title="Tạo tệp văn bản mới (.yml, .env, .txt, .json, .sh...)"
            >
              <FilePlus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Tạo tệp</span>
            </button>

            {/* Upload Files */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 disabled:opacity-50"
              title="Tải tệp tin lên thư mục hiện tại"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.files.uploadFile || "Tải lên"}</span>
            </button>

            {/* Create Folder */}
            <button
              onClick={() => setNewFolderOpen(true)}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shrink-0"
              title={t.files.newFolder}
            >
              <FolderPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">{t.files.newFolder}</span>
            </button>

            {/* Shared Links Manager */}
            <button
              onClick={handleOpenShareManager}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1"
              title="Quản lý liên kết đã chia sẻ"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Liên kết chia sẻ</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "text-slate-400"
                }`}
                title="Danh sách"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-sky-500 shadow-sm"
                    : "text-slate-400"
                }`}
                title="Lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadFolder(currentPath)}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title={t.common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Files Display */}
      {viewMode === "list" ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* 1. Mobile Files List (< md screens) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                {t.files.emptyFolder}
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div
                    onClick={() => (file.isdir ? handleNavigate(file.path) : setPreviewFile(file))}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {file.isdir ? (file.itemCount ? `${file.itemCount} mục` : "Thư mục") : formatBytes(file.size)} • {formatDate(file.mtime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenShare(file)}
                      className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg"
                      title="Chia sẻ liên kết công khai"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => (file.isdir ? handleNavigate(file.path) : setPreviewFile(file))}
                      className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg"
                      title="Xem / Chỉnh sửa"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setRenameItem(file);
                        setRenameInput(file.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg"
                      title="Đổi tên"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Desktop Files Table (>= md screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">{t.common.name}</th>
                  <th className="px-4 py-3.5">{t.common.type}</th>
                  <th className="px-4 py-3.5">{t.common.size}</th>
                  <th className="px-4 py-3.5">Quyền / Chủ sở hữu</th>
                  <th className="px-4 py-3.5">{t.common.dateModified}</th>
                  <th className="px-4 py-3.5 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-400 text-xs">
                      {t.files.emptyFolder}
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr
                      key={file.path}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      <td
                        onClick={() => (file.isdir ? handleNavigate(file.path) : setPreviewFile(file))}
                        className="px-4 py-3.5 font-bold text-slate-900 dark:text-white flex items-center space-x-3"
                      >
                        {getFileIcon(file)}
                        <span className="truncate hover:text-sky-500 transition-colors">{file.name}</span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                        {getFileTypeLabel(file)}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {file.isdir ? (file.itemCount ? `${file.itemCount} mục` : "--") : formatBytes(file.size)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{file.owner || "admin"}</span>
                        <span className="text-slate-400 ml-1.5">({file.perm || "0644"})</span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400">
                        {formatDate(file.mtime)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenShare(file)}
                            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Chia sẻ liên kết công khai"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => (file.isdir ? handleNavigate(file.path) : setPreviewFile(file))}
                            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Xem / Chỉnh sửa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setRenameItem(file);
                              setRenameInput(file.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Đổi tên"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {filteredFiles.map((file) => (
            <div
              key={file.path}
              onClick={() => (file.isdir ? handleNavigate(file.path) : setPreviewFile(file))}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 hover:shadow-md transition-all flex flex-col items-center justify-center text-center cursor-pointer group relative"
            >
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 mb-2 group-hover:scale-110 transition-transform">
                {getFileIcon(file)}
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate w-full">
                {file.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {file.isdir ? (file.itemCount ? `${file.itemCount} mục` : "Thư mục") : formatBytes(file.size)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 1. New Folder Modal */}
      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t.files.newFolder}
              </h3>
              <button
                onClick={() => setNewFolderOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Tên thư mục mới..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setNewFolderOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  {t.common.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Text File Modal (.yml, .env, .txt, .json, .sh...) */}
      {newFileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-500">
                <FilePlus className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Tạo tệp văn bản mới
                </h3>
              </div>
              <button
                onClick={() => setNewFileOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tên tệp tin (kèm đuôi: .yml, .env, .txt, .json, .sh, .py, .md, .conf...)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  placeholder="docker-compose.yml hoặc config.env"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nội dung ban đầu (Tùy chọn)
                </label>
                <textarea
                  rows={6}
                  value={newFileContentInput}
                  onChange={(e) => setNewFileContentInput(e.target.value)}
                  placeholder="version: '3.8'&#10;services:&#10;  app:&#10;    image: ..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={creatingFile}
                  onClick={() => setNewFileOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creatingFile}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center space-x-1"
                >
                  {creatingFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <span>Tạo tệp</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Rename File Modal */}
      {renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t.files.renameFile}
              </h3>
              <button
                onClick={() => setRenameItem(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRenameItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  {t.common.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Public Share Link Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-sky-500">
                <Share2 className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Chia sẻ liên kết công khai
                </h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {creatingShare ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                <span>Đang tạo liên kết chia sẻ từ Synology DSM...</span>
              </div>
            ) : createdShareLink ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bất kỳ ai có liên kết này đều có thể truy cập hoặc tải về: <strong>{sharingTarget?.name}</strong>
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    URL Chia sẻ công khai
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={createdShareLink.url}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdShareLink.url);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1"
                    >
                      {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{shareCopied ? "Đã chép" : "Chép"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={() => setShareModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 5. Shared Links Manager Modal */}
      {shareManagerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl p-5 sm:p-6 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2 text-sky-500">
                <LinkIcon className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Danh sách liên kết đang chia sẻ ({activeShareLinks.length})
                </h3>
              </div>
              <button
                onClick={() => setShareManagerOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {loadingShares ? (
                <div className="py-12 flex items-center justify-center space-x-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>Đang tải danh sách liên kết chia sẻ...</span>
                </div>
              ) : activeShareLinks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa có liên kết chia sẻ công khai nào được tạo.
                </div>
              ) : (
                activeShareLinks.map((link) => (
                  <div key={link.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {link.name || link.path}
                      </p>
                      <p className="text-slate-400 font-mono text-[11px] truncate">
                        {link.url}
                      </p>
                      {link.date_expired && (
                        <p className="text-[10px] text-amber-500">
                          Hết hạn: {link.date_expired}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(link.url);
                          showToast("Đã sao chép liên kết chia sẻ!");
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Sao chép URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteShare(link.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        title="Thu hồi liên kết"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setShareManagerOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Preview & Code Editor Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onFileSaved={() => loadFolder(currentPath)}
        />
      )}
    </div>
  );
};
