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
} from "lucide-react";

import ResponsiveModal from "@/components/common/ResponsiveModal";

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

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [rulePreset, setRulePreset] = useState("custom");
  const [rulePorts, setRulePorts] = useState("");
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

  // Open Rule Modal
  const handleOpenAddRule = () => {
    setEditingRule(null);
    setRuleName("");
    setRulePreset("custom");
    setRulePorts("");
    setRuleProtocol("tcp");
    setRuleSourceType("subnet");
    setRuleSourceValue("192.168.0.0/16");
    setRuleAction("allow");
    setRuleEnabled(true);
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: FirewallRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRulePreset("custom");
    setRulePorts(rule.ports);
    setRuleProtocol(rule.protocol);
    setRuleSourceType(rule.sourceType);
    setRuleSourceValue(rule.sourceValue);
    setRuleAction(rule.action);
    setRuleEnabled(rule.enabled);
    setIsRuleModalOpen(true);
  };

  const handlePresetSelect = (preset: string) => {
    setRulePreset(preset);
    switch (preset) {
      case "dsm":
        setRuleName("Synology DSM Web Quản trị");
        setRulePorts("5000, 5001");
        setRuleProtocol("tcp");
        break;
      case "ssh":
        setRuleName("SSH Terminal Bảo mật");
        setRulePorts("22, 2222");
        setRuleProtocol("tcp");
        break;
      case "web":
        setRuleName("Web Server & SSL");
        setRulePorts("80, 443");
        setRuleProtocol("tcp");
        break;
      case "smb":
        setRuleName("Chia sẻ Tệp Windows (SMB)");
        setRulePorts("139, 445");
        setRuleProtocol("tcp");
        break;
      case "docker":
        setRuleName("Cổng Ứng dụng Container / Docker");
        setRulePorts("8080, 8088, 9000");
        setRuleProtocol("all");
        break;
      case "ftp":
        setRuleName("Truyền tệp FTP / SFTP");
        setRulePorts("21, 22");
        setRuleProtocol("tcp");
        break;
      default:
        break;
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !rulePorts.trim()) {
      showToast("error", "Vui lòng nhập tên quy tắc và cổng!");
      return;
    }

    const newRule: FirewallRule = {
      id: editingRule ? editingRule.id : `fw_${Date.now()}`,
      name: ruleName.trim(),
      ports: rulePorts.trim(),
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
                  return (
                    <div
                      key={rule.id}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
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

                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {rule.name}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold border ${
                                isAllow
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {isAllow ? "CHO PHÉP (ALLOW)" : "TỪ CHỐI (DENY)"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Cổng: {rule.ports}
                            </span>
                            <span>•</span>
                            <span className="uppercase">{rule.protocol}</span>
                            <span>•</span>
                            <span>Nguồn: <strong>{rule.sourceValue}</strong> ({rule.sourceType})</span>
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
                          className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Chỉnh sửa quy tắc"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
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
          maxWidth="lg"
          title={editingRule ? "Chỉnh sửa Quy tắc Tường lửa" : "Thêm Quy tắc Tường lửa Mới"}
          icon={<Shield className="w-5 h-5" />}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="firewall-rule-form"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm"
              >
                {editingRule ? "Cập nhật Quy tắc" : "Thêm Quy tắc"}
              </button>
            </div>
          }
        >
          <form id="firewall-rule-form" onSubmit={handleSaveRule} className="space-y-4 text-xs">
              {/* Presets Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Mẫu dịch vụ phổ biến (Presets):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "dsm", label: "DSM Web (5000/5001)" },
                    { id: "ssh", label: "SSH (22)" },
                    { id: "web", label: "Web Server (80/443)" },
                    { id: "smb", label: "SMB (445)" },
                    { id: "docker", label: "Docker Apps (8080)" },
                    { id: "custom", label: "Tùy chỉnh" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetSelect(p.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                        rulePreset === p.id
                          ? "bg-sky-500 text-white border-sky-500 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

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
                  placeholder="VD: Quản trị DSM Web Nội bộ"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              {/* Ports & Protocol */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Cổng (Ports):
                  </label>
                  <input
                    type="text"
                    required
                    value={rulePorts}
                    onChange={(e) => setRulePorts(e.target.value)}
                    placeholder="5000, 5001 hoặc 80,443"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Giao thức:
                  </label>
                  <select
                    value={ruleProtocol}
                    onChange={(e) => setRuleProtocol(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="all">Tất cả (All)</option>
                  </select>
                </div>
              </div>

              {/* Source IP / Subnet */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Địa chỉ IP Nguồn (Source):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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
                      className={`py-1 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
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

              {/* Action (Allow / Deny) */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Hành động áp dụng:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleAction("allow")}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                      ruleAction === "allow"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Cho phép (Allow)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuleAction("deny")}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                      ruleAction === "deny"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 ring-1 ring-rose-500/20"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Chặn / Từ chối (Deny)</span>
                  </button>
                </div>
              </div>
            </form>
        </ResponsiveModal>
      )}
    </div>
  );
};
