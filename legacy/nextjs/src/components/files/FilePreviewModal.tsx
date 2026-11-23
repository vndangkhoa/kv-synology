"use client";

import React, { useState, useEffect } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { FileItem, ShareLink } from "@/lib/dsm/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { dsmClient } from "@/lib/dsm/client";
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
  Disc,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Terminal,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  AlertCircle,
  Play,
  Share2,
  Edit3,
  Save,
  CheckCircle2,
} from "lucide-react";

interface Props {
  file: FileItem | null;
  onClose: () => void;
  onFileSaved?: () => void;
}

export const FilePreviewModal: React.FC<Props> = ({ file, onClose, onFileSaved }) => {
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // Text Editor State
  const [textContent, setTextContent] = useState<string>("");
  const [loadingText, setLoadingText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingText, setSavingText] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sharing State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingLink, setSharingLink] = useState<ShareLink | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const ext = file?.name.split(".").pop()?.toLowerCase() || "";

  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"].includes(ext);
  const isVideo = ["mp4", "mkv", "mov", "webm", "avi", "3gp", "ts"].includes(ext);
  const isAudio = ["mp3", "flac", "wav", "m4a", "ogg", "aac"].includes(ext);
  const isPdf = ext === "pdf";
  const isCsv = ["csv", "tsv"].includes(ext);
  const isCodeOrText = ["js", "ts", "tsx", "jsx", "json", "yml", "yaml", "sh", "py", "html", "css", "env", "sql", "xml", "conf", "ini", "log", "txt", "md", "c", "cpp", "rs", "go"].includes(ext) || (!ext && !file?.isdir);
  const isArchive = ["zip", "tar", "gz", "7z", "rar", "bz2"].includes(ext);
  const isIso = ["iso", "img", "bin", "dmg"].includes(ext);

  const streamUrl = file ? dsmClient.getFileStreamUrl(file.path, isImage) : "";
  const downloadUrl = file ? dsmClient.getFileDownloadUrl(file.path) : "";

  useEffect(() => {
    if (!file) return;
    setZoomLevel(1);
    setRotation(0);
    setImgError(false);
    setVideoError(false);
    setIsEditing(false);
    setSaveSuccess(false);

    if (isCodeOrText || isCsv) {
      if (file.content) {
        setTextContent(file.content);
      } else {
        setLoadingText(true);
        dsmClient.getFileContent(file.path).then((txt) => {
          setTextContent(txt || "");
          setLoadingText(false);
        });
      }
    }
  }, [file]);

  if (!file) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Đang chuẩn bị tải về: ${file.name}`);
    }
  };

  const handleSaveText = async () => {
    if (!file) return;
    setSavingText(true);
    try {
      const folderPath = file.path.substring(0, file.path.lastIndexOf("/")) || "/";
      const ok = await dsmClient.saveTextFile(folderPath, file.name, textContent);
      if (ok) {
        setSaveSuccess(true);
        setIsEditing(false);
        if (onFileSaved) onFileSaved();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Lỗi: Không thể lưu tệp tin lên NAS");
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu tệp: ${err.message || err}`);
    } finally {
      setSavingText(false);
    }
  };

  const handleCreateShare = async () => {
    if (!file) return;
    setCreatingShare(true);
    setShareModalOpen(true);
    try {
      const link = await dsmClient.createShareLink(file.path);
      setSharingLink(link);
    } catch (err: any) {
      alert(`Không thể tạo liên kết chia sẻ: ${err.message}`);
      setShareModalOpen(false);
    } finally {
      setCreatingShare(false);
    }
  };

  const renderCsvTable = (content: string) => {
    const lines = content.trim().split("\n");
    if (lines.length === 0) return null;
    const headers = lines[0].split(",");
    const rows = lines.slice(1).map((line) => line.split(","));

    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3.5 py-3 whitespace-nowrap">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <ResponsiveModal open={!!file} onClose={onClose} maxWidth="4xl" noPadding>
      <div className="flex flex-col w-full max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : isVideo ? <Film className="w-5 h-5" /> : isAudio ? <Music className="w-5 h-5" /> : isCodeOrText ? <FileCode className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-xs sm:text-base text-slate-900 dark:text-white truncate">
                  {file.name}
                </h3>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã lưu
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {formatBytes(file.size)} • {formatDate(file.mtime)} • {file.path}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Share public button */}
            <button
              onClick={handleCreateShare}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Chia sẻ liên kết công khai"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tải về máy tính"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-950/40">
          {/* 1. Real Image Viewer */}
          {isImage && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative overflow-hidden rounded-2xl max-h-[60vh] flex items-center justify-center bg-slate-950/20 p-2">
                {!imgError && streamUrl ? (
                  <img
                    src={streamUrl}
                    alt={file.name}
                    className="max-h-[55vh] w-auto object-contain rounded-lg shadow-lg transition-transform duration-200"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Không thể tải trực tiếp ảnh</p>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                    >
                      Tải về tệp ảnh
                    </button>
                  </div>
                )}
              </div>

              {/* Image Controls */}
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-2xl shadow-sm text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold px-2">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center space-x-1"
                  title="Xoay 90°"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Xoay</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Real Video Player */}
          {isVideo && (
            <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
              {streamUrl ? (
                <div className="space-y-3 p-3 sm:p-4">
                  {!videoError ? (
                    <video
                      controls
                      autoPlay
                      preload="metadata"
                      src={streamUrl}
                      className="w-full max-h-[60vh] rounded-2xl bg-black shadow-inner"
                      onError={() => setVideoError(true)}
                    >
                      Trình duyệt của bạn không hỗ trợ phát thẻ video HTML5.
                    </video>
                  ) : (
                    <div className="p-8 text-center space-y-3 text-white">
                      <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                      <p className="font-bold text-sm">Định dạng Video yêu cầu phát bằng phần mềm ngoài</p>
                      <p className="text-xs text-slate-400">
                        Codec của video này chưa được trình duyệt giải mã trực tiếp. Bạn có thể mở bằng VLC hoặc tải về.
                      </p>
                      <div className="flex items-center justify-center space-x-3 pt-2">
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải về máy tính</span>
                        </button>
                        <a
                          href={streamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở trong Tab mới</span>
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-2 gap-2 pt-1">
                    <span className="truncate max-w-sm">{file.name}</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleCopy(streamUrl)}
                        className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 text-xs"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Đã chép link" : "Chép link phát"}</span>
                      </button>

                      <a
                        href={streamUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline flex items-center space-x-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở trực tiếp / VLC</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 text-white">
                  <Film className="w-16 h-16 text-indigo-400 mx-auto" />
                  <p className="font-bold text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)} • Video Stream</p>
                </div>
              )}
            </div>
          )}

          {/* 3. Real Audio Player */}
          {isAudio && (
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center space-y-5 text-white shadow-xl">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/20">
                <Music className="w-12 h-12" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-base text-slate-100">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">Lossless Audio Stream • {formatBytes(file.size)}</p>
              </div>

              {streamUrl && (
                <div className="w-full max-w-lg space-y-3">
                  <audio controls autoPlay preload="auto" src={streamUrl} className="w-full rounded-2xl" />
                  <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                    <button
                      onClick={() => handleCopy(streamUrl)}
                      className="hover:text-slate-200 flex items-center space-x-1 text-xs"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Đã chép link" : "Chép link nhạc"}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="text-sky-400 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải bài hát</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Text & Code Editor (.yml, .txt, .env, .json, .sh, .py, etc.) */}
          {isCodeOrText && (
            <div className="rounded-2xl sm:rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner font-mono text-xs text-slate-200 flex flex-col">
              {/* Toolbar */}
              <div className="bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-bold text-slate-300 truncate">{file.name}</span>
                  <span className="hidden sm:inline text-slate-500">
                    ({isEditing ? "Chế độ chỉnh sửa" : "Chế độ xem"})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 rounded-xl font-bold flex items-center space-x-1 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Chỉnh sửa</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        disabled={savingText}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveText}
                        disabled={savingText}
                        className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                      >
                        {savingText ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3" />
                            <span>Lưu thay đổi</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editor Content Area */}
              <div className="p-3 sm:p-4 overflow-x-auto min-h-[260px] max-h-[480px]">
                {loadingText ? (
                  <div className="py-12 flex items-center justify-center space-x-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Đang đọc tệp tin từ máy chủ NAS...</span>
                  </div>
                ) : isEditing ? (
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={16}
                    placeholder="Nhập nội dung tệp tin tại đây..."
                    className="w-full h-full bg-slate-950 text-slate-100 font-mono text-xs focus:outline-none resize-y leading-relaxed border-0 p-1"
                    spellCheck={false}
                  />
                ) : (
                  <pre className="leading-relaxed">
                    {(textContent || `# ${file.name}\n# Nội dung tệp tin trống`).split("\n").map((line, idx) => (
                      <div key={idx} className="table-row">
                        <span className="table-cell pr-4 text-slate-600 select-none text-right font-mono text-[11px]">{idx + 1}</span>
                        <span className="table-cell">{line}</span>
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* 5. CSV / Spreadsheet Viewer */}
          {isCsv && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Bảng dữ liệu trích xuất</span>
              </div>
              {renderCsvTable(textContent)}
            </div>
          )}

          {/* 6. PDF Viewer */}
          {isPdf && (
            <div className="space-y-3">
              {streamUrl ? (
                <iframe
                  src={streamUrl}
                  className="w-full h-[480px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                  title={file.name}
                />
              ) : (
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-20 rounded-xl bg-rose-600 text-white shadow-xl flex flex-col items-center justify-center p-2 font-bold">
                    PDF
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{file.name}</h4>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
              )}
            </div>
          )}

          {/* 7. Archive / ISO Viewer */}
          {(isArchive || isIso) && (
            <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                  {isIso ? <Disc className="w-6 h-6" /> : <FileArchive className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isIso ? "Ảnh đĩa khởi động (Bootable Disk Image)" : "Tệp tin nén (Archive Package)"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Dung lượng: {formatBytes(file.size)} • {file.owner || "admin"}
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1 text-slate-600 dark:text-slate-300">
                <p>Đường dẫn: {file.realPath || file.path}</p>
                <p>Quyền truy cập: {file.perm || "0644"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-400">
            DSM Helper Universal File Editor & Reader
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Public Share Link Modal */}
      {shareModalOpen && (
        <ResponsiveModal open={shareModalOpen} onClose={() => setShareModalOpen(false)} maxWidth="md" title="Chia sẻ liên kết công khai" icon={<Share2 className="w-5 h-5" />}>
          <div className="space-y-4">
            {creatingShare ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                <span>Đang tạo liên kết chia sẻ từ Synology DSM...</span>
              </div>
            ) : sharingLink ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bất kỳ ai có liên kết này đều có thể xem hoặc tải về tệp tin: <strong>{file.name}</strong>
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    URL Chia sẻ công khai
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={sharingLink.url}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(sharingLink.url);
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
        </ResponsiveModal>
      )}
    </ResponsiveModal>
  );
};
