"use client";

import React, { useState, useEffect, useRef } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import { DownloadTask, DownloadTaskDetail, DownloadStationStatistic, DownloadStationConfig, DownloadStationSchedule, RSSSite, RSSFeed, BTSearchResult, HostModule, HostAccount } from "@/lib/dsm/types";
import { formatBytes, formatSpeed } from "@/lib/utils";
import {
  DownloadCloud,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  X,
  Search,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Home,
  Grid3x3,
  List,
  Link,
  ClipboardPaste,
  ArrowLeft,
  Settings2,
  BarChart3,
  Rss,
  SearchCode,
  Eye,
  Layers,
  HardDrive,
  Copy,
  ExternalLink,
  Globe,
  Users,
  Activity,
  Clock,
  FileArchive,
  AlertTriangle,
  Check,
  Upload,
  PauseCircle,
  PlayCircle,
  Eraser,
  Sliders,
  Sparkles,
  Share2,
  KeyRound,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const DownloadStationTab: React.FC = () => {
  const { t, session, language, setActiveTab, setFileStationPath } = useAppStore();
  const isEn = language === "en";
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addTab, setAddTab] = useState<"url" | "file">("url");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [destination, setDestination] = useState("/downloads");
  const [folderContents, setFolderContents] = useState<{ path: string; name: string; isdir: boolean }[]>([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "downloading" | "finished" | "paused">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"tasks" | "btsearch" | "rss" | "hosts">("tasks");
  const [settingsTab, setSettingsTab] = useState<"speed" | "dest" | "hosts" | "btmodules">("speed");
  const [statistic, setStatistic] = useState<DownloadStationStatistic | null>(null);
  const [dsConfig, setDsConfig] = useState<DownloadStationConfig | null>(null);
  const [schedule, setSchedule] = useState<DownloadStationSchedule | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailTask, setDetailTask] = useState<DownloadTaskDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "files" | "trackers" | "peers">("overview");
  const [detailLoading, setDetailLoading] = useState(false);
  const [editDest, setEditDest] = useState("");
  const [showEditPicker, setShowEditPicker] = useState(false);

  // BTSearch states
  const [btKeyword, setBtKeyword] = useState("");
  const [btModule, setBtModule] = useState("all");
  const [btModules, setBtModules] = useState<Array<{name:string;title:string}>>([{name:"all",title:"Tất cả công cụ (All)"}]);
  const [btCategories, setBtCategories] = useState<string[]>([]);
  const [btCategory, setBtCategory] = useState("");
  const [btSortBy, setBtSortBy] = useState<"seeds" | "size" | "date">("seeds");
  const [btTaskId, setBtTaskId] = useState<string | null>(null);
  const [btResults, setBtResults] = useState<BTSearchResult[]>([]);
  const [btTotal, setBtTotal] = useState(0);
  const [btFinished, setBtFinished] = useState(true);
  const [btLoading, setBtLoading] = useState(false);
  const [copiedMagnet, setCopiedMagnet] = useState<string | null>(null);
  const [downloadingBtIndex, setDownloadingBtIndex] = useState<number | null>(null);

  // RSS states
  const [rssSites, setRssSites] = useState<RSSSite[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [selectedRssSite, setSelectedRssSite] = useState<string | null>(null);
  const [newRssUrl, setNewRssUrl] = useState("");
  const [rssLoading, setRssLoading] = useState(false);
  const [rssSearch, setRssSearch] = useState("");

  // File Hosting (Google Drive, Fshare.vn, Mediafire...) states
  const [hostModules, setHostModules] = useState<HostModule[]>([]);
  const [hostLoading, setHostLoading] = useState(false);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [newHostUsername, setNewHostUsername] = useState("");
  const [newHostPassword, setNewHostPassword] = useState("");
  const [hostLinkInput, setHostLinkInput] = useState("");
  const [hostResolving, setHostResolving] = useState(false);
  const [hostResolvedResult, setHostResolvedResult] = useState<{ directUrl?: string; host?: string; message?: string } | null>(null);

  const [addError, setAddError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const folderPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPickerRef = useRef<HTMLDivElement>(null);
  const defaultFolderPickerRef = useRef<HTMLDivElement>(null);
  const [showDefaultPicker, setShowDefaultPicker] = useState(false);

  const loadDefaultDestination = () => {
    try {
      const saved = sessionStorage.getItem("dsm:download:lastDestination");
      if (saved) setDestination(saved);
    } catch (_) {}
  };

  const saveDefaultDestination = (path: string) => {
    try {
      sessionStorage.setItem("dsm:download:lastDestination", path);
    } catch (_) {}
  };

  const loadFolderContents = async (path: string) => {
    setFolderLoading(true);
    try {
      const files = await dsmClient.listFiles(path === "/" ? "" : path);
      setFolderContents(files);
      setCurrentPath(path);
    } catch (_) {
      setFolderContents([]);
    } finally {
      setFolderLoading(false);
    }
  };

  const goBack = async () => {
    if (currentPath === "/") return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
    await loadFolderContents(parent);
  };

  const loadTasks = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const list = await dsmClient.getDownloadTasks();
      setTasks(list);
      // Sync detailTask in real-time if detail modal is open
      setDetailTask(prev => {
        if (!prev) return null;
        const live = list.find(x => x.id === prev.id);
        if (!live) return prev;
        return {
          ...prev,
          status: live.status,
          progress: live.progress,
          downloadSpeed: live.downloadSpeed,
          uploadSpeed: live.uploadSpeed,
          size: live.size || prev.size,
          destination: live.destination || prev.destination,
          _dsmStatus: (live as any)._dsmStatus || (prev as any)._dsmStatus,
        };
      });
    } catch(e:any){
      console.error("[DS] loadTasks failed", e?.message || e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadStatistic = async () => {
    try {
      const s = await dsmClient.getDownloadStationStatistic();
      if (s) setStatistic(s);
    } catch (_) {}
  };

  const loadDSConfig = async () => {
    try {
      const [cfg, sch] = await Promise.all([
        dsmClient.getDownloadStationConfig(),
        dsmClient.getDownloadStationSchedule(),
      ]);
      if (cfg) setDsConfig(cfg);
      else setDsConfig({ bt_max_download:0, bt_max_upload:0, nzb_max_download:0, http_max_download:0, ftp_max_download:0, emule_max_download:0, emule_max_upload:0, emule_enabled:false, unzip_service_enabled:true, default_destination:"/downloads", emule_default_destination:"/downloads" });
      if (sch) setSchedule(sch);
      else setSchedule({ enabled:false, emule_enabled:false });
    } catch (_) {
      setDsConfig({ bt_max_download:0, bt_max_upload:0, nzb_max_download:0, http_max_download:0, ftp_max_download:0, emule_max_download:0, emule_max_upload:0, emule_enabled:false, unzip_service_enabled:true, default_destination:"/downloads", emule_default_destination:"/downloads" });
      setSchedule({ enabled:false, emule_enabled:false });
    }
  };

  const loadRSS = async () => {
    setRssLoading(true);
    try {
      const sites = await dsmClient.getRSSSites();
      setRssSites(sites);
      if (sites.length > 0 && !selectedRssSite) {
        setSelectedRssSite(sites[0].id);
        const feeds = await dsmClient.getRSSFeeds(sites[0].id);
        setRssFeeds(feeds);
      } else if (selectedRssSite) {
        const feeds = await dsmClient.getRSSFeeds(selectedRssSite);
        setRssFeeds(feeds);
      }
    } finally { setRssLoading(false); }
  };

  const loadBTMeta = async () => {
    try {
      const [mods, cats] = await Promise.all([
        dsmClient.getBTSearchModules(),
        dsmClient.getBTSearchCategories(),
      ]);
      if (mods.length) setBtModules(mods);
      if (cats.length) setBtCategories(cats);
    } catch (_) {}
  };

  const loadHostModules = async () => {
    setHostLoading(true);
    try {
      const hosts = await dsmClient.getHostModules();
      setHostModules(hosts);
    } finally {
      setHostLoading(false);
    }
  };

  useEffect(() => {
    loadTasks(true);
    loadStatistic();
    loadDSConfig();
    loadBTMeta();
    loadHostModules();
  }, []);

  // Adaptive live polling: 1.2s when any downloading, 2.5s otherwise (silent update, does not flicker UI)
  useEffect(() => {
    const hasDownloading = tasks.some(t=> t.status==="downloading");
    const interval = hasDownloading ? 1200 : 2500;
    const timer = setInterval(() => { loadTasks(false); loadStatistic(); }, interval);
    return () => clearInterval(timer);
  }, [tasks.map(t=> t.status).join(","), tasks.length]);

  useEffect(() => {
    if (subTab === "rss") loadRSS();
    if (subTab === "btsearch") loadBTMeta();
    if (subTab === "hosts") loadHostModules();
  }, [subTab]);

  useEffect(() => {
    if (settingsOpen) {
      loadDSConfig();
      loadHostModules();
      loadBTMeta();
    }
  }, [settingsOpen]);

  // BT search polling
  useEffect(() => {
    if (!btTaskId || btFinished) return;
    const iv = setInterval(async () => {
      const res = await dsmClient.listBTSearch(btTaskId, 0, 50);
      setBtResults(res.items);
      setBtTotal(res.total);
      setBtFinished(res.finished);
      if (res.finished) clearInterval(iv);
    }, 2000);
    return () => clearInterval(iv);
  }, [btTaskId, btFinished]);

  useEffect(() => {
    if (addTaskModalOpen) {
      setAddError(null);
      setDuplicateId(null);
      // Prefer session storage, then DSM default config, then fallback
      const saved = (()=>{ try{ return sessionStorage.getItem("dsm:download:lastDestination"); }catch(_){ return null; } })();
      const dsmDefault = dsConfig?.default_destination;
      const initial = saved || dsmDefault || "/downloads";
      setDestination(initial);
      loadFolderContents(initial);
      setShowFolderPicker(false);
    } else {
      setCurrentPath("/");
      setFolderContents([]);
      setSelectedFile(null);
      setAddTab("url");
      setAddError(null);
      setDuplicateId(null);
    }
  }, [addTaskModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) setShowFolderPicker(false);
      if (editPickerRef.current && !editPickerRef.current.contains(e.target as Node)) setShowEditPicker(false);
      if (defaultFolderPickerRef.current && !defaultFolderPickerRef.current.contains(e.target as Node)) setShowDefaultPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sanitizeInputUrl = (raw: string): string => {
    raw = raw.trim();
    if (raw.includes("[") && raw.includes("](")) {
      const m = raw.match(/\((https?:\/\/[^\)]+)\)/);
      if (m) return m[1].trim().replace(/[\)\]\",]+$/,"");
      const any = raw.match(/https?:\/\/[^\s\)\]\"]+/);
      if (any) return any[0].replace(/[\)\]\",]+$/,"").trim();
    }
    const first = raw.match(/https?:\/\/[^\s\)\]\"]+/);
    if (first) return first[0].replace(/[\)\]\",]+$/,"").trim();
    return raw.replace(/^[\[\"'`]+|[\]\"'`]+$/g,"").trim();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (addTab === "url") {
      if (!urlInput.trim()) return;
      const rawUris = urlInput.split("\n").map(s=>sanitizeInputUrl(s)).filter(Boolean);
      setSubmitting(true);

      // Auto-correct destination case via FileStation shares (e.g. /Downloads -> /downloads)
      let effectiveDest = destination;
      try {
        const shares = await dsmClient.listFiles("/").catch(()=>[] as any);
        if (Array.isArray(shares) && shares.length && effectiveDest) {
          const top = effectiveDest.split("/").filter(Boolean)[0] || "";
          const match = shares.find((s:any)=> String(s.path||s.name).replace(/^\//,"").toLowerCase() === top.toLowerCase());
          if (match) {
            const correctTop = String(match.path||match.name).replace(/^\//,"");
            const corrected = "/" + correctTop + effectiveDest.slice(("/"+top).length);
            if (corrected !== effectiveDest) { effectiveDest = corrected; setDestination(corrected); }
          }
        }
      } catch(_){}

      try {
        let anySuccess = false;
        let lastError: string | null = null;
        let lastDup: string | null = null;
        for (const rawU of rawUris) {
          let u = rawU;
          if (rawU.includes("drive.google.com") || rawU.includes("fshare.vn") || rawU.includes("mediafire.com")) {
            const resolved = await dsmClient.resolveDownloadLink(rawU);
            if (resolved?.directUrl) u = resolved.directUrl;
          }

          const res: any = await dsmClient.addDownloadTask(u, effectiveDest);
          const ok = typeof res === "object" ? res.success : !!res;
          const err = typeof res === "object" ? res.error : null;
          const dup = res?.data?.duplicateId || null;
          if (dup) lastDup = dup;
          if (ok) anySuccess = true;
          else lastError = err || "DSM từ chối URI (kiểm tra định dạng HTTP/Magnet và quyền Download Station)";
        }
        setDuplicateId(lastDup);
        if (anySuccess) {
          setUrlInput("");
          setAddError(null);
          setAddTaskModalOpen(false);
          setTimeout(async()=>{
            await loadTasks();
          }, 1000);
          await loadTasks();
        } else if (lastError) {
          setAddError(lastError);
        }
      } finally { setSubmitting(false); }
    } else {
      if (!selectedFile) return;
      setSubmitting(true);
      try {
        const res = await dsmClient.createDownloadTaskFromFile(selectedFile, destination);
        if (res.success) {
          setSelectedFile(null);
          setAddTaskModalOpen(false);
          await loadTasks();
        } else if (res.listId) {
          await dsmClient.createDownloadTaskPolling(res.listId, [0], destination);
          setAddTaskModalOpen(false);
          await loadTasks();
        } else {
          setAddError("Không thể tạo tác vụ từ file .torrent. Kiểm tra định dạng file.");
        }
      } finally { setSubmitting(false); }
    }
  };

   const handleAction = async (id: string, action: "pause" | "resume" | "delete") => {
      setActionLoadingId(id);
      try {
        // Optimistic UI immediately so user sees feedback before DSM round-trip
        if(action==="resume"){
          setTasks(prev=> prev.map(x=> x.id===id ? {...x, status:"downloading" as any} : x));
        } else if(action==="pause"){
          setTasks(prev=> prev.map(x=> x.id===id ? {...x, status:"paused" as any} : x));
        }
        const res:any = await dsmClient.toggleDownloadTask(id, action, action==="delete");
        const ok = typeof res === "object" ? !!res.success : !!res;
        const code = res?.code;
        if(!ok){
          console.warn("[DS] toggle",action,"failed",res, "code", code);
          // Revert optimistic change precisely for this id
          if(action==="resume") setTasks(prev=> prev.map(x=> x.id===id ? {...x, status:"paused" as any} : x));
          else if(action==="pause") setTasks(prev=> prev.map(x=> x.id===id ? {...x, status:"downloading" as any} : x));
          let msg = res?.error || "";
          if(code===105) msg = "API không hỗ trợ (code 105) — kiểm tra Package Center > Download Station đang chạy";
          else if(code===100) msg = "Chưa đăng nhập (code 100)";
          else if(code===101) msg = "Thiếu quyền (code 101) — tài khoản không có quyền quản lý Download Station";
          else if(code===102) msg = "Tham số không hợp lệ (code 102) — thử lại vài giây nữa";
          else if(code===400) msg = "ID tác vụ không hợp lệ (code 400)";
          alert("Không thể " + (action==="pause"?"tạm dừng":action==="resume"?"tiếp tục":"xóa") + (msg? ": " + msg : ": tác vụ có thể đang bị khóa"));
          return;
        }
        // Give DSM a moment to transition state (waiting -> downloading) before re-fetch
        await new Promise(r=>setTimeout(r, 900));
        await loadTasks();
        await new Promise(r=>setTimeout(r, 400));
        await loadStatistic();
        if(action==="resume"){
          setTimeout(async()=>{
            const fresh = await dsmClient.getDownloadTasks().catch(()=>[]);
            const ft = fresh.find(x=>x.id===id) as any;
            if(ft){
              console.log(`[DS] resume verify id=${id} raw=${ft._dsmStatus} mapped=${ft.status} progress=${ft.progress} speed=${ft.downloadSpeed}`);
              if((ft.status as any)==="paused"){
                console.warn("[DS] resume still paused after verify", ft);
                // Don't auto-revert — user will see it stays paused and can retry
              }
            }
          }, 1500);
        }
      } catch(e:any){
        console.error("[DS] handleAction failed", e);
        if(action==="resume") setTasks(prev=> prev.map(x=> x.id===id ? {...x, status:"paused" as any} : x));
        else if(action==="pause") setTasks(prev=> prev.map(x=> x.id===id ? {...x, status:"downloading" as any} : x));
        alert("Không thể " + (action==="pause"?"tạm dừng":action==="resume"?"tiếp tục":"xóa") + ": " + (e?.message||e));
      } finally { setActionLoadingId(null); }
    };

  const handleRetryWithoutDest = async () => {
    if (!urlInput.trim()) return;
    setAddError(null);
    setSubmitting(true);
    try {
      const uris = urlInput.split("\n").map((s:string)=>sanitizeInputUrl(s)).filter(Boolean);
      let ok=false;
      for(const u of uris){
        const r:any = await dsmClient.addDownloadTask(u, "");
        if(r && r.success) ok=true;
      }
      if(ok){
        setUrlInput("");
        setAddTaskModalOpen(false);
        setTimeout(loadTasks,800);
        await loadTasks();
      } else {
        setAddError("Thử lại với thư mục mặc định vẫn thất bại. Kiểm tra Package Center > Download Station đã cài và đang chạy.");
      }
    } finally { setSubmitting(false); }
  };

  const handleCheckDSM = async () => {
    try{
      const sess:any = (dsmClient as any).getSession?.() || {};
      const hasToken = !!sess.synoToken;
      const hasSid = !!sess.sid;
      const [info, apiInfo, shares, cfg, pkg] = await Promise.all([
        dsmClient.getDownloadStationInfo().catch(()=>null),
        (dsmClient as any).getApiInfoForDownloadStation?.().catch(()=>null),
        dsmClient.listFiles("/").catch(()=>[] as any),
        dsmClient.getDownloadStationConfig().catch(()=>null),
        (dsmClient as any).postEntry?.("SYNO.Core.Package","list",1,{ additional: JSON.stringify(["status"]) }).catch(()=>null),
      ]);
      const shareNames = Array.isArray(shares) ? shares.map((s:any)=> s.path || s.name).join(", ") : "";
      const apiKeys = apiInfo ? Object.keys(apiInfo).join(", ") : "n/a";
      const cfgDest = cfg?.default_destination || "n/a";
      const dsPkg = pkg?.data?.packages?.find((p:any)=> String(p.id||p.dname||p.name).toLowerCase().includes("download"));
      const pkgStatus = dsPkg ? `${dsPkg.dname||dsPkg.id}: ${dsPkg.status}` : "không tìm thấy DownloadStation package";
      alert(
        `Chẩn đoán DSM:\n`+
        `• Session: hasSid=${hasSid} hasToken=${hasToken} user=${sess.account||""}\n`+
        `• Download Station Info: ${info ? JSON.stringify(info).slice(0,300) : "không lấy được"}\n`+
        `• Package: ${pkgStatus}\n`+
        `• API Info: ${apiKeys}\n`+
        `• default_destination: ${cfgDest}\n`+
        `• FileStation shares (/): ${shareNames || "/downloads"}\n\n`+
        `Gợi ý:\n`+
        `1. Nếu Package không Running → Package Center → Download Station → Chạy\n`+
        `2. Nếu hasToken=false → Đăng xuất/Đăng nhập lại\n`+
        `3. Nếu Destination "/Downloads" báo 102, chọn lại từ shares trên (chú ý "downloads" vs "Downloads"). Để trống để dùng mặc định (${cfgDest}).\n`+
        `4. Nếu tác vụ đã tồn tại 70%, nhấn Tiếp tục thay vì Thêm mới.`
      );
    } catch(e:any){
      alert("Lỗi kiểm tra DSM: " + (e?.message || e));
    }
  };

  const handleBulk = async (act: "pause" | "resume" | "delete") => {
    if (selectedIds.size===0) return;
    setLoading(true);
    try {
      if (act==="delete") await dsmClient.bulkDeleteTasks(Array.from(selectedIds), true);
      else for (const id of selectedIds) await dsmClient.toggleDownloadTask(id, act);
      setSelectedIds(new Set());
      await loadTasks();
    } finally { setLoading(false); }
  };

  const openDetail = async (task: DownloadTask) => {
     setDetailTask(task as DownloadTaskDetail);
     setDetailOpen(true);
     setDetailLoading(true);
     setEditDest(task.destination || "/downloads");
     try {
       const d = await dsmClient.getDownloadTaskInfo(task.id);
       if (d) setDetailTask(d);
     } finally { setDetailLoading(false); }
   };

   // Refresh detail info while modal is open
   useEffect(() => {
     if (!detailOpen || !detailTask) return;
     const iv = setInterval(async () => {
       try {
         const d = await dsmClient.getDownloadTaskInfo(detailTask.id);
         if (d) setDetailTask(d);
       } catch (_) {}
     }, 3000);
     return () => clearInterval(iv);
   }, [detailOpen, detailTask?.id]);

  const handleEditDest = async () => {
    if (!detailTask || !editDest) return;
    const ok = await dsmClient.editDownloadTask(detailTask.id, editDest);
    if (ok) {
      setDetailTask({ ...detailTask, destination: editDest });
      await loadTasks();
    }
  };

  const handleBTStart = async () => {
    if (!btKeyword.trim()) return;
    setBtLoading(true);
    setBtResults([]);
    try {
      const q = btKeyword.trim();
      const tid = await dsmClient.startBTSearch(q, btModule);
      if (tid) {
        setBtTaskId(tid);
        setBtFinished(false);

        // Polling loop: check DSM search results every 500ms
        let found = false;
        let pollCount = 0;
        while (pollCount < 4) {
          await new Promise((r) => setTimeout(r, 500));
          const res = await dsmClient.listBTSearch(tid, 0, 30, q);
          if (res.items && res.items.length > 0) {
            setBtResults(res.items);
            setBtTotal(res.total);
            setBtFinished(res.finished);
            found = true;
            if (res.finished) break;
          }
          pollCount++;
        }

        // If DSM search engines didn't return results, query reliable indexer API
        if (!found) {
          const fallbackRes = await dsmClient.listBTSearch(`fallback_${Date.now()}`, 0, 40, q);
          setBtResults(fallbackRes.items);
          setBtTotal(fallbackRes.total);
          setBtFinished(true);
        }
      }
    } catch (_) {
      // Direct fallback
      const fallbackRes = await dsmClient.listBTSearch(`fallback_${Date.now()}`, 0, 40, btKeyword.trim());
      setBtResults(fallbackRes.items);
      setBtTotal(fallbackRes.total);
      setBtFinished(true);
    } finally {
      setBtLoading(false);
    }
  };

  const downloadingTasks = tasks.filter((t) => t.status === "downloading" || (t as any).status === "waiting" || (t as any).status === "seeding");
  const finishedTasks = tasks.filter((t) => t.status === "finished");

  const totalDlSpeed = (()=> {
    const sum = downloadingTasks.reduce((acc, t) => acc + (t.downloadSpeed || 0), 0);
    const stat = statistic?.speed_download || 0;
    // Use max so we never show 0 when tasks report speed but statistic lags
    return Math.max(stat, sum);
  })();
  const totalUlSpeed = (()=> {
    const sum = downloadingTasks.reduce((acc, t) => acc + (t.uploadSpeed || 0), 0);
    const stat = statistic?.speed_upload || 0;
    return Math.max(stat, sum);
  })();

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "downloading" && task.status === "downloading") ||
      (statusFilter === "finished" && task.status === "finished") ||
      (statusFilter === "paused" && task.status === "paused");
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id:string) => {
    setSelectedIds(prev=>{
      const n=new Set(prev);
      if(n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Metric Cards - now with Statistic */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Đang tải ({downloadingTasks.length}) {statistic && <span className="font-normal">• DSM</span>}
            </p>
            <p className={`text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1 font-mono truncate ${downloadingTasks.length>0?"text-sky-600 dark:text-sky-400 animate-pulse":"text-sky-600 dark:text-sky-400"}`}>
              ↓ {formatSpeed(totalDlSpeed)}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tải lên {statistic && <span className="font-normal">• {formatSpeed(statistic.emule_speed_upload || 0)} eMule</span>}
            </p>
            <p className="text-sm sm:text-2xl font-bold text-amber-500 mt-0.5 sm:mt-1 font-mono truncate">
              ↑ {formatSpeed(totalUlSpeed)}
            </p>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Hoàn thành
            </p>
            <p className="text-sm sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">
              {finishedTasks.length}/{tasks.length}
            </p>
            {statistic && <p className="text-[10px] text-slate-400 font-mono">NZB ↓{formatSpeed(statistic.nzb_speed_download || 0)}</p>}
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit text-xs font-bold overflow-x-auto max-w-full">
        <button onClick={()=>setSubTab("tasks")} className={`px-4 py-1.5 rounded-xl transition-all ${subTab==="tasks"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}>{isEn ? `Tasks (${tasks.length})` : `Tác vụ (${tasks.length})`}</button>
        <button onClick={()=>setSubTab("btsearch")} className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${subTab==="btsearch"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}><SearchCode className="w-3.5 h-3.5"/>BT Search</button>
        <button onClick={()=>setSubTab("rss")} className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${subTab==="rss"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}><Rss className="w-3.5 h-3.5"/>RSS Feeds ({rssSites.length})</button>
        <button onClick={()=>setSubTab("hosts")} className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${subTab==="hosts"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}><Zap className="w-3.5 h-3.5 text-amber-500"/>File Hosting (GDrive, Fshare...)</button>
      </div>

      {subTab==="tasks" && (
        <>
      {/* Toolbar with bulk + settings */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? "Search tasks..." : "Tìm kiếm tác vụ..."}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl text-[11px] font-semibold">
            <button onClick={() => setStatusFilter("all")} className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${statusFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}>{isEn ? `All (${tasks.length})` : `Tất cả (${tasks.length})`}</button>
            <button onClick={() => setStatusFilter("downloading")} className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${statusFilter === "downloading" ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm" : "text-slate-500"}`}>{isEn ? `Downloading (${downloadingTasks.length})` : `Đang tải (${downloadingTasks.length})`}</button>
            <button onClick={() => setStatusFilter("finished")} className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all ${statusFilter === "finished" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500"}`}>{isEn ? `Done (${finishedTasks.length})` : `Xong (${finishedTasks.length})`}</button>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`} title={isEn ? "List View" : "Danh sách"}><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`} title={isEn ? "Grid View" : "Lưới"}><Grid3x3 className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={()=>setSettingsOpen(true)} className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title={isEn ? "Download Settings" : "Cài đặt DS"}><Settings2 className="w-3.5 h-3.5"/></button>
            <button onClick={() => setAddTaskModalOpen(true)} className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm shrink-0"><Plus className="w-3.5 h-3.5" /><span>{isEn ? "Add Download" : "Thêm tải"}</span></button>
            <button onClick={async()=>{ await Promise.all([loadTasks(), loadStatistic()]); }} className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
        </div>

        {/* Bulk actions bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-medium">{isEn ? "Bulk Actions:" : "Hàng loạt:"}</span>
          <button onClick={async()=>{await dsmClient.pauseAllTasks(); loadTasks();}} className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 text-xs font-bold flex items-center gap-1"><PauseCircle className="w-3.5 h-3.5"/>{isEn ? "Pause All" : "Tạm dừng tất cả"}</button>
          <button onClick={async()=>{await dsmClient.resumeAllTasks(); loadTasks();}} className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5"/>{isEn ? "Resume All" : "Tiếp tục tất cả"}</button>
          <button onClick={async()=>{if(confirm(isEn ? "Clear all completed tasks?" : "Xóa tất cả tác vụ đã xong?")){await dsmClient.clearFinishedTasks(); loadTasks();}}} className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1"><Eraser className="w-3.5 h-3.5"/>{isEn ? "Clear Finished" : "Xóa đã xong"}</button>
          {selectedIds.size>0 && (
            <>
              <span className="text-[11px] text-sky-600 font-bold">{isEn ? `Selected ${selectedIds.size}` : `Đã chọn ${selectedIds.size}`}</span>
              <button onClick={()=>handleBulk("pause")} className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-xs font-bold">{isEn ? "Pause Selected" : "Tạm dừng đã chọn"}</button>
              <button onClick={()=>handleBulk("resume")} className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold">{isEn ? "Resume Selected" : "Tiếp tục đã chọn"}</button>
              <button onClick={()=>handleBulk("delete")} className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold">{isEn ? "Delete Selected" : "Xóa đã chọn"}</button>
              <button onClick={()=>setSelectedIds(new Set())} className="text-[11px] text-slate-400 hover:text-slate-600">{isEn ? "Deselect" : "Bỏ chọn"}</button>
            </>
          )}
        </div>
      </div>

      {/* Task List/Grid with details */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
          <div className="text-xs text-slate-400">{t.download.noTasks}</div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredTasks.map((task) => {
            const isDownloading = task.status === "downloading" || task.status === "waiting";
            const isFinished = task.status === "finished";
            const isError = task.status === "error";
            const isLoading = actionLoadingId === task.id;
            const isSel = selectedIds.has(task.id);
            return (
              <div key={task.id} onClick={()=>openDetail(task)} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all group cursor-pointer ${isSel?"border-sky-400 ring-1 ring-sky-200": isError?"border-rose-200 dark:border-rose-800":"border-slate-200 dark:border-slate-800"}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input type="checkbox" checked={isSel} onChange={(e)=>{e.stopPropagation(); toggleSelect(task.id);}} onClick={(e)=>e.stopPropagation()} className="rounded border-slate-300 text-sky-600 shrink-0" />
                    <div className={`p-2 rounded-lg shrink-0 ${isError ? "bg-rose-500/10 text-rose-500" : isFinished ? "bg-emerald-500/10 text-emerald-500" : isDownloading ? "bg-sky-500/10 text-sky-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}><DownloadCloud className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate" title={task.title}>{task.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(task.size)} • {task.type} • {task.destination || "/downloads"}</p>
                    </div>
                  </div>
                  <button onClick={(e)=>{e.stopPropagation(); openDetail(task);}} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="w-3.5 h-3.5"/></button>
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    {task.progress >= 0 ? (
                      <div className={`h-full rounded-full transition-all duration-500 ${isError ? "bg-rose-500" : isFinished ? "bg-emerald-500" : isDownloading ? "bg-sky-500 animate-pulse" : "bg-slate-400"}`} style={{ width: `${task.progress}%` }} />
                    ) : (
                      <div className="h-full rounded-full bg-sky-500/30 animate-pulse" style={{ width: "100%" }} />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className={`${isError?"text-rose-600":"text-slate-400"}`}>
                      {isError ? `Lỗi${(task as any)._errorDetail? `: ${(task as any)._errorDetail.slice(0,40)}`: ""}` : isFinished ? t.download.completedTasks : isDownloading ? t.download.activeTasks : `${t.download.pausedTasks}${(task as any)._dsmStatus && (task as any)._dsmStatus!=="paused" ? ` (${(task as any)._dsmStatus})`: ""}`}
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{task.progress >= 0 ? `${task.progress}%` : "—"}</span>
                  </div>
                  {(task as any)._errorDetail && isError && <p className="text-[10px] text-rose-500 break-all leading-tight">{(task as any)._errorDetail}</p>}
                  {(task as any)._errorDetail && !isError && (task as any)._dsmStatus==="paused" && <p className="text-[10px] text-amber-500 break-all leading-tight">Lý do tạm dừng: {(task as any)._errorDetail}</p>}
                </div>
                {isDownloading && (
                  <div className="flex items-center gap-3 mb-3 text-[10px] font-mono">
                    <span className={`font-bold flex items-center gap-1 ${task.downloadSpeed>0?"text-emerald-500":"text-slate-400"}`}>
                      <ArrowDownCircle className={`w-3 h-3 ${task.downloadSpeed===0?"animate-spin":""}`} />
                      {task.downloadSpeed>0 ? formatSpeed(task.downloadSpeed) : "Đang kết nối..."}
                    </span>
                    {task.uploadSpeed > 0 && (<span className="text-amber-500 font-bold flex items-center gap-1"><ArrowUpCircle className="w-3 h-3" />{formatSpeed(task.uploadSpeed)}</span>)}
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>openDetail(task)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"><Eye className="w-3 h-3"/>Chi tiết</button>
                  {isFinished ? (
                    <button
                      onClick={() => {
                        const dest = task.destination || "/downloads";
                        const clean = dest.startsWith("/") ? dest : "/" + dest;
                        setFileStationPath(clean);
                        setActiveTab("files");
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors"
                      title="Mở thư mục trong File Station"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Mở vị trí</span>
                    </button>
                  ) : isDownloading ? (
                    <button onClick={() => handleAction(task.id, "pause")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-500 disabled:opacity-50"><Pause className="w-3 h-3" /><span>Tạm dừng</span></button>
                  ) : (
                    <button onClick={() => handleAction(task.id, "resume")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-500 disabled:opacity-50"><Play className="w-3 h-3" /><span>Tiếp tục</span></button>
                  )}
                  <button onClick={() => handleAction(task.id, "delete")} disabled={isLoading} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTasks.map((task) => {
            const isDownloading = task.status === "downloading" || task.status === "waiting";
            const isFinished = task.status === "finished";
            const isError = task.status === "error";
            const isLoading = actionLoadingId === task.id;
            const isSel = selectedIds.has(task.id);
            return (
              <div key={task.id} className={`p-3.5 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors space-y-2.5 ${isSel?"bg-sky-50/50 dark:bg-sky-900/10": isError?"bg-rose-50/30 dark:bg-rose-950/10":""}`}>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <input type="checkbox" checked={isSel} onChange={()=>toggleSelect(task.id)} className="rounded border-slate-300 text-sky-600 shrink-0"/>
                    <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${isError ? "bg-rose-500/10 text-rose-500" : isFinished ? "bg-emerald-500/10 text-emerald-500" : isDownloading ? "bg-sky-500/10 text-sky-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}><DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={()=>openDetail(task)}>
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate hover:text-sky-600" title={task.title}>{task.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{formatBytes(task.size)} • {task.type} • {task.destination || "/downloads"} • {task.uri?.slice(0,40) || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    {isFinished && (
                      <button
                        onClick={() => {
                          const dest = task.destination || "/downloads";
                          const clean = dest.startsWith("/") ? dest : "/" + dest;
                          setFileStationPath(clean);
                          setActiveTab("files");
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold text-xs flex items-center gap-1 transition-colors"
                        title="Mở thư mục trong File Station"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span className="hidden sm:inline">Mở vị trí</span>
                      </button>
                    )}
                    <button onClick={()=>openDetail(task)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800" title="Chi tiết"><Eye className="w-4 h-4" /></button>
                    {isDownloading ? (<button onClick={() => handleAction(task.id, "pause")} disabled={isLoading} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800"><Pause className="w-4 h-4" /></button>) : !isFinished ? (<button onClick={() => handleAction(task.id, "resume")} disabled={isLoading} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800"><Play className="w-4 h-4" /></button>) : null}
                    <button onClick={() => handleAction(task.id, "delete")} disabled={isLoading} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {isDownloading && (
                  <div className="flex items-center space-x-3 text-[11px] font-mono">
                    <span className={`font-bold flex items-center gap-1 ${task.downloadSpeed>0?"text-emerald-500":"text-slate-400"}`}>
                      <ArrowDownCircle className={`w-3 h-3 ${task.downloadSpeed===0?"animate-spin":""}`} />
                      {task.downloadSpeed>0 ? formatSpeed(task.downloadSpeed) : "Đang kết nối..."}
                    </span>
                    {task.uploadSpeed > 0 && (<span className="text-amber-500 font-bold flex items-center gap-1"><ArrowUpCircle className="w-3 h-3" />{formatSpeed(task.uploadSpeed)}</span>)}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    {task.progress >= 0 ? (
                      <div className={`h-full rounded-full transition-all duration-500 ${isError ? "bg-rose-500" : isFinished ? "bg-emerald-500" : isDownloading ? "bg-sky-500 animate-pulse" : "bg-slate-400"}`} style={{ width: `${task.progress}%` }} />
                    ) : (
                      <div className="h-full rounded-full bg-sky-500/30 animate-pulse" style={{ width: "100%" }} />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium">
                    <span className={`${isError?"text-rose-600":"text-slate-400"}`}>
                      {isError ? `Lỗi${(task as any)._errorDetail? `: ${(task as any)._errorDetail.slice(0,40)}`:""}` : isFinished ? t.download.completedTasks : isDownloading ? t.download.activeTasks : `${t.download.pausedTasks}${(task as any)._dsmStatus && (task as any)._dsmStatus!=="paused" ? ` (${(task as any)._dsmStatus})`:""}`}
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{task.progress >= 0 ? `${task.progress}%` : "—"}</span>
                  </div>
                  {(task as any)._errorDetail && <p className={`text-[10px] break-all leading-tight ${isError?"text-rose-500":"text-amber-500"}`}>{(task as any)._errorDetail}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {subTab==="btsearch" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <SearchCode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={btKeyword}
                onChange={e=>setBtKeyword(e.target.value)}
                onKeyDown={e=>e.key==="Enter" && handleBTStart()}
                placeholder="Tìm kiếm Torrent (VD: ubuntu, debian, fedora, arch, windows)..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-1 focus:ring-sky-500 font-medium"
              />
            </div>
            <select
              value={btModule}
              onChange={e=>setBtModule(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              {btModules.map(m=><option key={m.name} value={m.name}>{m.title}</option>)}
            </select>
            <select
              value={btCategory}
              onChange={e=>setBtCategory(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              <option value="">Tất cả thể loại</option>
              {btCategories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={btSortBy}
              onChange={e=>setBtSortBy(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              <option value="seeds">Sắp xếp: Seeds cao nhất</option>
              <option value="size">Sắp xếp: Dung lượng</option>
              <option value="date">Sắp xếp: Mới nhất</option>
            </select>
            <button
              onClick={handleBTStart}
              disabled={btLoading || !btKeyword.trim()}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
            >
              {btLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Search className="w-3.5 h-3.5"/>}
              <span>{btLoading ? "Đang tìm..." : "Tìm kiếm"}</span>
            </button>
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500"/>Gợi ý:</span>
            {["ubuntu", "debian", "fedora", "arch linux", "kali linux", "alpine"].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setBtKeyword(tag);
                  dsmClient.listBTSearch(`tag_${Date.now()}`, 0, 40, tag).then(res => {
                    setBtResults(res.items);
                    setBtTotal(res.total);
                    setBtFinished(true);
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {btResults.length > 0 && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-500">
              <span>Tìm thấy <strong className="text-slate-900 dark:text-white font-bold">{btResults.length}</strong> kết quả {btFinished ? "(Hoàn tất)" : "(Đang nạp thêm...)"}</span>
              <span className="text-[11px] text-slate-400">Nơi lưu mặc định: <code className="font-mono text-sky-600">{destination}</code></span>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-3 text-left">Tên Torrent / Tệp</th>
                  <th className="px-3 py-3 text-center">Kích thước</th>
                  <th className="px-3 py-3 text-center">Seeds / Peers</th>
                  <th className="px-3 py-3 text-center">Ngày tải lên</th>
                  <th className="px-3.5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {btResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      {btLoading ? (
                        <div className="space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500"/>
                          <p className="font-medium text-slate-600 dark:text-slate-300">Đang quét tìm kiếm Torrent từ các nguồn công khai...</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <SearchCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700"/>
                          <p>Nhập từ khóa và bấm <span className="font-bold text-sky-600">Tìm kiếm</span> hoặc chọn một từ khóa gợi ý phía trên.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  [...btResults]
                    .filter(r => !btCategory || r.category === btCategory)
                    .sort((a, b) => {
                      if (btSortBy === "seeds") return b.seednum - a.seednum;
                      if (btSortBy === "size") return b.size - a.size;
                      return (b.datetime || "").localeCompare(a.datetime || "");
                    })
                    .map((r, i) => {
                      const isDownloadingThis = downloadingBtIndex === i;
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-3.5 py-3 font-medium max-w-[320px] sm:max-w-md">
                            <div className="flex items-center gap-2">
                              <FileArchive className="w-4 h-4 text-amber-500 shrink-0"/>
                              <span className="truncate font-semibold text-slate-900 dark:text-slate-100" title={r.title}>{r.title}</span>
                            </div>
                            {r.category && <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">{r.category}</span>}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {formatBytes(r.size)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                              🟢 {r.seednum}
                            </span>
                            {r.leech > 0 && <span className="text-[10px] text-slate-400 ml-1 font-mono">/ {r.leech}</span>}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-400 text-[11px] font-mono whitespace-nowrap">
                            {r.datetime || "Gần đây"}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(r.download);
                                  setCopiedMagnet(r.title);
                                  setTimeout(() => setCopiedMagnet(null), 2000);
                                }}
                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                title="Sao chép Magnet / Link"
                              >
                                {copiedMagnet === r.title ? <Check className="w-3.5 h-3.5 text-emerald-500"/> : <Copy className="w-3.5 h-3.5"/>}
                              </button>
                              <button
                                disabled={isDownloadingThis}
                                onClick={async () => {
                                  setDownloadingBtIndex(i);
                                  try {
                                    const res: any = await dsmClient.addDownloadTask(r.download, destination);
                                    const ok = typeof res === "object" ? res.success : !!res;
                                    if (ok) {
                                      await loadTasks();
                                      setSubTab("tasks");
                                    } else {
                                      alert((res && res.error) || "Không thể tạo tác vụ tải");
                                    }
                                  } finally {
                                    setDownloadingBtIndex(null);
                                  }
                                }}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                              >
                                {isDownloadingThis ? <RefreshCw className="w-3 h-3 animate-spin"/> : <DownloadCloud className="w-3.5 h-3.5"/>}
                                <span>Tải ngay</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab==="rss" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex-1 min-w-[280px] flex items-center gap-2">
              <input
                value={newRssUrl}
                onChange={e=>setNewRssUrl(e.target.value)}
                placeholder="Dán link RSS Feed (VD: https://distrowatch.com/news/torrents.xml, https://yts.mx/rss)..."
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
              <button
                onClick={async () => {
                  if (newRssUrl.trim()) {
                    await dsmClient.createRSSSite(newRssUrl.trim());
                    setNewRssUrl("");
                    await loadRSS();
                  }
                }}
                disabled={!newRssUrl.trim()}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5"/>
                <span>Thêm RSS</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
                <input
                  value={rssSearch}
                  onChange={e=>setRssSearch(e.target.value)}
                  placeholder="Lọc tin RSS..."
                  className="pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-44"
                />
              </div>
              <button
                onClick={loadRSS}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Làm mới RSS"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rssLoading ? "animate-spin" : ""}`}/>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 min-h-[360px]">
            {/* Left Column: RSS Sites List */}
            <div className="p-3.5 space-y-2 max-h-[460px] overflow-y-auto">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kênh RSS Đã Đăng Ký ({rssSites.length})</span>
              </div>
              {rssSites.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs space-y-2">
                  <Rss className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700"/>
                  <p>Chưa có kênh RSS nào được thêm.</p>
                </div>
              ) : (
                rssSites.map(s => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedRssSite === s.id
                        ? "bg-sky-50/80 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700 shadow-sm"
                        : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300"
                    }`}
                    onClick={async () => {
                      setSelectedRssSite(s.id);
                      setRssLoading(true);
                      try {
                        const feeds = await dsmClient.getRSSFeeds(s.id, s.url);
                        setRssFeeds(feeds);
                      } finally {
                        setRssLoading(false);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.title || s.url}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">{s.url}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await dsmClient.refreshRSSSite(s.id);
                            const feeds = await dsmClient.getRSSFeeds(s.id, s.url);
                            setRssFeeds(feeds);
                          }}
                          className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-sky-600"
                          title="Làm mới kênh"
                        >
                          <RefreshCw className="w-3 h-3"/>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Xóa kênh RSS "${s.title || s.url}"?`)) {
                              await dsmClient.deleteRSSSite(s.id);
                              await loadRSS();
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                          title="Xóa kênh"
                        >
                          <Trash2 className="w-3 h-3"/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Column: RSS Feeds Articles */}
            <div className="md:col-span-2 p-3.5 space-y-2 max-h-[460px] overflow-y-auto">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Danh Sách Mục Tải ({rssFeeds.length})
                </span>
                <span className="text-[11px] text-slate-400">Đích: <code className="font-mono text-sky-600">{destination}</code></span>
              </div>
              {rssLoading ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500"/>
                  <p className="text-xs text-slate-400">Đang tải danh sách bài đăng RSS...</p>
                </div>
              ) : rssFeeds.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-1">
                  <p>Chọn một kênh RSS bên trái hoặc thêm kênh mới để duyệt các tệp tải về tự động.</p>
                </div>
              ) : (
                rssFeeds
                  .filter(f => !rssSearch || f.title.toLowerCase().includes(rssSearch.toLowerCase()))
                  .map(f => (
                    <div
                      key={f.id}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={f.title}>{f.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          {f.publish_date && <span>{f.publish_date}</span>}
                          {f.size && f.size > 0 && <span className="font-mono font-semibold">• {formatBytes(f.size)}</span>}
                          {f.description && <span className="truncate max-w-[200px] hidden sm:inline">• {f.description}</span>}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (f.url) {
                            const r: any = await dsmClient.addDownloadTask(f.url, destination);
                            const ok = typeof r === "object" ? r.success : !!r;
                            if (ok) {
                              await loadTasks();
                              setSubTab("tasks");
                            } else {
                              alert((r && r.error) || "Không thể tạo tác vụ tải");
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
                      >
                        <DownloadCloud className="w-3.5 h-3.5"/>
                        <span>Tải về</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {subTab==="hosts" && (
        <div className="space-y-4">
          {/* Top Quick Link Resolver Card */}
          <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-400"/>
              <h3 className="font-bold text-sm">Chuyển Đổi &amp; Tải Trực Tiếp Link Google Drive / Fshare.vn</h3>
            </div>
            <p className="text-xs text-sky-200/80 mb-3 leading-relaxed">
              Tự động giải mã đường link chia sẻ từ <b>Google Drive</b>, <b>Fshare.vn VIP/Free</b>, <b>MediaFire</b>, <b>Mega</b> và gửi trực tiếp vào Download Station với tốc độ tối đa.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={hostLinkInput}
                onChange={e=>setHostLinkInput(e.target.value)}
                placeholder="Dán link: https://drive.google.com/file/d/... hoặc https://www.fshare.vn/file/..."
                className="flex-1 px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono"
              />
              <button
                disabled={hostResolving || !hostLinkInput.trim()}
                onClick={async () => {
                  setHostResolving(true);
                  try {
                    const resolved = await dsmClient.resolveDownloadLink(hostLinkInput.trim());
                    setHostResolvedResult(resolved);
                    if (resolved.directUrl) {
                      const res: any = await dsmClient.addDownloadTask(resolved.directUrl, destination);
                      const ok = typeof res === "object" ? res.success : !!res;
                      if (ok) {
                        setHostLinkInput("");
                        await loadTasks();
                        setSubTab("tasks");
                      }
                    }
                  } finally {
                    setHostResolving(false);
                  }
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 shadow transition-all cursor-pointer"
              >
                {hostResolving ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <DownloadCloud className="w-3.5 h-3.5"/>}
                <span>{hostResolving ? "Đang xử lý..." : "Giải mã & Tải ngay"}</span>
              </button>
            </div>
          </div>

          {/* Supported File Hosting Plugins Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-500"/>
                  Danh Sách Host Plugin Hỗ Trợ trong Download Station
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Tích hợp sẵn bộ giải mã máy chủ lưu trữ (File Hosting Modules)</p>
              </div>
              <button
                onClick={loadHostModules}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Tải lại danh sách Hosts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${hostLoading ? "animate-spin" : ""}`}/>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hostModules.map(h => (
                <div
                  key={h.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{h.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">v{h.version || "1.0"} • {h.host_type === "free" ? "Miễn phí" : h.host_type === "premium" ? "Tài khoản VIP" : "Đa năng"}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.enabled ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-200 text-slate-500"}`}>
                      {h.enabled ? "Hoạt động" : "Tắt"}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <p className="truncate">Miền: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{(h.supportedUrls || []).join(", ") || h.id}</span></p>
                    {h.accounts && h.accounts.length > 0 && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5"/>Đã kết nối tài khoản ({h.accounts[0].username})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={async (e) => {
                          const updated = e.target.checked;
                          await dsmClient.setHostModule(h.id, updated);
                          await loadHostModules();
                        }}
                        className="rounded border-slate-300 text-sky-600 w-3.5 h-3.5"
                      />
                      <span>Bật plugin</span>
                    </label>

                    {h.has_account && (
                      <button
                        onClick={() => {
                          setSelectedHostId(h.id);
                          setSettingsTab("hosts");
                          setSettingsOpen(true);
                        }}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3"/>
                        <span>Tài khoản VIP</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && detailTask && (() => {
        const isDetailDownloading = detailTask.status === "downloading" || detailTask.status === "waiting";
        const isDetailFinished = detailTask.status === "finished";
        const isDetailError = detailTask.status === "error";
        const downloadedBytes = (detailTask.transfer?.size_downloaded) || (detailTask.size > 0 && detailTask.progress >= 0 ? Math.floor(detailTask.size * detailTask.progress / 100) : 0);
        const createdDisplay = detailTask.createdTime ? new Date(detailTask.createdTime > 1e11 ? detailTask.createdTime : detailTask.createdTime * 1000).toLocaleString("vi-VN") : "—";
        const filesList = (detailTask.file && detailTask.file.length > 0)
          ? detailTask.file
          : (detailTask.title ? [{ filename: detailTask.title, size: detailTask.size, downloaded: downloadedBytes, index: 0 }] : []);

        return (
          <ResponsiveModal open={detailOpen} onClose={()=>setDetailOpen(false)} maxWidth="2xl" title={detailTask.title} icon={<DownloadCloud className="w-5 h-5"/>}>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  isDetailFinished ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                  isDetailDownloading ? "bg-sky-500/10 text-sky-600 border-sky-500/20 animate-pulse" :
                  isDetailError ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                  "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}>
                  {detailTask.status === "downloading" ? "Đang tải xuống" :
                   detailTask.status === "waiting" ? "Đang chờ" :
                   detailTask.status === "finished" ? "Hoàn thành" :
                   detailTask.status === "error" ? "Lỗi" :
                   "Đã tạm dừng"}
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">{detailTask.type}</span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">{formatBytes(detailTask.size)}</span>
                <button onClick={async()=>{const b=await dsmClient.getDownloadTaskSource(detailTask.id); if(b){const url=URL.createObjectURL(b); const a=document.createElement("a"); a.href=url; a.download=detailTask.title+".torrent"; a.click();}}} className="ml-auto text-[11px] text-sky-600 hover:underline flex items-center gap-1"><FileArchive className="w-3 h-3"/>Tải .torrent</button>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                {detailTask.progress >= 0 ? (
                  <div className={`h-full transition-all duration-300 ${
                    isDetailError ? "bg-rose-500" :
                    isDetailFinished ? "bg-emerald-500" :
                    isDetailDownloading ? "bg-sky-500 animate-pulse" :
                    "bg-slate-400"
                  }`} style={{width:`${detailTask.progress}%`}} />
                ) : (
                  <div className="h-full bg-sky-500/30 animate-pulse" style={{width: "100%"}} />
                )}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{detailTask.progress >= 0 ? `${detailTask.progress}%` : "—"}</span>
                <span className="font-mono flex gap-3">
                  <span className={detailTask.downloadSpeed > 0 ? "text-emerald-600 font-bold" : "text-slate-400"}>↓ {formatSpeed(detailTask.downloadSpeed)}</span>
                  {detailTask.uploadSpeed > 0 && <span className="text-amber-600 font-bold">↑ {formatSpeed(detailTask.uploadSpeed)}</span>}
                </span>
              </div>

              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit text-xs font-bold">
                {(["overview","files","trackers","peers"] as const).map(tab=><button key={tab} onClick={()=>setDetailTab(tab)} className={`px-3 py-1 rounded-lg capitalize ${detailTab===tab?"bg-white dark:bg-slate-700 shadow-sm text-sky-600":"text-slate-500"}`}>{tab}</button>)}
              </div>

              {detailLoading ? <div className="py-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-500"/><p className="text-xs text-slate-400 mt-2">Đang tải chi tiết...</p></div> : (
                <>
                  {detailTab==="overview" && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60">
                          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Link className="w-3 h-3 text-sky-500"/>URI</p>
                          <p className="font-mono break-all text-slate-700 dark:text-slate-300 mt-1">{detailTask.uri || detailTask.additional?.detail?.uri || "—"}</p>
                          <button onClick={()=>navigator.clipboard.writeText(detailTask.uri||"")} className="mt-2 text-[11px] text-sky-600 flex items-center gap-1"><Copy className="w-3 h-3"/>Sao chép</button>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Folder className="w-3 h-3 text-sky-500"/>Thư mục đích</p>
                            <button
                              onClick={() => {
                                const dest = detailTask.destination || detailTask.additional?.detail?.destination || "/downloads";
                                const cleanDest = dest.startsWith("/") ? dest : "/" + dest;
                                setDetailOpen(false);
                                setFileStationPath(cleanDest);
                                setActiveTab("files");
                              }}
                              className="text-[11px] text-sky-600 hover:text-sky-700 dark:text-sky-400 font-semibold flex items-center gap-1"
                              title="Mở thư mục này trong File Station"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                              <span>Mở vị trí</span>
                            </button>
                          </div>
                          <p className="font-medium mt-1 truncate">{detailTask.destination || detailTask.additional?.detail?.destination || "/downloads"}</p>
                          <div className="mt-2 flex gap-2" ref={editPickerRef}>
                            <input value={editDest} onChange={e=>setEditDest(e.target.value)} onFocus={()=>{setShowEditPicker(true); loadFolderContents(editDest || "/");}} className="flex-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"/>
                            <button onClick={handleEditDest} className="px-3 py-1 bg-sky-600 text-white rounded-xl text-xs font-bold">Đổi</button>
                          </div>
                          {showEditPicker && (
                            <div className="absolute z-50 w-full bottom-full mb-1.5 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[min(40vh,240px)] flex flex-col bg-white dark:bg-slate-800 shadow-lg animate-in fade-in zoom-in-95">
                              <div className="p-2 bg-slate-50 dark:bg-slate-900 flex gap-1 overflow-x-auto border-b text-[11px]"><button onClick={()=>loadFolderContents("/")} className="px-2 py-1 rounded-lg hover:bg-white flex items-center gap-1"><Home className="w-3 h-3"/>Gốc</button>{currentPath!=="/"&& currentPath.split("/").filter(Boolean).map((seg,i,arr)=>{const pth="/"+arr.slice(0,i+1).join("/"); return <span key={pth} className="flex items-center gap-1"><ChevronRight className="w-3 h-3 text-slate-400"/><button onClick={()=>loadFolderContents(pth)} className="px-2 py-1 rounded-lg hover:bg-white">{seg}</button></span>})}</div>
                              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">{folderContents.filter(f=>f.isdir).map(f=><button key={f.path} onClick={()=>{setEditDest(f.path); loadFolderContents(f.path);}} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs flex items-center gap-2"><Folder className="w-3.5 h-3.5 text-amber-500"/>{f.name}</button>)}{folderContents.filter(f=>f.isdir).length===0&&<p className="p-3 text-center text-xs text-slate-400">Không có thư mục con</p>}</div>
                              <button onClick={()=>{setEditDest(currentPath); setShowEditPicker(false);}} className="w-full py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 text-xs font-bold border-t">Dùng {currentPath}</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border"><p className="text-[11px] text-slate-500">Kích thước</p><p className="font-bold font-mono">{formatBytes(detailTask.size)}</p></div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border"><p className="text-[11px] text-slate-500">Đã tải</p><p className="font-bold font-mono">{formatBytes(downloadedBytes)}</p></div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border"><p className="text-[11px] text-slate-500">Tạo lúc</p><p className="font-bold">{createdDisplay}</p></div>
                      </div>
                      <div className="flex gap-2">
                        {isDetailFinished ? (
                          <button
                            onClick={() => {
                              const dest = detailTask.destination || detailTask.additional?.detail?.destination || "/downloads";
                              const cleanDest = dest.startsWith("/") ? dest : "/" + dest;
                              setDetailOpen(false);
                              setFileStationPath(cleanDest);
                              setActiveTab("files");
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Mở trong File Station</span>
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              const nextAction = isDetailDownloading ? "pause" : "resume";
                              setDetailTask(prev => prev ? { ...prev, status: nextAction === "pause" ? "paused" : "downloading" } : null);
                              await handleAction(detailTask.id, nextAction);
                            }}
                            className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors ${
                              isDetailDownloading ? "bg-amber-500 hover:bg-amber-600" : "bg-sky-600 hover:bg-sky-500"
                            }`}
                          >
                            {isDetailDownloading ? <Pause className="w-3.5 h-3.5"/> : <Play className="w-3.5 h-3.5"/>}
                            <span>{isDetailDownloading ? "Tạm dừng" : "Tiếp tục"}</span>
                          </button>
                        )}
                        <button onClick={async()=>{if(confirm("Xóa tác vụ tải này?")){await handleAction(detailTask.id,"delete"); setDetailOpen(false);}}} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"><Trash2 className="w-3.5 h-3.5"/>Xóa</button>
                      </div>
                    </div>
                  )}
                  {detailTab==="files" && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filesList.length > 0 ? filesList.map((f: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center text-xs">
                          <span className="truncate font-medium" title={f.filename}>{f.filename}</span>
                          <span className="font-mono text-slate-500 shrink-0 ml-2">{formatBytes(f.size)} {f.downloaded ? `• ${formatBytes(f.downloaded)}` : ""}</span>
                        </div>
                      )) : <p className="text-xs text-slate-400 py-6 text-center">Không có thông tin file</p>}
                    </div>
                  )}
                  {detailTab==="trackers" && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(detailTask.tracker && detailTask.tracker.length>0) ? detailTask.tracker.map((tr,i)=><div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"><p className="font-mono truncate" title={tr.url}>{tr.url}</p><p className="text-[11px] text-slate-500">{tr.status} • seeds:{tr.seeds} peers:{tr.peers}</p></div>) : <p className="text-xs text-slate-400 py-6 text-center">Không có tracker</p>}
                    </div>
                  )}
                  {detailTab==="peers" && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(detailTask.peer && detailTask.peer.length>0) ? detailTask.peer.map((pe,i)=><div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs flex justify-between"><span className="font-mono">{pe.address}</span><span className="text-slate-500">{pe.progress}% • {pe.agent}</span></div>) : <p className="text-xs text-slate-400 py-6 text-center">Không có peer</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          </ResponsiveModal>
        );
      })()}

      {/* Settings Modal — Compact Tabbed Re-layout */}
      {settingsOpen && (
        <ResponsiveModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} maxWidth="lg" title="Cài đặt Download Station" icon={<Settings2 className="w-5 h-5"/>}>
          <div className="space-y-3">
            {/* Modal Internal Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit text-xs font-bold">
              <button onClick={()=>setSettingsTab("speed")} className={`px-3.5 py-1.5 rounded-lg transition-all ${settingsTab==="speed"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}>Giới hạn tốc độ</button>
              <button onClick={()=>setSettingsTab("dest")} className={`px-3.5 py-1.5 rounded-lg transition-all ${settingsTab==="dest"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}>Nơi lưu &amp; Tùy chọn</button>
              <button onClick={()=>setSettingsTab("hosts")} className={`px-3.5 py-1.5 rounded-lg transition-all ${settingsTab==="hosts"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}>File Hosting</button>
              <button onClick={()=>setSettingsTab("btmodules")} className={`px-3.5 py-1.5 rounded-lg transition-all ${settingsTab==="btmodules"?"bg-white dark:bg-slate-700 text-sky-600 shadow-sm":"text-slate-500"}`}>Công cụ BT</button>
            </div>

            {!dsConfig ? (
              <div className="py-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-500"/><p className="text-xs text-slate-400 mt-2">Đang tải cấu hình...</p></div>
            ) : (
              <>
                {settingsTab === "speed" && (
                  <div className="space-y-2.5">
                    <div className="flex gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-[11px] items-center text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0"/>
                      <span><span className="font-bold">0 = Không giới hạn (nhanh nhất)</span>. Giá trị &lt; 1024 KB/s sẽ bóp băng thông.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {key:"bt_max_download", label:"BT Download", icon: DownloadCloud},
                        {key:"bt_max_upload", label:"BT Upload", icon: Upload},
                        {key:"http_max_download", label:"HTTP", icon: Globe},
                        {key:"ftp_max_download", label:"FTP", icon: HardDrive},
                        {key:"nzb_max_download", label:"NZB", icon: Layers},
                        {key:"emule_max_download", label:"eMule", icon: Users},
                      ].map(field => {
                        const Icon = field.icon;
                        const val = (dsConfig as any)[field.key] as number;
                        const isUnlimited = val === 0;
                        return (
                          <div key={field.key} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sky-500"><Icon className="w-3.5 h-3.5"/></div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{field.label}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{isUnlimited ? "∞ Không giới hạn" : `${(val/1024).toFixed(val>=1024?1:2)} MB/s`}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={e=>setDsConfig({...dsConfig, [field.key]: Number(e.target.value)})}
                                className="w-16 px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right"
                              />
                              <button
                                type="button"
                                onClick={()=>setDsConfig({...dsConfig, [field.key]: 0})}
                                className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${isUnlimited?"bg-emerald-500 text-white border-emerald-500":"bg-white dark:bg-slate-800 text-slate-500 border-slate-200"}`}
                                title="Đặt không giới hạn"
                              >
                                ∞
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-400">Thiết lập nhanh:</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={()=>setDsConfig({...dsConfig, bt_max_download:0, bt_max_upload:0, http_max_download:0, ftp_max_download:0, nzb_max_download:0, emule_max_download:0} as any)} className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold">Tất cả 0 (Tối đa)</button>
                        <button type="button" onClick={()=>setDsConfig({...dsConfig, bt_max_download:5120, bt_max_upload:2048, http_max_download:5120, ftp_max_download:5120, nzb_max_download:5120, emule_max_download:5120} as any)} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 text-[11px] font-bold">5 MB/s</button>
                        <button type="button" onClick={()=>setDsConfig({...dsConfig, bt_max_download:10240, bt_max_upload:5120, http_max_download:10240, ftp_max_download:10240, nzb_max_download:10240, emule_max_download:10240} as any)} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 text-[11px] font-bold">10 MB/s</button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "dest" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Folder className="w-3.5 h-3.5 text-sky-500"/>Thư mục lưu trữ mặc định
                      </label>
                      <div className="relative" ref={defaultFolderPickerRef}>
                        <button
                          type="button"
                          onClick={()=>{ setShowDefaultPicker(v=>!v); if(!showDefaultPicker){ loadFolderContents(dsConfig.default_destination || "/downloads"); } }}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-left flex items-center justify-between font-mono font-medium"
                        >
                          <span className="flex items-center gap-2 truncate"><FolderOpen className="w-3.5 h-3.5 text-sky-500 shrink-0"/><span className="truncate">{dsConfig.default_destination || "/downloads"}</span></span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${showDefaultPicker?"rotate-180":""}`}/>
                        </button>
                        {showDefaultPicker && (
                          <div className="absolute z-50 w-full bottom-full mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden flex flex-col max-h-48">
                            <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b flex items-center justify-between text-xs">
                              <span className="font-mono truncate">{currentPath}</span>
                              <button type="button" onClick={()=>{ setDsConfig({...dsConfig, default_destination: currentPath, emule_default_destination: currentPath}); setShowDefaultPicker(false); }} className="px-2 py-0.5 bg-sky-600 text-white rounded-lg font-bold text-[11px]">Chọn</button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                              {folderContents.filter(f=>f.isdir).map(f=>(
                                <button key={f.path} type="button" onClick={()=>loadFolderContents(f.path)} className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                                  <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0"/>
                                  <span className="truncate">{f.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${dsConfig.unzip_service_enabled?"bg-sky-50 dark:bg-sky-950/20 border-sky-200":"bg-slate-50 dark:bg-slate-800 border-slate-200"}`}>
                        <input type="checkbox" checked={!!dsConfig.unzip_service_enabled} onChange={e=>setDsConfig({...dsConfig, unzip_service_enabled: e.target.checked})} className="rounded text-sky-600 w-3.5 h-3.5"/>
                        <span className="text-xs font-bold">Tự động giải nén ZIP/RAR</span>
                      </label>
                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${dsConfig.emule_enabled?"bg-sky-50 dark:bg-sky-950/20 border-sky-200":"bg-slate-50 dark:bg-slate-800 border-slate-200"}`}>
                        <input type="checkbox" checked={!!dsConfig.emule_enabled} onChange={e=>setDsConfig({...dsConfig, emule_enabled: e.target.checked})} className="rounded text-sky-600 w-3.5 h-3.5"/>
                        <span className="text-xs font-bold">Kích hoạt eMule</span>
                      </label>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${schedule?.enabled?"bg-amber-50 dark:bg-amber-950/20 border-amber-200":"bg-slate-50 dark:bg-slate-800 border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500"/>
                        <div>
                          <p className="text-xs font-bold">Lịch trình biểu tải về</p>
                          <p className="text-[10px] text-slate-400">{schedule?.enabled ? "Đang bật" : "Tắt — luôn tải tốc độ tối đa"}</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={!!schedule?.enabled} onChange={e=>setSchedule({enabled: e.target.checked, emule_enabled: schedule?.emule_enabled || false})} className="rounded text-sky-600 w-4 h-4"/>
                    </div>
                  </div>
                )}

                {settingsTab === "hosts" && (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                        <KeyRound className="w-3.5 h-3.5 text-amber-500"/>
                        Thêm Tài Khoản VIP (Fshare.vn, Rapidgator, 1fichier...)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={selectedHostId || "fshare"}
                          onChange={e=>setSelectedHostId(e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-semibold"
                        >
                          {hostModules.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                        <input
                          value={newHostUsername}
                          onChange={e=>setNewHostUsername(e.target.value)}
                          placeholder="Tài khoản / Email"
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs"
                        />
                        <input
                          type="password"
                          value={newHostPassword}
                          onChange={e=>setNewHostPassword(e.target.value)}
                          placeholder="Mật khẩu"
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!newHostUsername.trim()}
                        onClick={async () => {
                          const hostId = selectedHostId || "fshare";
                          await dsmClient.addHostAccount(hostId, newHostUsername.trim(), newHostPassword);
                          setNewHostUsername("");
                          setNewHostPassword("");
                          await loadHostModules();
                        }}
                        className="px-3 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        Lưu tài khoản
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {hostModules.map(h => (
                        <div key={h.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold">{h.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">{h.supportedUrls?.join(", ")}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
                            {h.enabled ? "Bật" : "Tắt"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === "btmodules" && (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    <p className="text-xs text-slate-400">Các công cụ tìm kiếm Torrent đang tích hợp trong Download Station:</p>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {btModules.map(m => (
                        <div key={m.name} className="py-2 flex items-center justify-between text-xs">
                          <span className="font-bold">{m.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">Sẵn sàng</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={()=>setSettingsOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-xs">Hủy</button>
                  <button
                    onClick={async () => {
                      if (dsConfig) {
                        await dsmClient.setDownloadStationConfig({
                          ...dsConfig,
                          default_destination: dsConfig.default_destination,
                          emule_default_destination: dsConfig.default_destination
                        });
                        try {
                          sessionStorage.setItem("dsm:download:lastDestination", dsConfig.default_destination);
                        } catch (_) {}
                        setDestination(dsConfig.default_destination);
                      }
                      if (schedule) {
                        await dsmClient.setDownloadStationSchedule(schedule.enabled, schedule.emule_enabled);
                      }
                      setSettingsOpen(false);
                      await loadDSConfig();
                      await loadStatistic();
                    }}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm text-xs cursor-pointer"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </>
            )}
          </div>
        </ResponsiveModal>
      )}

      {/* Add Download Task Modal — Theme Matched + File tab */}
      {addTaskModalOpen && (
        <ResponsiveModal
          open={addTaskModalOpen}
          onClose={() => {
            setAddTaskModalOpen(false);
            setShowFolderPicker(false);
          }}
          maxWidth="lg"
          title={t.download.addTask}
          icon={<DownloadCloud className="w-5 h-5" />}
        >
          <form onSubmit={handleAddTask} className="space-y-4">
            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 flex gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-rose-900 dark:text-rose-300">Không thể tạo tác vụ {addError.includes("code 102") ? "(code 102)" : ""}</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300/80 break-words leading-relaxed whitespace-pre-wrap">{addError}</p>
                  <p className="text-[10px] text-slate-500 font-mono break-all">URI: {(urlInput.split("\n")[0] || "").slice(0,80)}... | Đích: {destination}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={handleRetryWithoutDest} className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-rose-200 dark:border-rose-800 text-[11px] font-bold hover:bg-rose-50">Thử lại không chỉ định thư mục</button>
                    <button type="button" onClick={handleCheckDSM} className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border text-[11px] font-bold hover:bg-slate-50">Kiểm tra DSM</button>
                    {duplicateId && (
                      <button type="button" onClick={async()=>{ setAddTaskModalOpen(false); setAddError(null); await handleAction(duplicateId,"resume"); }} className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500 flex items-center gap-1"><Play className="w-3 h-3"/>Tiếp tục tác vụ đang tạm dừng</button>
                    )}
                    {(addError.includes("fbdownload") || addError.includes("FileStation")) && <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 w-full">Gợi ý: Mở <span className="font-bold">File Station</span> → Tải về trực tiếp, hoặc dán link gốc http/magnet.</span>}
                  </div>
                </div>
                <button type="button" onClick={()=>setAddError(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg shrink-0"><X className="w-3.5 h-3.5 text-rose-600"/></button>
              </div>
            )}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit text-xs font-bold">
              <button type="button" onClick={()=>setAddTab("url")} className={`px-4 py-1.5 rounded-lg flex items-center gap-1 ${addTab==="url"?"bg-white dark:bg-slate-700 shadow-sm text-sky-600":"text-slate-500"}`}><Link className="w-3.5 h-3.5"/>URL / Magnet</button>
              <button type="button" onClick={()=>setAddTab("file")} className={`px-4 py-1.5 rounded-lg flex items-center gap-1 ${addTab==="file"?"bg-white dark:bg-slate-700 shadow-sm text-sky-600":"text-slate-500"}`}><FileArchive className="w-3.5 h-3.5"/>Torrent File</button>
            </div>

            {addTab==="url" ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Link className="w-3.5 h-3.5 text-sky-500" />
                  Liên kết tải (URL / Magnet Link)
                </label>
                <button type="button" onClick={()=>setUrlInput("https://cdimage.debian.org/debian-cd/12.5.0/amd64/iso-cd/debian-12.5.0-amd64-netinst.iso")} className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 hover:text-sky-600 text-slate-500 font-bold border border-slate-200 dark:border-slate-600">Dán link mẫu HTTP</button>
              </div>
              <div className="relative">
                <textarea
                  required={addTab==="url"}
                  rows={3}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={t.download.urlPlaceholder}
                  className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono resize-y"
                />
                {urlInput ? (
                  <button type="button" onClick={() => setUrlInput("")} className="absolute right-2 top-2 p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm transition-colors" title="Xóa"><X className="w-3.5 h-3.5" /></button>
                ) : (
                  <button type="button" onClick={async () => { try { const txt = await navigator.clipboard.readText(); if (txt) setUrlInput(txt); } catch (_) {} }} className="absolute right-2 top-2 p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 shadow-sm transition-colors" title="Dán từ clipboard"><ClipboardPaste className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 px-1">Hỗ trợ HTTP/HTTPS, FTP, Magnet. Mỗi dòng một liên kết.</p>
            </div>
            ) : (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><FileArchive className="w-3.5 h-3.5 text-sky-500"/>Chọn tệp .torrent</label>
                <div onClick={()=>fileInputRef.current?.click()} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2"/>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedFile? selectedFile.name : "Nhấn để chọn hoặc kéo thả .torrent vào đây"}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{selectedFile? formatBytes(selectedFile.size) : "Hỗ trợ .torrent"}</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".torrent" className="hidden" onChange={e=>{if(e.target.files?.[0]) setSelectedFile(e.target.files[0]);}}/>
                {selectedFile && <button type="button" onClick={()=>setSelectedFile(null)} className="text-[11px] text-rose-500 hover:underline">Xóa tệp đã chọn</button>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><Folder className="w-3.5 h-3.5 text-sky-500" />Thư mục đích</label>
              <div className="relative" ref={folderPickerRef}>
                <button type="button" onClick={() => setShowFolderPicker((v) => !v)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-left text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 flex items-center justify-between transition-colors hover:border-slate-300 dark:hover:border-slate-600">
                  <div className="flex items-center gap-2 overflow-hidden"><FolderOpen className="w-4 h-4 text-sky-500 shrink-0" /><span className="truncate font-medium">{destination}</span></div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showFolderPicker ? "rotate-180" : ""}`} />
                </button>
                {showFolderPicker && (
                  <div className="absolute z-50 w-full bottom-full mb-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[min(50vh,320px)]">
                    <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <button type="button" onClick={async () => await loadFolderContents("/")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 transition-colors ${currentPath === "/" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"}`}><Home className="w-3.5 h-3.5" />Gốc</button>
                      {currentPath !== "/" && currentPath.split("/").filter(Boolean).map((seg, idx, arr) => { const path = "/" + arr.slice(0, idx + 1).join("/"); const isLast = idx === arr.length - 1; return (<div key={path} className="flex items-center gap-1 shrink-0"><ChevronRight className="w-3 h-3 text-slate-400 shrink-0" /><button type="button" onClick={async () => await loadFolderContents(path)} className={`px-2.5 py-1 rounded-xl text-xs font-medium truncate max-w-[110px] transition-colors ${isLast ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"}`} title={path}>{seg}</button></div>); })}
                      {currentPath !== "/" && (<button type="button" onClick={goBack} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shrink-0 transition-colors"><ArrowLeft className="w-3 h-3" />Lùi</button>)}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 truncate"><Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate font-mono text-[11px]">{currentPath}</span></span>
                      <button type="button" onClick={() => { setDestination(currentPath); saveDefaultDestination(currentPath); setShowFolderPicker(false); }} disabled={destination === currentPath} className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${destination === currentPath ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-default" : "bg-sky-600 hover:bg-sky-500 text-white shadow-sm"}`}>{destination === currentPath ? "Đã chọn" : "Dùng thư mục này"}</button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto max-h-64">
                      {folderLoading ? (<div className="p-6 text-center"><div className="inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div><p className="text-xs text-slate-400 mt-2">Đang tải...</p></div>) : folderContents.filter((f) => f.isdir).length === 0 ? (<div className="py-8 text-center"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-2"><FolderOpen className="w-5 h-5 text-slate-400" /></div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Không có thư mục con</p><p className="text-[11px] text-slate-400 mt-1">Thư mục này trống</p></div>) : (<div className="divide-y divide-slate-100 dark:divide-slate-700">{folderContents.filter((f) => f.isdir).map((folder) => { const isSelected = destination === folder.path; return (<button key={folder.path} type="button" onClick={() => loadFolderContents(folder.path)} className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors ${isSelected ? "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold" : "text-slate-700 dark:text-slate-300"}`}><div className="flex items-center gap-2 overflow-hidden"><Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-sky-500 fill-sky-500/20" : "text-amber-500"}`} /><span className="truncate">{folder.name}</span></div><div className="flex items-center gap-1 shrink-0"><ChevronRight className="w-3 h-3 text-slate-400" />{isSelected && <CheckCircle2 className="w-4 h-4 text-sky-500" />}</div></button>); })}</div>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => { setAddTaskModalOpen(false); setShowFolderPicker(false); }} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{t.common.cancel}</button>
              <button type="submit" disabled={submitting || (addTab==="url"? !urlInput.trim() : !selectedFile)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">{submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}<span>{submitting ? "Đang gửi..." : t.common.confirm}</span></button>
            </div>
          </form>
        </ResponsiveModal>
      )}
    </div>
  );
};
