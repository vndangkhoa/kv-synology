import {
  AclLevel,
  AccessControl,
  AclAccountType,
  AclRuleItem,
  FolderTreeNode,
  ContributingRule,
  EffectivePermissionResult,
  AclAccountInfo,
  AclAuditFinding,
  AclDataset,
} from "./types";
import { DSMClient } from "@/lib/dsm/client";

export const ACL_LEVEL_RANKS: Record<AclLevel, number> = {
  DENY: -1,
  FULL_CONTROL: 3,
  READ_WRITE: 2,
  READ: 1,
  CUSTOM: 1,
  NONE: 0,
};

export function cleanPath(raw: string): string {
  if (!raw) return "/";
  let str = raw.trim();
  // Strip enclosing quotes
  str = str.replace(/^["']|["']$/g, "").trim();
  // Strip Windows drive letters (e.g. C:, D:)
  str = str.replace(/^[a-zA-Z]:[/\\]*/, "");
  // Replace backslashes with forward slashes
  str = str.replace(/\\+/g, "/");
  // Replace multiple slashes
  str = str.replace(/\/+/g, "/");
  // Trim leading/trailing slashes, ensure starts with /
  str = str.replace(/^\/+|\/+$/g, "");
  return str ? "/" + str : "/";
}

export function extractPathParts(path: string): {
  sharedFolder: string;
  parentPath: string | null;
  depth: number;
  name: string;
} {
  const cleaned = cleanPath(path);
  const segments = cleaned.split("/").filter(Boolean);
  let sharedFolder = segments[0] || "Root";
  if (segments[0]?.toLowerCase().startsWith("volume") && segments.length > 1) {
    sharedFolder = segments[1];
  }
  const parentPath = segments.length > 1 ? "/" + segments.slice(0, -1).join("/") : null;
  const name = segments[segments.length - 1] || cleaned;
  return {
    sharedFolder,
    parentPath,
    depth: segments.length,
    name,
  };
}

export function parseAclLevel(permissionStr: string, accessControl: string): AclLevel {
  if (accessControl.toLowerCase().includes("deny") || permissionStr.toLowerCase().includes("deny")) {
    return "DENY";
  }
  const p = (permissionStr || "").toLowerCase();
  if (p.includes("full control") || p.includes("full_control") || p.includes("all")) {
    return "FULL_CONTROL";
  }
  if (p.includes("read & write") || p.includes("read/write") || p.includes("read and write") || (p.includes("read") && p.includes("write"))) {
    return "READ_WRITE";
  }
  if (p.includes("read") || p.includes("ro") || p.includes("view")) {
    return "READ";
  }
  if (p.includes("write") || p.includes("append")) {
    return "READ_WRITE";
  }
  return "CUSTOM";
}

export function calculateEffectivePermission(
  targetAccount: string,
  userGroups: string[] = [],
  directRules: AclRuleItem[] = [],
  inheritedRules: AclRuleItem[] = []
): EffectivePermissionResult {
  const targetLower = targetAccount.toLowerCase();
  const groupSet = new Set(userGroups.map((g) => g.toLowerCase().replace(/^@/, "")));
  const relevantAccounts = new Set([targetLower, ...groupSet]);

  const allRules: { rule: AclRuleItem; origin: "DIRECT" | "INHERITED" | "GROUP" }[] = [
    ...directRules.map((r) => ({
      rule: r,
      origin: r.accountType === "group" || groupSet.has(r.account.toLowerCase()) ? ("GROUP" as const) : ("DIRECT" as const),
    })),
    ...inheritedRules.map((r) => ({
      rule: r,
      origin: r.accountType === "group" || groupSet.has(r.account.toLowerCase()) ? ("GROUP" as const) : ("INHERITED" as const),
    })),
  ].filter((item) => relevantAccounts.has(item.rule.account.toLowerCase().replace(/^@/, "")));

  // 1. Check for Deny rules (Deny always takes top precedence)
  const denyItem = allRules.find((item) => item.rule.accessControl === "Deny" || item.rule.level === "DENY");
  if (denyItem) {
    const isViaGroup = groupSet.has(denyItem.rule.account.toLowerCase().replace(/^@/, ""));
    const sourceDesc = isViaGroup
      ? `Bị từ chối qua nhóm @${denyItem.rule.account}`
      : denyItem.origin === "INHERITED"
      ? "Bị từ chối kế thừa từ thư mục cha"
      : "Bị từ chối trực tiếp tại thư mục này";

    return {
      effectiveLevel: "DENY",
      isDenied: true,
      contributingRules: [
        {
          rule: denyItem.rule,
          origin: isViaGroup ? "GROUP" : denyItem.origin,
          sourceDesc,
        },
      ],
    };
  }

  // 2. Aggregate Allow rules and pick highest privilege level
  let highestRank = 0;
  let effectiveLevel: AclLevel = "NONE";
  const contributingRules: ContributingRule[] = [];

  for (const item of allRules) {
    const isViaGroup = groupSet.has(item.rule.account.toLowerCase().replace(/^@/, ""));
    const origin = isViaGroup ? "GROUP" : item.origin;
    const rank = ACL_LEVEL_RANKS[item.rule.level] || 0;

    let sourceDesc = "";
    if (origin === "DIRECT") {
      sourceDesc = "Gán trực tiếp (Direct ACL)";
    } else if (origin === "INHERITED") {
      sourceDesc = "Kế thừa từ thư mục cha (Inherited)";
    } else {
      sourceDesc = `Kế thừa qua nhóm @${item.rule.account}`;
    }

    contributingRules.push({
      rule: item.rule,
      origin,
      sourceDesc,
    });

    if (rank > highestRank) {
      highestRank = rank;
      effectiveLevel = item.rule.level;
    }
  }

  return {
    effectiveLevel,
    isDenied: false,
    contributingRules,
  };
}

export function scanSecurityAudit(
  folders: Map<string, FolderTreeNode>,
  permissionsByFolder: Map<string, AclRuleItem[]>
): AclAuditFinding[] {
  const issues: AclAuditFinding[] = [];
  let issueCounter = 0;
  const publicGroupNames = new Set([
    "everyone",
    "domain users",
    "authenticated users",
    "guests",
    "all users",
    "users",
    "anonymous",
  ]);

  for (const [folderPath, rules] of permissionsByFolder.entries()) {
    const node = folders.get(folderPath);
    const depth = node ? node.depth : folderPath.split("/").filter(Boolean).length;

    for (const r of rules) {
      const accLower = r.account.toLowerCase().replace(/^@/, "");

      // 1. Excessive permissions at root or depth <= 2
      if (
        depth <= 2 &&
        publicGroupNames.has(accLower) &&
        (r.level === "FULL_CONTROL" || r.level === "READ_WRITE")
      ) {
        issues.push({
          id: `audit-${++issueCounter}`,
          severity: "CRITICAL",
          category: "ROOT_EXCESSIVE",
          type: "Quyền Quá Rộng Tại Gốc (Root Excessive Rights)",
          path: folderPath,
          account: r.account,
          accountType: r.accountType,
          description: `Nhóm công cộng "${r.account}" được cấp quyền ${r.level} tại cấp độ ${depth} (gần root), có nguy cơ lan quyền mất kiểm soát xuống toàn bộ thư mục con.`,
          recommendation: `Hạ quyền nhóm công cộng xuống "Read" hoặc loại bỏ quyền trực tiếp tại gốc, chỉ cấp quyền cụ thể theo từng phòng ban.`,
        });
      }

      // 2. Direct Full Control to individual users
      if (!r.isInherited && r.accountType === "user" && r.level === "FULL_CONTROL") {
        issues.push({
          id: `audit-${++issueCounter}`,
          severity: "HIGH",
          category: "DIRECT_FULL_CONTROL",
          type: "Full Control Gán Trực Tiếp Cho User (Explicit Admin)",
          path: folderPath,
          account: r.account,
          accountType: r.accountType,
          description: `Tài khoản cá nhân "${r.account}" được gán Full Control trực tiếp (Explicit) thay vì quản lý tập trung qua nhóm quản trị (Group RBAC).`,
          recommendation: `Đưa user vào nhóm quản trị tương ứng (ví dụ @administrators hoặc @dept_managers) và gán quyền theo nhóm để dễ kiểm soát thu hồi.`,
        });
      }

      // 3. Explicit Deny Rules
      if (r.accessControl === "Deny" || r.level === "DENY") {
        issues.push({
          id: `audit-${++issueCounter}`,
          severity: "MEDIUM",
          category: "EXPLICIT_DENY",
          type: "Quy Tắc Chặn (Explicit Deny Rule)",
          path: folderPath,
          account: r.account,
          accountType: r.accountType,
          description: `Quy tắc Deny áp dụng cho "${r.account}" sẽ ghi đè và hủy bỏ tất cả quyền Allow kế thừa.`,
          recommendation: `Xem xét cấu trúc phân quyền danh sách Allow thay vì dùng Deny để tránh xung đột ngầm và khó kiểm tra.`,
        });
      }
    }
  }

  return issues;
}

export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parseAclCsv(csvText: string, scopeFolder = "ALL"): AclDataset {
  const folders = new Map<string, FolderTreeNode>();
  const folderLevelsMap = new Map<string, Set<AclLevel>>();
  const permissionsByFolder = new Map<string, AclRuleItem[]>();
  const permissionsByAccount = new Map<string, AclRuleItem[]>();
  const accountsMap = new Map<string, { type: AclAccountType; desc: string }>();
  const rootSharedFolders = new Set<string>();

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      folders,
      rootSharedFolders: [],
      permissionsByFolder,
      permissionsByAccount,
      accountsList: [],
      auditIssues: [],
      totalRows: 0,
      fileName: "Empty.csv",
    };
  }

  // Parse header
  const headerCols = splitCsvLine(lines[0]).map((c) => c.toLowerCase().replace(/^["']|["']$/g, ""));
  let pathIdx = headerCols.findIndex((c) => c === "path" || c === "folder path" || c === "directory" || c.includes("path"));
  let accTypeIdx = headerCols.findIndex((c) => c === "account type" || c === "principal type" || c === "type" || c.includes("account type"));
  let accIdx = headerCols.findIndex((c) => c === "account" || c === "account name" || c === "user" || c === "user/group" || c === "trustee" || (c.includes("account") && !c.includes("type") && !c.includes("desc")));
  let accDescIdx = headerCols.findIndex((c) => c === "account description" || c === "description" || c.includes("desc"));
  let inheritedIdx = headerCols.findIndex((c) => c === "inherited" || c.startsWith("inherit"));
  let accessControlIdx = headerCols.findIndex((c) => c === "access control" || c === "allow/deny" || c.includes("access control"));
  let permissionIdx = headerCols.findIndex((c) => c === "permission" || c === "rights" || c === "privilege" || c.includes("permission"));

  if (pathIdx === -1) pathIdx = 0;
  if (accIdx === -1) accIdx = 2;

  const ensureFolderNode = (folderPath: string): FolderTreeNode => {
    let currentPath: string | null = folderPath;
    let targetNode: FolderTreeNode | null = null;

    while (currentPath) {
      if (folders.has(currentPath)) {
        if (currentPath === folderPath) targetNode = folders.get(currentPath)!;
        break;
      }
      const { sharedFolder, parentPath, depth, name } = extractPathParts(currentPath);
      rootSharedFolders.add(sharedFolder);
      const node: FolderTreeNode = {
        path: currentPath,
        name,
        lowerPath: currentPath.toLowerCase(),
        lowerName: name.toLowerCase(),
        parentPath,
        depth,
        sharedFolder,
        lowerSharedFolder: sharedFolder.toLowerCase(),
        childrenPaths: [],
        directPermCount: 0,
        hasDeny: false,
        hasDirect: false,
        hasInherited: false,
        levels: [],
      };
      folders.set(currentPath, node);
      folderLevelsMap.set(currentPath, new Set<AclLevel>());
      if (currentPath === folderPath) targetNode = node;
      currentPath = parentPath;
    }
    return targetNode || folders.get(folderPath)!;
  };

  let rowCount = 0;
  let ruleId = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cleanCols = splitCsvLine(rawLine).map((c) => c.replace(/^["']|["']$/g, "").trim());

    const rawPath = cleanCols[pathIdx] || "";
    const rawAccount = cleanCols[accIdx] || "";
    if (!rawPath || !rawAccount || rawPath.toLowerCase() === "path") continue;

    const normalizedPath = cleanPath(rawPath);
    const { sharedFolder } = extractPathParts(normalizedPath);
    if (scopeFolder !== "ALL" && sharedFolder !== scopeFolder) continue;

    rowCount++;
    const node = ensureFolderNode(normalizedPath);
    const accountType: AclAccountType = (cleanCols[accTypeIdx] || "").toLowerCase().includes("group") ? "group" : "user";
    const accessControl: AccessControl = (cleanCols[accessControlIdx] || "Allow").toLowerCase().includes("deny") ? "Deny" : "Allow";
    const rawPerm = cleanCols[permissionIdx] || "Read";
    const level = parseAclLevel(rawPerm, accessControl);
    const inheritedRaw = (cleanCols[inheritedIdx] || "").toUpperCase();
    const isInherited = inheritedRaw === "TRUE" || inheritedRaw === "YES" || inheritedRaw === "1";
    const accountDesc = cleanCols[accDescIdx] || "";

    if (isInherited) {
      node.hasInherited = true;
    } else {
      node.hasDirect = true;
      node.directPermCount++;
    }

    if (accessControl === "Deny" || level === "DENY") {
      node.hasDeny = true;
    }

    const levelsSet = folderLevelsMap.get(normalizedPath);
    if (levelsSet) levelsSet.add(level);

    const ruleItem: AclRuleItem = {
      id: ++ruleId,
      folderPath: normalizedPath,
      account: rawAccount,
      accountType,
      accountDesc,
      accessControl,
      level,
      isInherited,
      rawPermission: rawPerm,
    };

    if (!permissionsByFolder.has(normalizedPath)) {
      permissionsByFolder.set(normalizedPath, []);
    }
    permissionsByFolder.get(normalizedPath)!.push(ruleItem);

    if (!permissionsByAccount.has(rawAccount)) {
      permissionsByAccount.set(rawAccount, []);
    }
    permissionsByAccount.get(rawAccount)!.push(ruleItem);

    if (!accountsMap.has(rawAccount)) {
      accountsMap.set(rawAccount, { type: accountType, desc: accountDesc });
    }
  }

  // Link child paths into parent nodes
  for (const [p, node] of folders.entries()) {
    const levels = folderLevelsMap.get(p);
    if (levels) node.levels = Array.from(levels);

    if (node.parentPath && folders.has(node.parentPath)) {
      const parentNode = folders.get(node.parentPath)!;
      if (!parentNode.childrenPaths.includes(p)) {
        parentNode.childrenPaths.push(p);
      }
    }
  }

  const accountsList: AclAccountInfo[] = Array.from(accountsMap.entries()).map(([name, info]) => ({
    name,
    type: info.type,
    desc: info.desc,
  }));

  const auditIssues = scanSecurityAudit(folders, permissionsByFolder);

  return {
    folders,
    rootSharedFolders: Array.from(rootSharedFolders),
    permissionsByFolder,
    permissionsByAccount,
    accountsList,
    auditIssues,
    totalRows: rowCount,
    fileName: "Imported_NAS_ACL.csv",
  };
}

// In-memory cache for live NAS dataset to make tab switches and re-renders instant
let cachedLiveNasDataset: AclDataset | null = null;
let lastCacheTime = 0;

/**
 * Builds an AclDataset directly from the live NAS machine using DSM Client APIs with high performance parallel queries & caching
 */
export async function buildDatasetFromLiveNas(client: DSMClient, forceRefresh = false): Promise<AclDataset> {
  const now = Date.now();
  if (!forceRefresh && cachedLiveNasDataset && now - lastCacheTime < 60000) {
    return cachedLiveNasDataset;
  }

  const folders = new Map<string, FolderTreeNode>();
  const folderLevelsMap = new Map<string, Set<AclLevel>>();
  const permissionsByFolder = new Map<string, AclRuleItem[]>();
  const permissionsByAccount = new Map<string, AclRuleItem[]>();
  const accountsMap = new Map<string, { type: AclAccountType; desc: string }>();
  const rootSharedFolders = new Set<string>();

  // 1. Get real users & groups and top-level shares in parallel (< 100ms)
  const [users, groups, realShares] = await Promise.all([
    client.getDsmUsers().catch(() => []),
    client.getDsmGroups().catch(() => []),
    client.listFiles("/").catch(() => []),
  ]);

  users.forEach((u) => {
    accountsMap.set(u.name, {
      type: "user",
      desc: u.description || (u.isAdmin ? "Quản trị viên (Admin)" : "Người dùng DSM"),
    });
  });

  groups.forEach((g) => {
    accountsMap.set(g.name, {
      type: "group",
      desc: g.description || `Nhóm ${g.name} (${g.members?.length || 0} thành viên)`,
    });
  });

  // 2. Discover shared folders and immediate subfolders in parallel
  const folderPathsToScan: string[] = [];
  if (realShares.length > 0) {
    for (const share of realShares) {
      folderPathsToScan.push(share.path);
    }

    // Parallel fetch immediate subdirectories for top shares
    const subQueries = realShares.slice(0, 10).map((share) =>
      client.listFiles(share.path).then((items) => {
        for (const sub of items.filter((i: any) => i.isdir)) {
          folderPathsToScan.push(sub.path);
        }
      }).catch(() => {})
    );
    await Promise.allSettled(subQueries);
  }

  // Fallback if no shares returned
  if (folderPathsToScan.length === 0) {
    folderPathsToScan.push(
      "/volume1/homes",
      "/volume1/web",
      "/volume1/docker",
      "/volume1/projects",
      "/volume1/backup",
      "/volume1/media"
    );
  }

  const ensureFolderNode = (folderPath: string): FolderTreeNode => {
    let currentPath: string | null = folderPath;
    let targetNode: FolderTreeNode | null = null;

    while (currentPath) {
      if (folders.has(currentPath)) {
        if (currentPath === folderPath) targetNode = folders.get(currentPath)!;
        break;
      }
      const { sharedFolder, parentPath, depth, name } = extractPathParts(currentPath);
      rootSharedFolders.add(sharedFolder);
      const node: FolderTreeNode = {
        path: currentPath,
        name,
        lowerPath: currentPath.toLowerCase(),
        lowerName: name.toLowerCase(),
        parentPath,
        depth,
        sharedFolder,
        lowerSharedFolder: sharedFolder.toLowerCase(),
        childrenPaths: [],
        directPermCount: 0,
        hasDeny: false,
        hasDirect: false,
        hasInherited: false,
        levels: [],
      };
      folders.set(currentPath, node);
      folderLevelsMap.set(currentPath, new Set<AclLevel>());
      if (currentPath === folderPath) targetNode = node;
      currentPath = parentPath;
    }
    return targetNode || folders.get(folderPath)!;
  };

  let rowCount = 0;
  let ruleId = 0;

  // 3. Query real ACL for discovered folders in parallel
  const aclQueries = folderPathsToScan.map(async (fPath) => {
    const node = ensureFolderNode(fPath);
    const aclInfo = await client.getFolderAclInfo(fPath).catch(() => null);
    if (!aclInfo) return;

    for (const rule of aclInfo.accessList) {
      rowCount++;
      const isInherited = rule.inheritance === "inherited_folder" || rule.inheritance === "inherited_group";
      const level: AclLevel =
        rule.level === "full_control"
          ? "FULL_CONTROL"
          : rule.level === "read_write"
          ? "READ_WRITE"
          : rule.level === "read_only"
          ? "READ"
          : rule.level === "deny"
          ? "DENY"
          : "CUSTOM";

      if (isInherited) {
        node.hasInherited = true;
      } else {
        node.hasDirect = true;
        node.directPermCount++;
      }

      if (level === "DENY") {
        node.hasDeny = true;
      }

      const levelsSet = folderLevelsMap.get(fPath);
      if (levelsSet) levelsSet.add(level);

      const ruleItem: AclRuleItem = {
        id: ++ruleId,
        folderPath: fPath,
        account: rule.targetName,
        accountType: rule.isGroup ? "group" : "user",
        accountDesc: rule.explanation,
        accessControl: level === "DENY" ? "Deny" : "Allow",
        level,
        isInherited,
        rawPermission: rule.level,
      };

      if (!permissionsByFolder.has(fPath)) {
        permissionsByFolder.set(fPath, []);
      }
      permissionsByFolder.get(fPath)!.push(ruleItem);

      if (!permissionsByAccount.has(rule.targetName)) {
        permissionsByAccount.set(rule.targetName, []);
      }
      permissionsByAccount.get(rule.targetName)!.push(ruleItem);

      if (!accountsMap.has(rule.targetName)) {
        accountsMap.set(rule.targetName, {
          type: rule.isGroup ? "group" : "user",
          desc: rule.explanation || "",
        });
      }
    }
  });

  await Promise.allSettled(aclQueries);

  // Link child paths
  for (const [p, node] of folders.entries()) {
    const levels = folderLevelsMap.get(p);
    if (levels) node.levels = Array.from(levels);

    if (node.parentPath && folders.has(node.parentPath)) {
      const parentNode = folders.get(node.parentPath)!;
      if (!parentNode.childrenPaths.includes(p)) {
        parentNode.childrenPaths.push(p);
      }
    }
  }

  const accountsList: AclAccountInfo[] = Array.from(accountsMap.entries()).map(([name, info]) => ({
    name,
    type: info.type,
    desc: info.desc,
  }));

  const auditIssues = scanSecurityAudit(folders, permissionsByFolder);

  const session = client.getSession();
  const machineName = session.hostname || session.model || "Synology DSM";

  const result: AclDataset = {
    folders,
    rootSharedFolders: Array.from(rootSharedFolders),
    permissionsByFolder,
    permissionsByAccount,
    accountsList,
    auditIssues,
    totalRows: rowCount,
    fileName: `Live NAS (${machineName})`,
  };

  cachedLiveNasDataset = result;
  lastCacheTime = Date.now();
  return result;
}
