"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import {
  FirewallRule,
  FirewallConfig,
  AutoBlockConfig,
  BlockedIpItem,
  FirewallProtocol,
  FirewallAction,
  FirewallSourceType,
} from "@/lib/dsm/types";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Server,
  Globe,
  Sliders,
  SlidersHorizontal,
  X,
  Check,
  Zap,
  Info,
  Layers,
  ArrowRight,
  UserCheck,
  ShieldQuestion,
  Activity,
  Key,
  Folder,
  Terminal,
  Tv,
  HardDrive,
  Printer,
  Wifi,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import ResponsiveModal from "@/components/common/ResponsiveModal";

// DSM Built-in Services Catalog
export interface DSMServiceItem {
  id: string;
  name: string;
  category: "file" | "remote" | "admin" | "media" | "backup_network";
  ports: string;
  protocol: FirewallProtocol;
  description: string;
}

export const DSM_SERVICES_CATALOG: DSMServiceItem[] = [
  // 1. Chia sẻ tệp (File Sharing)
  { id: "cifs", name: "Windows SMB / CIFS", category: "file", ports: "445, 137, 138, 139", protocol: "tcp", description: "Chia sẻ tệp mạng nội bộ Windows, macOS & Linux" },
  { id: "windowsODX", name: "Windows ODX Offload", category: "file", ports: "445", protocol: "tcp", description: "Tăng tốc sao chép tệp Windows Server ODX" },
  { id: "rodsp_vdisk", name: "Synology VDisk Service", category: "file", ports: "3260, 445", protocol: "tcp", description: "Dịch vụ ổ đĩa ảo Synology Storage" },
  { id: "ws_transfer_port", name: "WS-Transfer (Web Services)", category: "file", ports: "5357", protocol: "tcp", description: "Truyền tệp Web Services Discovery Windows" },
  { id: "ws_discovery_port", name: "WS-Discovery", category: "file", ports: "3702", protocol: "udp", description: "Dò tìm thiết bị Synology trên mạng Windows" },
  { id: "nfs", name: "NFS File Service", category: "file", ports: "2049, 111, 892", protocol: "all", description: "Giao thức chia sẻ tệp Linux / Unix NFS" },
  { id: "ftp", name: "FTP / FTPS File Transfer", category: "file", ports: "21, 20, 55536-55567", protocol: "tcp", description: "Truyền nhận tệp tin FTP & FTPS bảo mật" },
  { id: "HybridShare", name: "Synology Hybrid Share", category: "file", ports: "443, 80", protocol: "tcp", description: "Đồng bộ đám mây Synology C2 Hybrid Share" },
  { id: "webdav", name: "WebDAV Server", category: "file", ports: "5005, 5006", protocol: "tcp", description: "Truy cập ổ đĩa qua giao thức HTTP/HTTPS WebDAV" },

  // 2. Truy cập từ xa & VPN (Remote Access & VPN)
  { id: "ssh", name: "SSH Terminal Quản trị", category: "remote", ports: "22, 2212", protocol: "tcp", description: "Dòng lệnh bảo mật SSH quản trị NAS từ xa" },
  { id: "Tailscale", name: "Tailscale Mesh VPN", category: "remote", ports: "41641", protocol: "udp", description: "Mạng riêng ảo P2P Tailscale bảo mật cao" },
  { id: "vpn_server_openvpn", name: "OpenVPN Server", category: "remote", ports: "1194", protocol: "udp", description: "Máy chủ VPN OpenVPN tiêu chuẩn mã hóa SSL" },
  { id: "vpn_server_pptp", name: "PPTP VPN Server", category: "remote", ports: "1723", protocol: "tcp", description: "Máy chủ VPN PPTP truyền thống" },
  { id: "vpn_server_l2tp", name: "L2TP VPN Server", category: "remote", ports: "1701, 500, 4500", protocol: "udp", description: "Máy chủ VPN L2TP/IPSec" },
  { id: "vpn_server_ipsec", name: "IPSec VPN Server", category: "remote", ports: "500, 4500", protocol: "udp", description: "Máy chủ VPN IPSec doanh nghiệp" },

  // 3. Quản trị DSM & Web Server
  { id: "dsm_http", name: "DSM Web HTTP", category: "admin", ports: "5000", protocol: "tcp", description: "Giao diện web quản trị Synology DSM không mã hóa" },
  { id: "dsm_https", name: "DSM Web HTTPS (SSL)", category: "admin", ports: "5001", protocol: "tcp", description: "Giao diện web quản trị Synology DSM bảo mật SSL" },
  { id: "web_http", name: "Web Server / HTTP", category: "admin", ports: "80", protocol: "tcp", description: "Web Station / Reverse Proxy cổng 80" },
  { id: "web_https", name: "Web Server / HTTPS (SSL)", category: "admin", ports: "443", protocol: "tcp", description: "Web Station / Reverse Proxy cổng 443 SSL" },

  // 4. Giải trí & Đa phương tiện (Media)
  { id: "plex", name: "Plex Media Server", category: "media", ports: "32400, 32401, 32402", protocol: "tcp", description: "Máy chủ phát trực tuyến phim và video Plex" },
  { id: "jellyfin", name: "Jellyfin Media Server", category: "media", ports: "8096, 8920", protocol: "tcp", description: "Máy chủ truyền thông mã nguồn mở Jellyfin" },
  { id: "video_station", name: "Video Station", category: "media", ports: "9025-9040, 5000", protocol: "tcp", description: "Synology Video Station streaming" },
  { id: "audio_station", name: "Audio Station", category: "media", ports: "5000, 5001, 8888", protocol: "tcp", description: "Synology Audio Station streaming nhạc" },

  // 5. Sao lưu, Mạng & Thiết bị ngoại vi
  { id: "netbkp", name: "Network Backup / Rsync", category: "backup_network", ports: "873", protocol: "tcp", description: "Dịch vụ sao lưu mạng Synology Hyper Backup / Rsync" },
  { id: "bonjour", name: "Bonjour / ZeroConf Discovery", category: "backup_network", ports: "5353", protocol: "udp", description: "Quảng bá thiết bị Apple Bonjour & ZeroConf" },
  { id: "snmp", name: "SNMP Giám sát mạng", category: "backup_network", ports: "161, 162", protocol: "udp", description: "Giao thức quản lý và giám sát mạng SNMP" },
  { id: "ups_server", name: "Synology UPS Server", category: "backup_network", ports: "3493", protocol: "tcp", description: "Máy chủ điều khiển bộ lưu điện mạng Synology UPS" },
  { id: "ipp", name: "IPP Network Printing", category: "backup_network", ports: "631", protocol: "tcp", description: "In ấn mạng qua giao thức IPP" },
  { id: "lpr", name: "LPR / LPD Printer", category: "backup_network", ports: "515", protocol: "tcp", description: "Máy in mạng LPR/LPD" },
  { id: "mfp", name: "Multi-Function Printer (MFP)", category: "backup_network", ports: "9100", protocol: "tcp", description: "Máy in đa chức năng mạng" },
  { id: "kmip", name: "KMIP Key Management", category: "backup_network", ports: "5696", protocol: "tcp", description: "Quản lý khóa mã hóa Synology KMIP" },
  { id: "vs60", name: "VisualStation", category: "backup_network", ports: "5000", protocol: "tcp", description: "Màn hình giám sát camera Synology Surveillance" },
];

// Helper to format rule display nicely
export function getRuleFormattedInfo(rule: FirewallRule) {
  const rawPorts = rule.ports || "";
  const rawName = rule.name || "";
  const tokens = rawPorts.split(",").map((t) => t.trim()).filter(Boolean);

  // Match known services
  const matchedServices: DSMServiceItem[] = [];
  const customPorts: string[] = [];

  tokens.forEach((token) => {
    const s = DSM_SERVICES_CATALOG.find(
      (item) => item.id.toLowerCase() === token.toLowerCase() || item.name.toLowerCase() === token.toLowerCase()
    );
    if (s) {
      if (!matchedServices.some((m) => m.id === s.id)) matchedServices.push(s);
    } else {
      customPorts.push(token);
    }
  });

  // Generate clean title if rawName is just a concatenated list of internal IDs
  let title = rawName;
  const isRawConcatenated = rawName.includes(",") || rawName.includes("_") || rawName === rawPorts;
  if (isRawConcatenated && (matchedServices.length > 0 || customPorts.length > 0)) {
    if (matchedServices.length > 0 && customPorts.length === 0) {
      if (matchedServices.length === 1) {
        title = matchedServices[0].name;
      } else if (matchedServices.length === 2) {
        title = `${matchedServices[0].name} & ${matchedServices[1].name}`;
      } else {
        const topNames = matchedServices.slice(0, 2).map((m) => m.name.split(" ")[0]).join(", ");
        title = `${topNames} (+${matchedServices.length - 2} dịch vụ)`;
      }
    } else if (matchedServices.length > 0 && customPorts.length > 0) {
      title = `${matchedServices[0].name.split(" ")[0]} + Cổng ${customPorts.slice(0, 2).join(", ")}`;
    } else if (customPorts.length > 0) {
      title = `Cổng tùy chỉnh: ${customPorts.join(", ")}`;
    }
  }

  return {
    title,
    matchedServices,
    customPorts,
    totalItems: matchedServices.length + customPorts.length,
  };
}

export const FirewallManagerTab: React.FC = () => {
  const { session, experienceMode, t } = useAppStore();
  const isBeginner = experienceMode === "beginner";

  const [activeSubTab, setActiveSubTab] = useState<"rules" | "autoblock" | "dos">("rules");
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);

  // Firewall Config & Rules
  const [firewallConfig, setFirewallConfig] = useState<FirewallConfig | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "allow" | "deny">("all");
  const [expandedRuleIds, setExpandedRuleIds] = useState<Record<string, boolean>>({});

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [modalMode, setModalMode] = useState<"services" | "custom">("services");
  const [ruleName, setRuleName] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [customPortsInput, setCustomPortsInput] = useState("");
  const [ruleProtocol, setRuleProtocol] = useState<FirewallProtocol>("tcp");
  const [ruleSourceType, setRuleSourceType] = useState<FirewallSourceType>("subnet");
  const [ruleSourceValue, setRuleSourceValue] = useState("192.168.0.0/16");
  const [ruleAction, setRuleAction] = useState<FirewallAction>("allow");
  const [ruleEnabled, setRuleEnabled] = useState(true);

  // Auto-Block State
  const [autoBlockConfig, setAutoBlockConfig] = useState<AutoBlockConfig | null>(null);
  const [blockedIps, setBlockedIps] = useState<BlockedIpItem[]>([]);
  const [allowedIps, setAllowedIps] = useState<BlockedIpItem[]>([]);
  const [autoBlockView, setAutoBlockView] = useState<"deny" | "allow">("deny");
  const [savingAutoBlock, setSavingAutoBlock] = useState(false);
  const [manualIpInput, setManualIpInput] = useState("");

  // DoS Protection State
  const [dosEnabled, setDosEnabled] = useState(true);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [fwCfg, abCfg, blkIps, allowIps, dos] = await Promise.all([
        dsmClient.getFirewallConfig(),
        dsmClient.getAutoBlockConfig(),
        dsmClient.getBlockedIps(),
        dsmClient.getAllowedIps(),
        dsmClient.getDosProtection(),
      ]);
      setFirewallConfig(fwCfg);
      setAutoBlockConfig(abCfg);
      setBlockedIps(blkIps);
      setAllowedIps(allowIps);
      setDosEnabled(dos.enabled);
    } catch (e: any) {
      showToast("error", `Không thể tải cấu hình bảo mật: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.isConnected, session.sid]);

  // Master Firewall Toggle
  const handleToggleMasterFirewall = async () => {
    if (!firewallConfig) return;
    const nextState = !firewallConfig.enabled;
    setFirewallConfig({ ...firewallConfig, enabled: nextState });
    try {
      const ok = await dsmClient.setFirewallEnabled(nextState);
      if (ok) {
        showToast("success", nextState ? "Đã bật Tường lửa DSM thành công!" : "Đã tắt Tường lửa DSM.");
      }
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  // Toggle Rule Enabled State
  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    if (!firewallConfig) return;
    const nextRules = firewallConfig.rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
    setFirewallConfig({ ...firewallConfig, rules: nextRules });
    try {
      await dsmClient.toggleFirewallRule(ruleId, enabled);
      showToast("success", `Đã ${enabled ? "kích hoạt" : "vô hiệu hóa"} quy tắc thành công.`);
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa quy tắc tường lửa này?")) return;
    if (!firewallConfig) return;
    const nextRules = firewallConfig.rules.filter((r) => r.id !== ruleId);
    setFirewallConfig({ ...firewallConfig, rules: nextRules });
    try {
      await dsmClient.deleteFirewallRule(ruleId);
      showToast("success", "Đã xóa quy tắc tường lửa thành công.");
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  const toggleRuleExpand = (id: string) => {
    setExpandedRuleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Rule Modal
  const handleOpenAddRule = () => {
    setEditingRule(null);
    setModalMode("services");
    setRuleName("");
    setSelectedServiceIds(["cifs", "ssh"]);
    setCustomPortsInput("");
    setRuleProtocol("tcp");
    setRuleSourceType("subnet");
    setRuleSourceValue("192.168.0.0/16");
    setRuleAction("allow");
    setRuleEnabled(true);
    setServiceCategoryFilter("all");
    setServiceSearch("");
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: FirewallRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    
    // Parse ports to see if they match known services
    const tokens = (rule.ports || "").split(",").map((t) => t.trim()).filter(Boolean);
    const matchedIds = DSM_SERVICES_CATALOG.filter((s) =>
      tokens.some((t) => t.toLowerCase() === s.id.toLowerCase() || t.toLowerCase() === s.name.toLowerCase())
    ).map((s) => s.id);

    const nonMatched = tokens.filter(
      (t) => !DSM_SERVICES_CATALOG.some((s) => s.id.toLowerCase() === t.toLowerCase() || s.name.toLowerCase() === t.toLowerCase())
    );

    if (matchedIds.length > 0 && nonMatched.length === 0) {
      setModalMode("services");
      setSelectedServiceIds(matchedIds);
      setCustomPortsInput("");
    } else {
      setModalMode("custom");
      setSelectedServiceIds(matchedIds);
      setCustomPortsInput(rule.ports);
    }

    setRuleProtocol(rule.protocol);
    setRuleSourceType(rule.sourceType);
    setRuleSourceValue(rule.sourceValue);
    setRuleAction(rule.action);
    setRuleEnabled(rule.enabled);
    setServiceCategoryFilter("all");
    setServiceSearch("");
    setIsRuleModalOpen(true);
  };

  const handleToggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      // Auto-suggest rule name if not manually typed
      if (!editingRule && next.length > 0) {
        const names = next
          .map((id) => DSM_SERVICES_CATALOG.find((s) => s.id === id)?.name.split(" ")[0])
          .filter(Boolean);
        setRuleName(names.length <= 2 ? `Dịch vụ ${names.join(" & ")}` : `Dịch vụ ${names.slice(0, 2).join(", ")} (+${names.length - 2})`);
      }
      return next;
    });
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalPorts = "";
    if (modalMode === "services") {
      if (selectedServiceIds.length === 0) {
        showToast("error", "Vui lòng chọn ít nhất một dịch vụ DSM!");
        return;
      }
      finalPorts = selectedServiceIds.join(",");
    } else {
      if (!customPortsInput.trim()) {
        showToast("error", "Vui lòng nhập cổng!");
        return;
      }
      finalPorts = customPortsInput.trim();
    }

    const finalName = ruleName.trim() || (modalMode === "services" ? `Dịch vụ DSM (${selectedServiceIds.length})` : `Cổng ${finalPorts}`);

    const newRule: FirewallRule = {
      id: editingRule ? editingRule.id : `fw_${Date.now()}`,
      name: finalName,
      ports: finalPorts,
      protocol: ruleProtocol,
      sourceType: ruleSourceType,
      sourceValue: ruleSourceValue.trim() || "Tất cả",
      action: ruleAction,
      enabled: ruleEnabled,
      order: editingRule ? editingRule.order : (firewallConfig?.rules.length || 0) + 1,
    };

    try {
      await dsmClient.saveFirewallRule(newRule);
      setIsRuleModalOpen(false);
      showToast("success", `Đã lưu quy tắc "${newRule.name}" thành công!`);
      loadData();
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  // AutoBlock Handlers
  const handleSaveAutoBlock = async () => {
    if (!autoBlockConfig) return;
    setSavingAutoBlock(true);
    try {
      await dsmClient.setAutoBlockConfig(autoBlockConfig);
      showToast("success", "Đã cập nhật cấu hình Tự động khóa IP thành công!");
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    } finally {
      setSavingAutoBlock(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    try {
      await dsmClient.unblockIp(ip);
      setBlockedIps((prev) => prev.filter((item) => item.ip !== ip));
      showToast("success", `Đã mở khóa IP ${ip} thành công.`);
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  const handleAddManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIpInput.trim()) return;
    try {
      await dsmClient.addBlockedIp(manualIpInput.trim());
      setManualIpInput("");
      loadData();
      showToast("success", `Đã thêm IP ${manualIpInput.trim()} vào danh sách chặn.`);
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  // DoS Toggle
  const handleToggleDos = async () => {
    const nextState = !dosEnabled;
    setDosEnabled(nextState);
    try {
      await dsmClient.setDosProtection(nextState);
      showToast("success", nextState ? "Đã bật Bảo vệ chống tấn công DoS." : "Đã tắt Bảo vệ DoS.");
    } catch (e: any) {
      showToast("error", `Lỗi: ${e.message}`);
    }
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    if (!firewallConfig) return [];
    return firewallConfig.rules.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.ports.toLowerCase().includes(search.toLowerCase()) ||
        r.sourceValue.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === "all" || r.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [firewallConfig, search, actionFilter]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-bottom-5 duration-200 ${
            toastMsg.type === "success"
              ? "bg-emerald-500 text-white border-emerald-400"
              : "bg-rose-500 text-white border-rose-400"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Metric Cards */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {t.firewall.title}
                  </h3>
                  {session.isConnected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live WebAPI: {session.hostname || "192.168.31.71"} (Profile: {firewallConfig?.defaultProfile || "default"})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                      Demo Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.firewall.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Master Firewall Switch */}
          <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs shrink-0">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{t.firewall.enableFirewall}:</span>
              <span
                className={`text-[11px] font-extrabold ${
                  firewallConfig?.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {firewallConfig?.enabled ? `● ${t.firewall.statusEnabled}` : `○ ${t.firewall.statusDisabled}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleMasterFirewall}
              className={`w-12 h-6 rounded-full transition-colors relative inline-flex items-center p-0.5 cursor-pointer shadow-inner ${
                firewallConfig?.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full transition-transform shadow-md transform ${
                  firewallConfig?.enabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3 Metric Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="bg-white dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">{t.firewall.rulesTab}</span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {firewallConfig?.rules.filter((r) => r.enabled).length || 0} / {firewallConfig?.rules.length || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">{t.firewall.blockCount}</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                {blockedIps.length} IP
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">{t.firewall.dosTab}</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {dosEnabled ? t.firewall.statusEnabled : t.firewall.statusDisabled}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Simple Beginner Security View */}
      {isBeginner && !showAdvancedSecurity ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${firewallConfig?.enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 text-slate-400"}`}>
                  <ShieldCheck className="w-5 h-5"/>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tường lửa DSM</h4>
                  <p className="text-[11px] text-slate-400">{firewallConfig?.enabled ? "Đang bật bảo vệ" : "Đang tắt"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleMasterFirewall}
                className={`w-11 h-6 rounded-full transition-colors relative inline-flex items-center p-0.5 cursor-pointer shadow-inner ${
                  firewallConfig?.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm transform ${firewallConfig?.enabled ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${dosEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 text-slate-400"}`}>
                  <Zap className="w-5 h-5"/>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Chống tấn công DoS</h4>
                  <p className="text-[11px] text-slate-400">{dosEnabled ? "Đang bảo vệ cổng mạng" : "Đang tắt"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleDos}
                className={`w-11 h-6 rounded-full transition-colors relative inline-flex items-center p-0.5 cursor-pointer shadow-inner ${
                  dosEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm transform ${dosEnabled ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Lock className="w-5 h-5"/>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tự động khóa IP</h4>
                  <p className="text-[11px] text-slate-400">Đã khóa {blockedIps.length} IP đáng ngờ</p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {autoBlockConfig?.enabled !== false ? "Đang bật" : "Tắt"}
              </span>
            </div>
          </div>

          {/* Simple Core Services List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-500"/>
                Quy tắc bảo vệ các dịch vụ cốt lõi
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                {firewallConfig?.rules.filter(r=>r.enabled).length || 0} / {firewallConfig?.rules.length || 0} đang hoạt động
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(firewallConfig?.rules || []).slice(0, 5).map(rule => (
                <div key={rule.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{rule.name}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${rule.action === "allow" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                        {rule.action === "allow" ? "Cho phép" : "Từ chối"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Cổng: <strong className="text-slate-700 dark:text-slate-300">{rule.ports}</strong> • Nguồn: {rule.sourceValue}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative inline-flex items-center p-0.5 cursor-pointer shadow-inner shrink-0 ${
                      rule.enabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm transform ${rule.enabled ? "translate-x-5" : "translate-x-0"}`}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-sky-50/60 dark:bg-sky-950/20 rounded-2xl border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              💡 Bạn đang ở <strong>Chế độ Cơ bản</strong>. Có thể mở rộng để quản lý tất cả các quy tắc GeoIP, mạng phụ và danh sách IP bị khóa.
            </span>
            <button
              onClick={() => setShowAdvancedSecurity(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs"
            >
              Mở Quản lý Nâng cao ↓
            </button>
          </div>
        </div>
      ) : (
        <>
          {isBeginner && showAdvancedSecurity && (
            <div className="flex justify-end pb-1">
              <button
                onClick={() => setShowAdvancedSecurity(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Thu gọn chế độ nâng cao ↑
              </button>
            </div>
          )}

          {/* Sub-Tab Navigation Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSubTab("rules")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeSubTab === "rules"
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t.firewall.rulesTab} ({firewallConfig?.rules.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveSubTab("autoblock")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeSubTab === "autoblock"
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t.firewall.autoBlockTab} ({blockedIps.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab("dos")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeSubTab === "dos"
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-500/20"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{t.firewall.dosTab}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeSubTab === "rules" && (
                <button
                  onClick={handleOpenAddRule}
                  className="px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.firewall.addRule}</span>
                </button>
              )}

              <button
                onClick={loadData}
                className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                title={t.common.refresh}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
                <span className="hidden sm:inline">{t.common.refresh}</span>
              </button>
            </div>
          </div>

      {/* ==================== SUB-TAB 1: FIREWALL RULES ==================== */}
      {activeSubTab === "rules" && (
        <div className="space-y-4">
          {/* Rules Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm quy tắc (cổng, tên dịch vụ, IP nguồn...)"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: "all", label: "Tất cả" },
                { id: "allow", label: "Cho phép" },
                { id: "deny", label: "Chặn / Từ chối" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActionFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    actionFilter === tab.id
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rules Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredRules.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Không tìm thấy quy tắc nào</p>
                <p className="text-xs text-slate-400">Nhấn &ldquo;Thêm Quy tắc&rdquo; để tạo bộ lọc cổng mới trên Synology DSM.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRules.map((rule) => {
                  const isAllow = rule.action === "allow";
                  const formatted = getRuleFormattedInfo(rule);
                  const isExpanded = !!expandedRuleIds[rule.id];
                  const hasManyItems = formatted.totalItems > 3;
                  const displayServices = isExpanded ? formatted.matchedServices : formatted.matchedServices.slice(0, 3);
                  const displayCustomPorts = isExpanded ? formatted.customPorts : formatted.customPorts.slice(0, Math.max(0, 3 - formatted.matchedServices.length));
                  const hiddenCount = formatted.totalItems - 3;

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors ${
                        !rule.enabled ? "opacity-60 bg-slate-50/50 dark:bg-slate-800/30" : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`p-2.5 rounded-2xl shrink-0 ${
                            isAllow
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {isAllow ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 space-y-1.5 flex-1">
                          {/* Title & Action Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {formatted.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isAllow
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {isAllow ? "CHO PHÉP (ALLOW)" : "TỪ CHỐI (DENY)"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                              {rule.protocol}
                            </span>
                          </div>

                          {/* Formatted Services / Ports Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {displayServices.map((srv) => (
                              <span
                                key={srv.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 shadow-2xs"
                                title={`${srv.description} (Cổng: ${srv.ports})`}
                              >
                                {srv.category === "file" && <Folder className="w-3 h-3 text-sky-500" />}
                                {srv.category === "remote" && <Terminal className="w-3 h-3 text-indigo-500" />}
                                {srv.category === "admin" && <Server className="w-3 h-3 text-blue-500" />}
                                {srv.category === "media" && <Tv className="w-3 h-3 text-amber-500" />}
                                {srv.category === "backup_network" && <HardDrive className="w-3 h-3 text-emerald-500" />}
                                <span>{srv.name}</span>
                                <span className="text-[10px] font-mono text-sky-500/80 dark:text-sky-400/80">({srv.ports})</span>
                              </span>
                            ))}

                            {displayCustomPorts.map((cp, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                <span>Cổng: {cp}</span>
                              </span>
                            ))}

                            {hasManyItems && (
                              <button
                                type="button"
                                onClick={() => toggleRuleExpand(rule.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? "Thu gọn" : `+${hiddenCount} dịch vụ khác`}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>

                          {/* Source Info */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                            <span>Nguồn: <strong className="font-mono text-slate-700 dark:text-slate-300">{rule.sourceValue}</strong> ({rule.sourceType})</span>
                          </div>
                        </div>
                      </div>

                      {/* Rule Controls */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                          className={`w-11 h-6 rounded-full transition-colors relative inline-flex items-center p-0.5 cursor-pointer shadow-inner ${
                            rule.enabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          title={rule.enabled ? "Vô hiệu hóa quy tắc" : "Kích hoạt quy tắc"}
                        >
                          <span
                            className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm transform ${
                              rule.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Chỉnh sửa quy tắc"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Xóa quy tắc"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: AUTO-BLOCK BRUTE-FORCE ==================== */}
      {activeSubTab === "autoblock" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Auto-Block Policy Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Cấu hình Tự động khóa IP
                  </h4>
                  <p className="text-[11px] text-slate-400">Ngăn chặn tấn công dò mật khẩu</p>
                </div>
              </div>

              {autoBlockConfig && (
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Bật Tự động khóa IP
                    </label>
                    <input
                      type="checkbox"
                      checked={autoBlockConfig.enabled}
                      onChange={(e) => setAutoBlockConfig({ ...autoBlockConfig, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-sky-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-500 dark:text-slate-400">
                      Số lần đăng nhập sai tối đa:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={autoBlockConfig.attempts}
                      onChange={(e) =>
                        setAutoBlockConfig({ ...autoBlockConfig, attempts: parseInt(e.target.value, 10) || 5 })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-slate-500 dark:text-slate-400">
                      Trong khoảng thời gian (Phút):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={autoBlockConfig.withinMinutes}
                      onChange={(e) =>
                        setAutoBlockConfig({ ...autoBlockConfig, withinMinutes: parseInt(e.target.value, 10) || 5 })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Tự động mở khóa sau số ngày:
                    </label>
                    <input
                      type="checkbox"
                      checked={autoBlockConfig.enableUnblock}
                      onChange={(e) => setAutoBlockConfig({ ...autoBlockConfig, enableUnblock: e.target.checked })}
                      className="w-4 h-4 rounded text-sky-600"
                    />
                  </div>

                  {autoBlockConfig.enableUnblock && (
                    <div className="space-y-1">
                      <label className="font-medium text-slate-500 dark:text-slate-400">
                        Số ngày khóa:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={autoBlockConfig.unblockDays}
                        onChange={(e) =>
                          setAutoBlockConfig({ ...autoBlockConfig, unblockDays: parseInt(e.target.value, 10) || 7 })
                        }
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleSaveAutoBlock}
                    disabled={savingAutoBlock}
                    className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 mt-2"
                  >
                    {savingAutoBlock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Lưu Cấu hình vào DSM</span>
                  </button>
                </div>
              )}
            </div>

            {/* Blocked / Allowed IP List with View Switch */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setAutoBlockView("deny")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        autoBlockView === "deny"
                          ? "bg-rose-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Danh sách Chặn ({blockedIps.length})
                    </button>
                    <button
                      onClick={() => setAutoBlockView("allow")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        autoBlockView === "allow"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Danh sách Tin cậy ({allowedIps.length})
                    </button>
                  </div>
                </div>

                {/* Add Manual IP Form */}
                <form onSubmit={handleAddManualBlock} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualIpInput}
                    onChange={(e) => setManualIpInput(e.target.value)}
                    placeholder="VD: 185.220.101.4"
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-36 sm:w-44"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shrink-0"
                  >
                    Chặn IP
                  </button>
                </form>
              </div>

              {autoBlockView === "deny" ? (
                blockedIps.length === 0 ? (
                  <div className="p-8 text-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Không có IP nào bị khóa</p>
                    <p className="text-[11px] text-slate-400">Chưa ghi nhận cuộc tấn công brute-force bất thường.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
                    {blockedIps.map((item) => (
                      <div key={item.ip} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                                {item.ip}
                              </span>
                              {item.country && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {item.country}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Khóa lúc: {item.denyTime} • Hết hạn: {item.expireTime || "7 ngày"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnblock(item.ip)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Mở khóa</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                allowedIps.length === 0 ? (
                  <div className="p-8 text-center space-y-1">
                    <UserCheck className="w-8 h-8 text-sky-500 mx-auto" />
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Danh sách tin cậy trống</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
                    {allowedIps.map((item) => (
                      <div key={item.ip} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                                {item.ip}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                                {item.country || "TRUSTED"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Quyền: Miễn trừ kiểm tra Brute-force
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: DOS & SECURITY ==================== */}
      {activeSubTab === "dos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DoS Defense Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Bảo vệ chống DoS (Denial of Service)
                    </h4>
                    <p className="text-[11px] text-slate-400">Ngăn chặn tấn công từ chối dịch vụ</p>
                  </div>
                </div>

                <button
                  onClick={handleToggleDos}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    dosEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                      dosEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Kích hoạt tính năng bảo vệ chống tấn công từ chối dịch vụ (DoS) trên tất cả các cổng mạng vật lý (LAN 1, LAN 2). Hệ thống sẽ tự động lọc các gói tin SYN Flood, ICMP Broadcast và Ping of Death.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-300">SYN Flood Protection:</span>
                  <span className="font-bold text-emerald-500">Đã kích hoạt</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-300">ICMP Broadcast Filter:</span>
                  <span className="font-bold text-emerald-500">Đã kích hoạt</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Giao diện áp dụng:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Tất cả giao diện mạng (all)</span>
                </div>
              </div>
            </div>

            {/* Security Best Practices Checklist */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Khuyến nghị An ninh Mạng DSM
                  </h4>
                  <p className="text-[11px] text-slate-400">Kiểm tra các cấu hình bảo mật then chốt</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <strong className="block">Tự động khóa IP Brute-Force đang BẬT</strong>
                    <span className="text-[11px] opacity-80">Đã chặn {blockedIps.length} IP tấn công trong 24h qua.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong className="block">Đổi cổng SSH mặc định (22)</strong>
                    <span className="text-[11px] opacity-80">Nên đổi sang cổng bảo mật (VD: 2222) trong Cài đặt hệ thống.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
                  <div>
                    <strong className="block">Chứng chỉ SSL HTTPS Let&rsquo;s Encrypt</strong>
                    <span className="text-[11px] opacity-80">Mã hóa toàn bộ lưu lượng web quản trị và tệp tin.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* ==================== ADD / EDIT RULE MODAL ==================== */}
      {isRuleModalOpen && (
        <ResponsiveModal
          open={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          maxWidth="2xl"
          title={editingRule ? "Chỉnh sửa Quy tắc Tường lửa" : "Thêm Quy tắc Tường lửa Mới"}
          icon={<Shield className="w-5 h-5 text-sky-500" />}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="firewall-rule-form"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm transition-all cursor-pointer"
              >
                {editingRule ? "Cập nhật Quy tắc" : "Thêm Quy tắc"}
              </button>
            </div>
          }
        >
          <form id="firewall-rule-form" onSubmit={handleSaveRule} className="space-y-4 text-xs">
            {/* Mode Switcher: Built-in DSM Services vs Custom Ports */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setModalMode("services")}
                className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalMode === "services"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4 text-sky-500" />
                <span>Chọn Dịch vụ DSM ({selectedServiceIds.length} đã chọn)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode("custom")}
                className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalMode === "custom"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span>Nhập Cổng Tùy chỉnh (Port / Range)</span>
              </button>
            </div>

            {/* Tab 1: DSM Services Selector */}
            {modalMode === "services" && (
              <div className="space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-200/80 dark:border-slate-750">
                {/* Category Filters and Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: "all", label: "Tất cả" },
                      { id: "file", label: "Chia sẻ tệp" },
                      { id: "remote", label: "Truy cập & VPN" },
                      { id: "admin", label: "Quản trị DSM" },
                      { id: "media", label: "Media" },
                      { id: "backup_network", label: "Sao lưu & Mạng" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setServiceCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          serviceCategoryFilter === cat.id
                            ? "bg-sky-500 text-white shadow-2xs font-bold"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-sky-400"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-[140px] sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Tìm dịch vụ (smb, vpn, ssh...)"
                      className="w-full pl-8 pr-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Services Grid with Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {DSM_SERVICES_CATALOG.filter((s) => {
                    const matchCat = serviceCategoryFilter === "all" || s.category === serviceCategoryFilter;
                    const matchSearch =
                      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                      s.id.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                      s.ports.includes(serviceSearch);
                    return matchCat && matchSearch;
                  }).map((srv) => {
                    const isSelected = selectedServiceIds.includes(srv.id);
                    return (
                      <div
                        key={srv.id}
                        onClick={() => handleToggleServiceSelection(srv.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 ring-1 ring-sky-400/30"
                            : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div
                            className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {srv.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {srv.description}
                            </p>
                          </div>
                        </div>

                        <span className="font-mono text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded shrink-0">
                          {srv.ports}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Ports Input */}
            {modalMode === "custom" && (
              <div className="space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-200/80 dark:border-slate-750">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Cổng hoặc dải cổng tùy chỉnh (Custom Ports):
                  </label>
                  <input
                    type="text"
                    required={modalMode === "custom"}
                    value={customPortsInput}
                    onChange={(e) => setCustomPortsInput(e.target.value)}
                    placeholder="VD: 8181, 8182 hoặc 32401,32402,6789 hoặc 52000-52100"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-semibold"
                  />
                  <p className="text-[11px] text-slate-400">
                    💡 Hỗ trợ cổng đơn lẻ (VD: 8080), danh sách cách nhau bởi dấu phẩy (VD: 8080, 8088), hoặc dải cổng (VD: 50000-51000).
                  </p>
                </div>
              </div>
            )}

            {/* Rule Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Tên quy tắc:
              </label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="VD: Cho phép Chia sẻ SMB & SSH"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>

            {/* Protocol & Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Protocol */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Giao thức mạng (Protocol):
                </label>
                <select
                  value={ruleProtocol}
                  onChange={(e) => setRuleProtocol(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold cursor-pointer"
                >
                  <option value="tcp">TCP (Tiêu chuẩn Web, SMB, SSH)</option>
                  <option value="udp">UDP (Streaming, VPN, DNS, Discovery)</option>
                  <option value="all">Tất cả (TCP & UDP)</option>
                </select>
              </div>

              {/* Action (Allow / Deny) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Hành động áp dụng:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleAction("allow")}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      ruleAction === "allow"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cho phép</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuleAction("deny")}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      ruleAction === "deny"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 ring-1 ring-rose-500/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Source IP / Subnet */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Địa chỉ IP Nguồn (Source IP):
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { id: "all", label: "Tất cả IP" },
                  { id: "subnet", label: "Dải Subnet LAN" },
                  { id: "single_ip", label: "IP Đơn lẻ" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setRuleSourceType(st.id as any);
                      if (st.id === "all") setRuleSourceValue("Tất cả");
                      if (st.id === "subnet") setRuleSourceValue("192.168.0.0/16");
                      if (st.id === "single_ip") setRuleSourceValue("192.168.1.50");
                    }}
                    className={`py-1 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                      ruleSourceType === st.id
                        ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-500/40"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={ruleSourceValue}
                onChange={(e) => setRuleSourceValue(e.target.value)}
                placeholder="VD: 192.168.0.0/16 hoặc Tất cả"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </form>
        </ResponsiveModal>
      )}
    </div>
  );
};
