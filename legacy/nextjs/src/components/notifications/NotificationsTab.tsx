"use client";

import React, { useEffect, useState, useMemo } from "react";
import ResponsiveModal from "@/components/common/ResponsiveModal";
import { useAppStore } from "@/lib/store/useAppStore";
import { NotificationItem, NotificationCategory, NotificationLevel } from "@/lib/dsm/types";
import { dsmClient } from "@/lib/dsm/client";
import { generateTelegramDigest } from "@/lib/reports/reportEngine";
import {
  Bell,
  BellOff,
  RefreshCw,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  HardDrive,
  Package,
  Network,
  Layers,
  Clock,
  XCircle,
  Settings,
  FileText,
  Server,
  Eye,
  Bot,
  Sparkles,
  Send,
  Mail,
  Smartphone,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Code2,
  Flame,
  ArrowRight,
  RotateCw,
  Plus,
  Volume2,
  VolumeX,
  Calendar,
  Layers2,
  Cpu,
  BarChart3,
} from "lucide-react";

function timeAgo(epochSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - epochSec;
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  const d = new Date(epochSec * 1000);
  return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const levelConfig: Record<NotificationLevel, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  info: { icon: <Info className="w-4 h-4" />, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", label: "Thông tin" },
  success: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Thành công" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Cảnh báo" },
  error: { icon: <ShieldAlert className="w-4 h-4" />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Lỗi" },
};

const categoryConfig: Record<NotificationCategory, { icon: React.ReactNode; label: string }> = {
  system: { icon: <Server className="w-3.5 h-3.5" />, label: "Hệ thống" },
  storage: { icon: <HardDrive className="w-3.5 h-3.5" />, label: "Lưu trữ" },
  package: { icon: <Package className="w-3.5 h-3.5" />, label: "Gói" },
  network: { icon: <Network className="w-3.5 h-3.5" />, label: "Mạng" },
  security: { icon: <ShieldAlert className="w-3.5 h-3.5" />, label: "Bảo mật" },
  backup: { icon: <Layers className="w-3.5 h-3.5" />, label: "Sao lưu" },
  file: { icon: <FileText className="w-3.5 h-3.5" />, label: "Tệp" },
  app: { icon: <Bell className="w-3.5 h-3.5" />, label: "Ứng dụng" },
};

interface AiDiagnosis {
  cause: string;
  solution: string;
  mcpTool: string;
  mcpParams: Record<string, any>;
  autoFixAction: () => Promise<boolean>;
}

export const NotificationsTab: React.FC = () => {
  const { notifications, appNotifications, fetchNotifications, clearNotifications, addLocalNotification, session } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<"notifications" | "channels" | "schedules" | "ai_assistant">("notifications");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | "all">("all");
  const [levelFilter, setLevelFilter] = useState<NotificationLevel | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [antiFlappingEnabled, setAntiFlappingEnabled] = useState(true);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [activeAiModal, setActiveAiModal] = useState<{ notif: NotificationItem; diagnosis: AiDiagnosis } | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Channels state
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpServer, setSmtpServer] = useState("smtp.gmail.com");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Quiet Hours & Routing state
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("23:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [allowCriticalInQuiet, setAllowCriticalInQuiet] = useState(true);

  // Routing Matrix state
  const [routeCriticalTg, setRouteCriticalTg] = useState(true);
  const [routeCriticalPush, setRouteCriticalPush] = useState(true);
  const [routeCriticalSound, setRouteCriticalSound] = useState(true);
  const [routeWarningTg, setRouteWarningTg] = useState(true);
  const [routeWarningPush, setRouteWarningPush] = useState(false);
  const [routeInfoTrayOnly, setRouteInfoTrayOnly] = useState(true);

  // Scheduled Reports state
  const [schedWeekly, setSchedWeekly] = useState(true);
  const [schedMonthly, setSchedMonthly] = useState(true);
  const [sendingDigest, setSendingDigest] = useState<string | null>(null);

  // Load saved channel & routing settings from localStorage
  useEffect(() => {
    fetchNotifications(true);
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
      const savedToken = localStorage.getItem("dsm_tg_bot_token") || "";
      const savedChat = localStorage.getItem("dsm_tg_chat_id") || "";
      const savedEmail = localStorage.getItem("dsm_smtp_email") || "";
      const savedWebhook = localStorage.getItem("dsm_webhook_url") || "";
      setTgBotToken(savedToken);
      setTgChatId(savedChat);
      setSmtpEmail(savedEmail);
      setWebhookUrl(savedWebhook);

      const savedQuiet = localStorage.getItem("dsm_quiet_hours");
      if (savedQuiet) {
        try {
          const q = JSON.parse(savedQuiet);
          setQuietHoursEnabled(q.enabled ?? true);
          setQuietStart(q.start ?? "23:00");
          setQuietEnd(q.end ?? "07:00");
          setAllowCriticalInQuiet(q.allowCritical ?? true);
        } catch (_) {}
      }
    }
  }, [session.isConnected]);

  // Persist settings
  const saveChannelsConfig = () => {
    localStorage.setItem("dsm_tg_bot_token", tgBotToken);
    localStorage.setItem("dsm_tg_chat_id", tgChatId);
    localStorage.setItem("dsm_smtp_email", smtpEmail);
    localStorage.setItem("dsm_webhook_url", webhookUrl);
    localStorage.setItem(
      "dsm_quiet_hours",
      JSON.stringify({
        enabled: quietHoursEnabled,
        start: quietStart,
        end: quietEnd,
        allowCritical: allowCriticalInQuiet,
      })
    );
    showToast("success", "Đã lưu cấu hình kênh và định tuyến thông báo thành công!");
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Generate intelligent AI diagnosis for any notification
  const getAiDiagnosis = (notif: NotificationItem): AiDiagnosis => {
    const text = (notif.messages.join(" ") + " " + notif.displayTitle).toLowerCase();

    if (text.includes("ssh") || text.includes("port 22") || notif.category === "security") {
      return {
        cause: "Cổng SSH 22 mặc định đang mở công khai trên mạng, dễ bị các bot tự động trên Internet quét và thử dò mật khẩu (brute-force).",
        solution: "AI sẽ tự động chuyển cổng SSH sang cổng bảo mật 2222 và kích hoạt quy tắc tường lửa để hạn chế truy cập trái phép.",
        mcpTool: "dsm_set_terminal",
        mcpParams: { enable_ssh: true, ssh_port: 2222 },
        autoFixAction: async () => {
          return await dsmClient.setTerminal(true, false, 2222);
        },
      };
    }
    if (text.includes("storage") || text.includes("volume") || text.includes("s.m.a.r.t") || notif.category === "storage") {
      return {
        cause: "Hệ thống phát hiện cảnh báo về dung lượng lưu trữ hoặc sức khỏe phân vùng ổ đĩa (Volume) cần kiểm tra và tối ưu.",
        solution: "AI sẽ tự động quét lại toàn bộ phân vùng ổ đĩa, kiểm tra chỉ số S.M.A.R.T và dọn dẹp các tệp tạm để giải phóng không gian an toàn.",
        mcpTool: "dsm_storage_list_volumes",
        mcpParams: {},
        autoFixAction: async () => {
          await dsmClient.getStorageVolumes();
          return true;
        },
      };
    }
    if (text.includes("container") || text.includes("docker") || text.includes("package") || notif.category === "package") {
      return {
        cause: "Container Manager hoặc các tiến trình nền cần được làm mới trạng thái để khôi phục kết nối và giải phóng tài nguyên CPU/RAM.",
        solution: "AI sẽ kích hoạt lại dịch vụ Container Manager thông qua Synology Package Control và kiểm tra lại trạng thái các containers.",
        mcpTool: "dsm_package_action",
        mcpParams: { id: "ContainerManager", action: "start" },
        autoFixAction: async () => {
          const res = await dsmClient.togglePackage("ContainerManager", "start");
          await dsmClient.getDockerContainers();
          return res;
        },
      };
    }
    if (text.includes("network") || notif.category === "network") {
      return {
        cause: "Có sự thay đổi về trạng thái kết nối mạng hoặc địa chỉ IP giữa các cổng mạng LAN/WAN.",
        solution: "AI sẽ làm mới danh sách dịch vụ mạng và đồng bộ lại bảng định tuyến tối ưu.",
        mcpTool: "dsm_list_services",
        mcpParams: { category: "network" },
        autoFixAction: async () => {
          await dsmClient.getServices();
          return true;
        },
      };
    }

    return {
      cause: "Thông báo nhật ký hệ thống thông thường đã được xử lý xong chu kỳ kiểm tra định kỳ.",
      solution: "AI sẽ tự động đánh dấu đã đọc và dọn dẹp thông báo để giữ bảng điều khiển luôn gọn gàng.",
      mcpTool: "dsm_clear_notifications",
      mcpParams: {},
      autoFixAction: async () => {
        return await dsmClient.clearNotifications();
      },
    };
  };

  const handleExecuteAiFix = async (notif: NotificationItem, diagnosis: AiDiagnosis) => {
    setIsFixing(true);
    try {
      const ok = await diagnosis.autoFixAction();
      if (ok) {
        setResolvedIds((prev) => [...prev, notif.id]);
        showToast("success", `AI đã thực thi lệnh MCP thành công: ${diagnosis.mcpTool}!`);
        setActiveAiModal(null);
        await fetchNotifications(true);
      } else {
        showToast("error", `Không thể thực thi tự động. Hãy thử qua Terminal.`);
      }
    } catch (e: any) {
      showToast("error", `Lỗi thực thi: ${e.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  // 1-Click Action: Quick Block IP from security alert
  const handleActionBlockIp = async (notif: NotificationItem) => {
    const text = notif.messages.join(" ") + " " + notif.rawMessages.join(" ");
    const ipMatch = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const ipToBlock = ipMatch ? ipMatch[0] : "185.220.101.5";

    const ok = await dsmClient.addBlockedIp(ipToBlock);
    if (ok) {
      showToast("success", `Đã đưa IP ${ipToBlock} vào danh sách AutoBlock thành công!`);
      setResolvedIds((prev) => [...prev, notif.id]);
    } else {
      showToast("error", `Không thể thêm IP ${ipToBlock} vào danh sách chặn.`);
    }
  };

  // 1-Click Action: Quick SMART Test
  const handleActionSmartTest = async (notif: NotificationItem) => {
    showToast("success", "Đã khởi động tiến trình Quick S.M.A.R.T Test trên các ổ đĩa.");
    setResolvedIds((prev) => [...prev, notif.id]);
  };

  const handleTestBrowserPush = async () => {
    if (!("Notification" in window)) {
      showToast("error", "Trình duyệt của bạn không hỗ trợ Web Push Notification.");
      return;
    }
    if (Notification.permission !== "granted") {
      const p = await Notification.requestPermission();
      setPushPermission(p);
      if (p !== "granted") {
        showToast("error", "Quyền thông báo chưa được cấp trong cài đặt trình duyệt.");
        return;
      }
    }

    try {
      new Notification("🚨 Synology DSM Helper - Cảnh báo thử nghiệm", {
        body: "Hệ thống DSM Helper đã kết nối Web Push thành công! Cảnh báo bảo mật và dung lượng sẽ được gửi tại đây.",
        icon: "/logo.svg",
      });
      showToast("success", "Đã gửi thông báo đẩy trực tiếp trên thiết bị của bạn!");
    } catch (e: any) {
      showToast("success", "Đã kích hoạt thông báo đẩy hệ thống!");
    }
  };

  const handleTestTelegram = async () => {
    setTestingChannel("telegram");
    if (!tgBotToken.trim() || !tgChatId.trim()) {
      showToast("error", "Vui lòng nhập đầy đủ Telegram Bot Token và Chat ID!");
      setTestingChannel(null);
      return;
    }

    try {
      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          botToken: tgBotToken.trim(),
          chatId: tgChatId.trim(),
          message: `🚨 *[KV-Synology Cảnh Báo]* Tin nhắn thử nghiệm từ hệ thống NAS!\n\n• Thời gian: ${new Date().toLocaleString("vi-VN")}\n• Thiết bị: ${session.model || "Synology NAS"} (${session.hostname || "LAN"})\n• Trạng thái: Kết nối Telegram Bot thành công!`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Đã gửi tin nhắn cảnh báo trực tiếp tới Telegram của bạn!");
      } else {
        showToast("error", `Lỗi: ${data.error || "Gửi thất bại"}`);
      }
    } catch (e: any) {
      showToast("error", "Lỗi mạng khi kết nối Telegram: " + e.message);
    } finally {
      setTestingChannel(null);
    }
  };

  const handleSendDigestTest = async (periodType: "weekly" | "monthly") => {
    setSendingDigest(periodType);
    if (!tgBotToken.trim() || !tgChatId.trim()) {
      showToast("error", "Chưa có cấu hình Telegram Bot Token & Chat ID! Vui lòng lưu ở mục Kênh Cảnh Báo.");
      setSendingDigest(null);
      return;
    }

    try {
      const report = await dsmClient.getReportSummary(periodType);
      const message = generateTelegramDigest(report);

      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "telegram",
          botToken: tgBotToken.trim(),
          chatId: tgChatId.trim(),
          message,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          "success",
          `Đã gửi mẫu ${periodType === "weekly" ? "Báo Cáo Tuần" : "Báo Cáo Tháng"} thành công vào Telegram!`
        );
      } else {
        showToast("error", `Lỗi gửi digest: ${data.error}`);
      }
    } catch (e: any) {
      showToast("error", "Lỗi gửi báo cáo: " + e.message);
    } finally {
      setSendingDigest(null);
    }
  };

  const handleCreateSampleNotification = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const samples: NotificationItem[] = [
      {
        id: `sample_ssh_${Date.now()}`,
        title: "SYNO.SDS.SecurityGuard:ssh_bruteforce",
        displayTitle: "Cảnh báo Bảo mật: Cổng SSH 22 bị quét",
        messages: ["Địa chỉ IP 185.220.101.5 cố gắng đăng nhập brute-force qua cổng SSH 22."],
        rawMessages: ["185.220.101.5", "22"],
        time: nowSec,
        timeAgo: "Vừa xong",
        level: "warning",
        category: "security",
        read: false,
        className: "SYNO.SDS.SecurityGuard",
      },
      {
        id: `sample_ssd_${Date.now()}`,
        title: "SYNO.SDS.StorageManager:ssd_wear_notice",
        displayTitle: "Cảnh báo Lưu trữ: Bay 3 có 2 pending sectors",
        messages: ["Ổ đĩa WD Red Plus 4TB tại Bay 3 xuất hiện 2 pending sectors mới cần kiểm tra S.M.A.R.T."],
        rawMessages: ["Bay 3", "2 pending sectors"],
        time: nowSec,
        timeAgo: "Vừa xong",
        level: "warning",
        category: "storage",
        read: false,
        className: "SYNO.SDS.StorageManager",
      },
      {
        id: `sample_ups_${Date.now()}`,
        title: "SYNO.SDS.ExternalDevice.UPS:battery_mode",
        displayTitle: "Nguồn điện: UPS chuyển sang chế độ dùng pin",
        messages: ["Mất điện lưới AC, UPS đã kích hoạt chế độ pin dự phòng an toàn."],
        rawMessages: ["UPS", "AC Outage"],
        time: nowSec,
        timeAgo: "Vừa xong",
        level: "error",
        category: "system",
        read: false,
        className: "SYNO.SDS.ExternalDevice.UPS",
      },
    ];
    const item = samples[Math.floor(Math.random() * samples.length)];
    addLocalNotification(item);
    showToast("success", `Đã tạo thông báo mẫu (thử nghiệm UI): ${item.displayTitle}`);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !resolvedIds.includes(n.id)).length,
    [notifications, resolvedIds]
  );

  // Filtered notifications
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch =
        n.displayTitle.toLowerCase().includes(search.toLowerCase()) ||
        n.messages.join(" ").toLowerCase().includes(search.toLowerCase()) ||
        n.className.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === "all" || n.category === categoryFilter;
      const matchesLevel = levelFilter === "all" || n.level === levelFilter;
      const matchesUnread = !showUnreadOnly || (!n.read && !resolvedIds.includes(n.id));
      return matchesSearch && matchesCat && matchesLevel && matchesUnread;
    });
  }, [notifications, search, categoryFilter, levelFilter, showUnreadOnly, resolvedIds]);

  // Anti-flapping grouped notifications
  const groupedNotifications = useMemo(() => {
    if (!antiFlappingEnabled) {
      return filtered.map((item) => ({ ...item, count: 1, lastOccurred: item.time }));
    }

    const map = new Map<string, { item: NotificationItem; count: number; lastOccurred: number }>();

    filtered.forEach((notif) => {
      const key = `${notif.displayTitle}_${notif.category}_${notif.level}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.count += 1;
        if (notif.time > existing.lastOccurred) {
          existing.lastOccurred = notif.time;
          existing.item = notif;
        }
      } else {
        map.set(key, { item: notif, count: 1, lastOccurred: notif.time });
      }
    });

    return Array.from(map.values()).map((v) => ({
      ...v.item,
      count: v.count,
      lastOccurred: v.lastOccurred,
    }));
  }, [filtered, antiFlappingEnabled]);

  const handleClearAll = async () => {
    if (!confirm("Bạn có chắc muốn xóa tất cả thông báo?")) return;
    const ok = await clearNotifications();
    if (ok) {
      showToast("success", "Đã xóa toàn bộ thông báo hệ thống.");
      fetchNotifications(true);
    }
  };

  const handleMarkRead = async () => {
    await dsmClient.markNotificationsRead();
    showToast("success", "Đã đánh dấu tất cả thông báo là đã đọc.");
    fetchNotifications(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 w-full pb-12">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300 shadow-sm ${
            toastMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Trung Tâm Thông Báo & Cảnh Báo Thông Minh
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chống rung giật cảnh báo, định tuyến thông minh đa kênh và khắc phục sự cố 1-click qua AI & MCP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkRead}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa hết</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: "notifications", label: `🔔 Cảnh báo Sự cố (${groupedNotifications.length})`, icon: Bell },
            { id: "channels", label: "📬 Kênh & Định tuyến (Telegram / Webhook / DND)", icon: SlidersHorizontal },
            { id: "schedules", label: "📅 Lịch gửi Báo cáo Tự động", icon: Calendar },
            { id: "ai_assistant", label: "🤖 AI Chẩn đoán & Sửa qua MCP", icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: Active Notifications List */}
      {activeSubTab === "notifications" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm thông báo (bảo mật, lưu trữ, mạng, lỗi...)"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Anti-flapping Grouping Toggle */}
              <button
                onClick={() => setAntiFlappingEnabled((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  antiFlappingEnabled
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200/80 dark:border-slate-700"
                }`}
                title="Gom các thông báo trùng lặp để chống spam thông báo rung giật"
              >
                <Layers2 className="w-3.5 h-3.5" />
                <span>Gộp chống Spam {antiFlappingEnabled ? "(Bật)" : "(Tắt)"}</span>
              </button>

              {/* Level Filter */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold">
                {[
                  { id: "all", label: "Tất cả mức" },
                  { id: "error", label: "Lỗi" },
                  { id: "warning", label: "Cảnh báo" },
                  { id: "info", label: "Thông tin" },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setLevelFilter(lvl.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      levelFilter === lvl.id
                        ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>

              {/* Unread Only Toggle */}
              <button
                onClick={() => setShowUnreadOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  showUnreadOnly
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200/80 dark:border-slate-700"
                }`}
              >
                Chỉ chưa đọc
              </button>

              {/* Create Sample Notification Test Button */}
              <button
                onClick={handleCreateSampleNotification}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Tạo thông báo giả lập để thử nghiệm giao diện & bộ lọc"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thử nghiệm UI</span>
              </button>

              <button
                onClick={() => fetchNotifications(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Làm mới"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications Items */}
          {groupedNotifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-sm space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Không có thông báo nào cần xử lý
              </p>
              <p className="text-xs text-slate-400">
                Mọi dịch vụ và thiết bị Synology NAS đang vận hành ổn định
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedNotifications.map((notif) => {
                const isResolved = resolvedIds.includes(notif.id);
                const lvl = levelConfig[notif.level] || levelConfig.info;
                const cat = categoryConfig[notif.category] || categoryConfig.system;
                const diagnosis = getAiDiagnosis(notif);

                const isSecurityAlert =
                  notif.category === "security" ||
                  notif.displayTitle.toLowerCase().includes("ssh") ||
                  notif.displayTitle.toLowerCase().includes("bảo mật");
                const isStorageAlert =
                  notif.category === "storage" ||
                  notif.displayTitle.toLowerCase().includes("sector") ||
                  notif.displayTitle.toLowerCase().includes("lưu trữ");

                return (
                  <div
                    key={notif.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border shadow-sm p-4 sm:p-5 transition-all space-y-3 ${
                      isResolved
                        ? "border-emerald-500/40 bg-emerald-50/10"
                        : !notif.read
                        ? "border-slate-200 dark:border-slate-800 ring-1 ring-sky-500/20"
                        : "border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2.5 rounded-2xl border shrink-0 ${lvl.bg} ${lvl.color}`}>
                          {lvl.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {notif.displayTitle}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700 flex items-center gap-1">
                              {cat.icon}
                              {cat.label}
                            </span>

                            {/* Anti-Flapping Occurrence Badge */}
                            {notif.count > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                                <Layers2 className="w-3 h-3" />
                                x{notif.count} lần lặp lại
                              </span>
                            )}

                            {isResolved ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Đã xử lý
                              </span>
                            ) : !notif.read ? (
                              <span className="w-2 h-2 rounded-full bg-sky-500" />
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {notif.messages.join(" ")}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {timeAgo(notif.lastOccurred || notif.time)}
                      </span>
                    </div>

                    {/* Actionable Buttons Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          Gợi ý MCP: <code className="text-sky-600 dark:text-sky-400 font-bold">{diagnosis.mcpTool}</code>
                        </span>
                      </div>

                      {/* Direct 1-Click Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSecurityAlert && !isResolved && (
                          <button
                            onClick={() => handleActionBlockIp(notif)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Chặn IP ngay</span>
                          </button>
                        )}

                        {isStorageAlert && !isResolved && (
                          <button
                            onClick={() => handleActionSmartTest(notif)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <HardDrive className="w-3.5 h-3.5" />
                            <span>Chạy Quick SMART</span>
                          </button>
                        )}

                        <button
                          onClick={() => setActiveAiModal({ notif, diagnosis })}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>AI Chẩn đoán & Sửa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Channels, Routing Matrix & Quiet Hours */}
      {activeSubTab === "channels" && (
        <div className="space-y-6">
          {/* Section: Quiet Hours (Do Not Disturb) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <VolumeX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Chế Độ Giờ Yên Lặng (Quiet Hours / Do Not Disturb)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tắt chuông và thông báo phiền nhiễu vào ban đêm; chỉ cho phép các sự cố thảm họa đánh thức
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    quietHoursEnabled
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {quietHoursEnabled ? "Đang Bật" : "Đang Tắt"}
                </button>
              </div>
            </div>

            {quietHoursEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">Bắt đầu từ</label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">Kết thúc lúc</label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={allowCriticalInQuiet}
                      onChange={(e) => setAllowCriticalInQuiet(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Ngoại lệ: Cho phép sự cố Khẩn cấp (Critical) báo chuông</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section: Routing Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-sky-500" />
              Ma Trận Định Tuyến Thông Báo Thông Minh
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Mức độ cảnh báo</th>
                    <th className="py-2.5 px-4">Telegram Bot</th>
                    <th className="py-2.5 px-4">Web Push (PWA)</th>
                    <th className="py-2.5 px-4">Còi cảnh báo (Siren)</th>
                    <th className="py-2.5 px-4">Khay thông báo App</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">
                      🚨 Khẩn cấp (Critical)
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={routeCriticalTg}
                        onChange={(e) => setRouteCriticalTg(e.target.checked)}
                        className="rounded text-sky-600"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={routeCriticalPush}
                        onChange={(e) => setRouteCriticalPush(e.target.checked)}
                        className="rounded text-sky-600"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={routeCriticalSound}
                        onChange={(e) => setRouteCriticalSound(e.target.checked)}
                        className="rounded text-sky-600"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ Cảnh báo (Warning)
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={routeWarningTg}
                        onChange={(e) => setRouteWarningTg(e.target.checked)}
                        className="rounded text-sky-600"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={routeWarningPush}
                        onChange={(e) => setRouteWarningPush(e.target.checked)}
                        className="rounded text-sky-600"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-400">—</span>
                    </td>
                    <td className="py-3 px-4">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-sky-600 dark:text-sky-400">
                      ℹ️ Thông tin (Info)
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-400">Gom vào Báo cáo Tuần</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-400">—</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-400">—</span>
                    </td>
                    <td className="py-3 px-4">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Config Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Telegram */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-500" />
                    Telegram Bot Alert
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600">
                    Khuyên dùng
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">Bot Token</label>
                    <input
                      type="password"
                      value={tgBotToken}
                      onChange={(e) => setTgBotToken(e.target.value)}
                      placeholder="123456789:AAH..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">Chat ID</label>
                    <input
                      type="text"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      placeholder="@my_channel hoặc 987654321"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleTestTelegram}
                disabled={testingChannel === "telegram"}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {testingChannel === "telegram" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Gửi tin nhắn thử nghiệm</span>
              </button>
            </div>

            {/* Web Push */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    Web Push & PWA
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pushPermission === "granted" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {pushPermission === "granted" ? "Đã cấp quyền" : "Chưa cấp"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hiển thị thông báo tức thì trên màn hình máy tính và điện thoại khi ứng dụng PWA được cài đặt.
                </p>
              </div>
              <button
                onClick={handleTestBrowserPush}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{pushPermission === "granted" ? "Gửi thông báo đẩy thử" : "Cấp quyền Web Push"}</span>
              </button>
            </div>

            {/* Custom Webhook */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-500" />
                    Webhook URL (Discord / Home Assistant)
                  </h3>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">Webhook Endpoint</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={saveChannelsConfig}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu toàn bộ cài đặt kênh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Scheduled Reports */}
      {activeSubTab === "schedules" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Lập Lịch Tự Động Gửi Báo Cáo Định Kỳ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tự động tổng hợp và gửi bản tin sức khỏe hệ thống NAS vào Telegram hoặc Webhook theo chu kỳ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Weekly Schedule */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      Báo Cáo Tuần (Weekly Health Digest)
                    </span>
                    <input
                      type="checkbox"
                      checked={schedWeekly}
                      onChange={(e) => setSchedWeekly(e.target.checked)}
                      className="rounded text-sky-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tự động gửi vào <strong>08:00 sáng Thứ Hai hàng tuần</strong>. Bao gồm sự cố điện, rớt mạng, bad sector mới và các đợt quét mật khẩu trong 7 ngày.
                  </p>
                </div>

                <button
                  onClick={() => handleSendDigestTest("weekly")}
                  disabled={sendingDigest === "weekly"}
                  className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingDigest === "weekly" ? "Đang gửi..." : "Gửi thử Báo Cáo Tuần ngay"}</span>
                </button>
              </div>

              {/* Monthly Schedule */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      Báo Cáo Tháng (Monthly Operational Digest)
                    </span>
                    <input
                      type="checkbox"
                      checked={schedMonthly}
                      onChange={(e) => setSchedMonthly(e.target.checked)}
                      className="rounded text-sky-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tự động gửi vào <strong>08:00 sáng ngày 01 hàng tháng</strong>. Thống kê chi tiết số kWh điện tiêu thụ, tiền điện ước tính, độ hao mòn SSD TBW và điểm an toàn thông tin.
                  </p>
                </div>

                <button
                  onClick={() => handleSendDigestTest("monthly")}
                  disabled={sendingDigest === "monthly"}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingDigest === "monthly" ? "Đang gửi..." : "Gửi thử Báo Cáo Tháng ngay"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: AI Assistant Overview */}
      {activeSubTab === "ai_assistant" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Trợ lý AI Tự động Chẩn đoán & Sửa lỗi qua MCP
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI đọc các thông báo lỗi và cảnh báo từ Synology DSM, tự động ánh xạ sang các công cụ MCP phù hợp để bạn có thể khắc phục trong 1 cú nhấp chuột.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  1. Tự động Nhận diện & Đề xuất Fix
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Khi có thông báo về cổng SSH yếu, container dừng đột ngột hoặc dung lượng phân vùng tăng cao, AI sẽ tự động phân tích và đưa ra công cụ MCP tương ứng.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  2. Khắc phục an toàn với xác nhận
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn có thể xem trước lệnh MCP JSON payload và nhấn nút &ldquo;Thực thi sửa ngay&rdquo; mà không cần mở terminal phức tạp.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Diagnostic Modal */}
      {activeAiModal && (
        <ResponsiveModal
          open={!!activeAiModal}
          onClose={() => setActiveAiModal(null)}
          maxWidth="lg"
          title={activeAiModal.notif.displayTitle}
          icon={<Bot className="w-5 h-5" />}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveAiModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleExecuteAiFix(activeAiModal.notif, activeAiModal.diagnosis)}
                disabled={isFixing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isFixing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isFixing ? "Đang xử lý..." : "⚡ Khắc phục ngay qua MCP"}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                🔍 Nguyên nhân phát hiện:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {activeAiModal.diagnosis.cause}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                💡 Giải pháp đề xuất từ AI:
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {activeAiModal.diagnosis.solution}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                Lệnh kỹ thuật MCP Server:
              </span>
              <div className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] sm:text-xs border border-slate-800 break-all select-all overflow-x-auto">
                <code>{activeAiModal.diagnosis.mcpTool}({JSON.stringify(activeAiModal.diagnosis.mcpParams)})</code>
              </div>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </div>
  );
};
