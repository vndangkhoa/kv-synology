export type AclLevel = "FULL_CONTROL" | "READ_WRITE" | "READ" | "DENY" | "CUSTOM" | "NONE";
export type AccessControl = "Allow" | "Deny";
export type AclAccountType = "user" | "group";
export type AclOrigin = "DIRECT" | "INHERITED" | "GROUP";

export interface AclRuleItem {
  id: string | number;
  folderPath: string;
  account: string;
  accountType: AclAccountType;
  accountDesc?: string;
  accessControl: AccessControl;
  level: AclLevel;
  isInherited: boolean;
  rawPermission?: string;
  applyTo?: string;
}

export interface FolderTreeNode {
  path: string;
  name: string;
  lowerPath: string;
  lowerName: string;
  parentPath: string | null;
  depth: number;
  sharedFolder: string;
  lowerSharedFolder: string;
  childrenPaths: string[];
  directPermCount: number;
  hasDeny: boolean;
  hasDirect: boolean;
  hasInherited: boolean;
  levels: AclLevel[];
}

export interface ContributingRule {
  rule: AclRuleItem;
  origin: AclOrigin;
  sourceDesc: string;
}

export interface EffectivePermissionResult {
  effectiveLevel: AclLevel;
  isDenied: boolean;
  contributingRules: ContributingRule[];
}

export interface AclAccountInfo {
  name: string;
  type: AclAccountType;
  desc?: string;
  isAdmin?: boolean;
}

export interface AclAuditFinding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  category: "ROOT_EXCESSIVE" | "DIRECT_FULL_CONTROL" | "EXPLICIT_DENY" | "ORPHAN_RULE";
  type: string;
  path: string;
  account: string;
  accountType: AclAccountType;
  description: string;
  recommendation: string;
}

export interface AclDataset {
  folders: Map<string, FolderTreeNode>;
  rootSharedFolders: string[];
  permissionsByFolder: Map<string, AclRuleItem[]>;
  permissionsByAccount: Map<string, AclRuleItem[]>;
  accountsList: AclAccountInfo[];
  auditIssues: AclAuditFinding[];
  totalRows: number;
  fileName: string;
}
