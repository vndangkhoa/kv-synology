//! The Rust port of `src/lib/permissions/aclEngine.ts`.

#![forbid(unsafe_code)]

use indexmap::{IndexMap, IndexSet};
use serde::Serialize;
use serde_json::{Value, json};

fn js_trim(s: &str) -> &str {
    s.trim_matches(|c: char| c.is_whitespace() || c == '\u{FEFF}')
}

fn strip_enclosing_quote_once(s: &str) -> &str {
    let mut out = s;
    if let Some(rest) = out.strip_prefix('"').or_else(|| out.strip_prefix('\'')) {
        out = rest;
    }
    if let Some(rest) = out.strip_suffix('"').or_else(|| out.strip_suffix('\'')) {
        out = rest;
    }
    out
}

fn acl_level_rank(level: &str) -> i64 {
    match level {
        "DENY" => -1,
        "FULL_CONTROL" => 3,
        "READ_WRITE" => 2,
        "READ" | "CUSTOM" => 1,
        _ => 0,
    }
}

/// Port of `cleanPath` (`src/lib/permissions/aclEngine.ts:24`).
pub fn clean_path(raw: String) -> Result<String, String> {
    if raw.is_empty() {
        return Ok("/".to_string());
    }
    let s = js_trim(&raw);
    let s = strip_enclosing_quote_once(s);
    let s = js_trim(s);
    // Strip Windows drive letters (e.g. C:\, D:/).
    let b = s.as_bytes();
    let s = if b.len() >= 2 && b[0].is_ascii_alphabetic() && b[1] == b':' {
        let mut idx = 2;
        while idx < b.len() && (b[idx] == b'/' || b[idx] == b'\\') {
            idx += 1;
        }
        &s[idx..]
    } else {
        s
    };
    let parts: Vec<&str> = s.split(['/', '\\']).filter(|p| !p.is_empty()).collect();
    if parts.is_empty() {
        Ok("/".to_string())
    } else {
        Ok(format!("/{}", parts.join("/")))
    }
}

/// Port of `extractPathParts` (`src/lib/permissions/aclEngine.ts:40`).
pub fn extract_path_parts(path: String) -> Result<Value, String> {
    let cleaned = clean_path(path)?;
    let segments: Vec<&str> = cleaned.split('/').filter(|s| !s.is_empty()).collect();
    let mut shared_folder = segments.first().copied().unwrap_or("Root");
    if segments
        .first()
        .is_some_and(|s| s.to_lowercase().starts_with("volume"))
        && segments.len() > 1
    {
        shared_folder = segments[1];
    }
    let parent_path = if segments.len() > 1 {
        Value::String(format!("/{}", segments[..segments.len() - 1].join("/")))
    } else {
        Value::Null
    };
    let name = segments.last().copied().unwrap_or(&cleaned);
    Ok(json!({
        "sharedFolder": shared_folder,
        "parentPath": parent_path,
        "depth": segments.len(),
        "name": name,
    }))
}

/// Port of `parseAclLevel` (`src/lib/permissions/aclEngine.ts:62`).
pub fn parse_acl_level(permission_str: String, access_control: String) -> Result<String, String> {
    if access_control.to_lowercase().contains("deny")
        || permission_str.to_lowercase().contains("deny")
    {
        return Ok("DENY".to_string());
    }
    let p = permission_str.to_lowercase();
    if p.contains("full control") || p.contains("full_control") || p.contains("all") {
        return Ok("FULL_CONTROL".to_string());
    }
    if p.contains("read & write")
        || p.contains("read/write")
        || p.contains("read and write")
        || (p.contains("read") && p.contains("write"))
    {
        return Ok("READ_WRITE".to_string());
    }
    if p.contains("read") || p.contains("ro") || p.contains("view") {
        return Ok("READ".to_string());
    }
    if p.contains("write") || p.contains("append") {
        return Ok("READ_WRITE".to_string());
    }
    Ok("CUSTOM".to_string())
}

struct RuleEntry {
    rule: Value,
    account: String,
    access_control: String,
    level: String,
    origin: &'static str,
}

fn extract_rule_vec(v: Value, name: &str) -> Result<Vec<Value>, String> {
    if crate::js::is_undefined(&v) {
        return Ok(Vec::new());
    }
    if v.is_null() {
        return Err("TypeError: Cannot read properties of null (reading 'map')".to_string());
    }
    match v {
        Value::Array(arr) => Ok(arr),
        _ => Err(format!(
            "TypeError: {name}.map is not a function or its return value is not iterable"
        )),
    }
}

fn extract_group_vec(v: Value) -> Result<Vec<String>, String> {
    if crate::js::is_undefined(&v) {
        return Ok(Vec::new());
    }
    if v.is_null() {
        return Err("TypeError: Cannot read properties of null (reading 'map')".to_string());
    }
    match v {
        Value::Array(arr) => arr
            .into_iter()
            .map(|item| {
                item.as_str().map(ToString::to_string).ok_or_else(|| {
                    "TypeError: Cannot read properties of non-string group".to_string()
                })
            })
            .collect(),
        _ => Err(
            "TypeError: userGroups.map is not a function or its return value is not iterable"
                .to_string(),
        ),
    }
}

/// Port of `calculateEffectivePermission` (`src/lib/permissions/aclEngine.ts:82`).
pub fn calculate_effective_permission(
    target_account: String,
    user_groups: Value,
    direct_rules: Value,
    inherited_rules: Value,
) -> Result<Value, String> {
    let user_groups = extract_group_vec(user_groups)?;
    let direct_rules = extract_rule_vec(direct_rules, "directRules")?;
    let inherited_rules = extract_rule_vec(inherited_rules, "inheritedRules")?;

    let target_lower = target_account.to_lowercase();
    let group_set: IndexSet<String> = user_groups
        .iter()
        .map(|g| {
            let l = g.to_lowercase();
            l.strip_prefix('@').unwrap_or(&l).to_string()
        })
        .collect();

    let mut relevant_accounts: IndexSet<String> = IndexSet::new();
    relevant_accounts.insert(target_lower);
    for g in &group_set {
        relevant_accounts.insert(g.clone());
    }

    let mut all_rules: Vec<RuleEntry> = Vec::new();
    let mut push_rules = |rules: Vec<Value>, fallback_origin: &'static str| -> Result<(), String> {
        for r in rules {
            let obj = r.as_object().ok_or_else(|| {
                "TypeError: Cannot read properties of non-object rule".to_string()
            })?;
            let account = obj
                .get("account")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    "TypeError: Cannot read properties of undefined (reading 'toLowerCase')"
                        .to_string()
                })?
                .to_string();
            let account_type = obj
                .get("accountType")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let access_control = obj
                .get("accessControl")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let level = obj
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let acc_lower = account.to_lowercase();
            let origin = if account_type == "group" || group_set.contains(&acc_lower) {
                "GROUP"
            } else {
                fallback_origin
            };
            let normalized = acc_lower.strip_prefix('@').unwrap_or(&acc_lower);
            if relevant_accounts.contains(normalized) {
                all_rules.push(RuleEntry {
                    rule: r,
                    account,
                    access_control,
                    level,
                    origin,
                });
            }
        }
        Ok(())
    };

    push_rules(direct_rules, "DIRECT")?;
    push_rules(inherited_rules, "INHERITED")?;

    if let Some(deny_item) = all_rules
        .iter()
        .find(|item| item.access_control == "Deny" || item.level == "DENY")
    {
        let acc_lower = deny_item.account.to_lowercase();
        let norm = acc_lower.strip_prefix('@').unwrap_or(&acc_lower);
        let is_via_group = group_set.contains(norm);
        let source_desc = if is_via_group {
            format!("Bị từ chối qua nhóm @{}", deny_item.account)
        } else if deny_item.origin == "INHERITED" {
            "Bị từ chối kế thừa từ thư mục cha".to_string()
        } else {
            "Bị từ chối trực tiếp tại thư mục này".to_string()
        };
        let origin = if is_via_group {
            "GROUP"
        } else {
            deny_item.origin
        };
        return Ok(json!({
            "effectiveLevel": "DENY",
            "isDenied": true,
            "contributingRules": [{
                "rule": deny_item.rule,
                "origin": origin,
                "sourceDesc": source_desc,
            }],
        }));
    }

    let mut highest_rank: i64 = 0;
    let mut effective_level = "NONE".to_string();
    let mut contributing_rules: Vec<Value> = Vec::with_capacity(all_rules.len());

    for item in all_rules {
        let acc_lower = item.account.to_lowercase();
        let norm = acc_lower.strip_prefix('@').unwrap_or(&acc_lower);
        let is_via_group = group_set.contains(norm);
        let origin = if is_via_group { "GROUP" } else { item.origin };
        let rank = acl_level_rank(&item.level);

        let source_desc = if origin == "DIRECT" {
            "Gán trực tiếp (Direct ACL)".to_string()
        } else if origin == "INHERITED" {
            "Kế thừa từ thư mục cha (Inherited)".to_string()
        } else {
            format!("Kế thừa qua nhóm @{}", item.account)
        };

        contributing_rules.push(json!({
            "rule": item.rule,
            "origin": origin,
            "sourceDesc": source_desc,
        }));

        if rank > highest_rank {
            highest_rank = rank;
            effective_level = item.level;
        }
    }

    Ok(json!({
        "effectiveLevel": effective_level,
        "isDenied": false,
        "contributingRules": contributing_rules,
    }))
}

fn parse_js_map_entries(val: &Value) -> Option<&Vec<Value>> {
    let obj = val.as_object()?;
    if obj.len() != 1 {
        return None;
    }
    obj.get("$map")?.as_array()
}

/// Port of `scanSecurityAudit` (`src/lib/permissions/aclEngine.ts:164`).
pub fn scan_security_audit(
    folders: Value,
    permissions_by_folder: Value,
) -> Result<Vec<Value>, String> {
    if let Value::Array(arr) = &permissions_by_folder {
        if arr.is_empty() {
            return Ok(Vec::new());
        }
        let _ = parse_js_map_entries(&folders)
            .ok_or_else(|| "folders.get is not a function".to_string())?;
        for r in arr {
            if !r.is_array() {
                return Err("TypeError: rules is not iterable".to_string());
            }
        }
    }
    let perm_entries = parse_js_map_entries(&permissions_by_folder).ok_or_else(|| {
        "permissionsByFolder.entries is not a function or its return value is not iterable"
            .to_string()
    })?;

    let folders_entries = if perm_entries.is_empty() {
        None
    } else {
        Some(
            parse_js_map_entries(&folders)
                .ok_or_else(|| "folders.get is not a function".to_string())?,
        )
    };

    let mut folder_depth_map: IndexMap<&str, usize> = IndexMap::new();
    if let Some(entries) = folders_entries {
        for pair in entries {
            let Some(arr) = pair.as_array() else {
                continue;
            };
            if arr.len() >= 2
                && let Some(key) = arr[0].as_str()
                && let Some(d) = arr[1].get("depth").and_then(|v| v.as_u64())
            {
                folder_depth_map.insert(key, d as usize);
            }
        }
    }

    let public_groups = [
        "everyone",
        "domain users",
        "authenticated users",
        "guests",
        "all users",
        "users",
        "anonymous",
    ];

    let mut issues: Vec<Value> = Vec::new();
    let mut issue_counter: usize = 0;

    for pair in perm_entries {
        let pair_arr = pair
            .as_array()
            .ok_or_else(|| "TypeError: invalid map entry".to_string())?;
        if pair_arr.len() < 2 {
            return Err("TypeError: invalid map entry".to_string());
        }
        let folder_path = pair_arr[0]
            .as_str()
            .ok_or_else(|| "TypeError: folderPath must be a string".to_string())?;
        let rules = pair_arr[1]
            .as_array()
            .ok_or_else(|| "rules is not iterable".to_string())?;

        let depth = folder_depth_map
            .get(folder_path)
            .copied()
            .unwrap_or_else(|| folder_path.split('/').filter(|s| !s.is_empty()).count());

        for r in rules {
            let obj = r
                .as_object()
                .ok_or_else(|| "TypeError: Cannot read properties of null".to_string())?;
            let account = obj.get("account").and_then(|v| v.as_str()).ok_or_else(|| {
                "TypeError: Cannot read properties of undefined (reading 'toLowerCase')".to_string()
            })?;
            let account_type = obj
                .get("accountType")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let level = obj.get("level").and_then(|v| v.as_str()).unwrap_or("");
            let access_control = obj
                .get("accessControl")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let is_inherited = obj
                .get("isInherited")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            let acc_low = account.to_lowercase();
            let acc_lower = acc_low.strip_prefix('@').unwrap_or(&acc_low);

            if depth <= 2
                && public_groups.contains(&acc_lower)
                && (level == "FULL_CONTROL" || level == "READ_WRITE")
            {
                issue_counter += 1;
                issues.push(json!({
                    "id": format!("audit-{issue_counter}"),
                    "severity": "CRITICAL",
                    "category": "ROOT_EXCESSIVE",
                    "type": "Quyền Quá Rộng Tại Gốc (Root Excessive Rights)",
                    "path": folder_path,
                    "account": account,
                    "accountType": account_type,
                    "description": format!("Nhóm công cộng \"{account}\" được cấp quyền {level} tại cấp độ {depth} (gần root), có nguy cơ lan quyền mất kiểm soát xuống toàn bộ thư mục con."),
                    "recommendation": "Hạ quyền nhóm công cộng xuống \"Read\" hoặc loại bỏ quyền trực tiếp tại gốc, chỉ cấp quyền cụ thể theo từng phòng ban.",
                }));
            }

            if !is_inherited && account_type == "user" && level == "FULL_CONTROL" {
                issue_counter += 1;
                issues.push(json!({
                    "id": format!("audit-{issue_counter}"),
                    "severity": "HIGH",
                    "category": "DIRECT_FULL_CONTROL",
                    "type": "Full Control Gán Trực Tiếp Cho User (Explicit Admin)",
                    "path": folder_path,
                    "account": account,
                    "accountType": account_type,
                    "description": format!("Tài khoản cá nhân \"{account}\" được gán Full Control trực tiếp (Explicit) thay vì quản lý tập trung qua nhóm quản trị (Group RBAC)."),
                    "recommendation": "Đưa user vào nhóm quản trị tương ứng (ví dụ @administrators hoặc @dept_managers) và gán quyền theo nhóm để dễ kiểm soát thu hồi.",
                }));
            }

            if access_control == "Deny" || level == "DENY" {
                issue_counter += 1;
                issues.push(json!({
                    "id": format!("audit-{issue_counter}"),
                    "severity": "MEDIUM",
                    "category": "EXPLICIT_DENY",
                    "type": "Quy Tắc Chặn (Explicit Deny Rule)",
                    "path": folder_path,
                    "account": account,
                    "accountType": account_type,
                    "description": format!("Quy tắc Deny áp dụng cho \"{account}\" sẽ ghi đè và hủy bỏ tất cả quyền Allow kế thừa."),
                    "recommendation": "Xem xét cấu trúc phân quyền danh sách Allow thay vì dùng Deny để tránh xung đột ngầm và khó kiểm tra.",
                }));
            }
        }
    }

    Ok(issues)
}

/// Port of `splitCsvLine` (`src/lib/permissions/aclEngine.ts:241`).
pub fn split_csv_line(line: String) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if ch == '"' {
            if in_quotes && chars.get(i + 1) == Some(&'"') {
                cur.push('"');
                i += 1;
            } else {
                in_quotes = !in_quotes;
            }
        } else if ch == ',' && !in_quotes {
            result.push(js_trim(&cur).to_string());
            cur.clear();
        } else {
            cur.push(ch);
        }
        i += 1;
    }
    result.push(js_trim(&cur).to_string());
    Ok(result)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderTreeNode {
    path: String,
    name: String,
    lower_path: String,
    lower_name: String,
    parent_path: Option<String>,
    depth: usize,
    shared_folder: String,
    lower_shared_folder: String,
    children_paths: Vec<String>,
    direct_perm_count: usize,
    has_deny: bool,
    has_direct: bool,
    has_inherited: bool,
    levels: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AclRuleItemOut {
    id: usize,
    folder_path: String,
    account: String,
    account_type: String,
    account_desc: String,
    access_control: String,
    level: String,
    is_inherited: bool,
    raw_permission: String,
}

struct AccountMeta {
    acc_type: String,
    desc: String,
}

fn find_col_idx(headers: &[String], exact: &[&str], pred: impl Fn(&str) -> bool) -> Option<usize> {
    headers
        .iter()
        .position(|c| exact.contains(&c.as_str()) || pred(c))
}

fn encode_index_map<V: Serialize>(map: &IndexMap<String, V>) -> Result<Value, String> {
    let mut pairs = Vec::with_capacity(map.len());
    for (k, v) in map {
        let val = serde_json::to_value(v).map_err(|e| e.to_string())?;
        pairs.push(json!([k, val]));
    }
    Ok(json!({ "$map": pairs }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AclDatasetOut {
    pub folders: Value,
    pub root_shared_folders: Vec<String>,
    pub permissions_by_folder: Value,
    pub permissions_by_account: Value,
    pub accounts_list: Vec<Value>,
    pub audit_issues: Vec<Value>,
    pub total_rows: usize,
    pub file_name: String,
}

/// Port of `parseAclCsv` (`src/lib/permissions/aclEngine.ts:265`).
pub fn parse_acl_csv(
    csv_text: String,
    scope_folder: Option<String>,
) -> Result<AclDatasetOut, String> {
    let scope_folder = scope_folder.unwrap_or_else(|| "ALL".to_string());

    let mut folders: IndexMap<String, FolderTreeNode> = IndexMap::new();
    let mut folder_levels_map: IndexMap<String, IndexSet<String>> = IndexMap::new();
    let mut permissions_by_folder: IndexMap<String, Vec<AclRuleItemOut>> = IndexMap::new();
    let mut permissions_by_account: IndexMap<String, Vec<AclRuleItemOut>> = IndexMap::new();
    let mut accounts_map: IndexMap<String, AccountMeta> = IndexMap::new();
    let mut root_shared_folders: IndexSet<String> = IndexSet::new();

    let lines: Vec<&str> = csv_text
        .split('\n')
        .map(|s| s.strip_suffix('\r').unwrap_or(s))
        .filter(|l| !js_trim(l).is_empty())
        .collect();

    if lines.is_empty() {
        return Ok(AclDatasetOut {
            folders: json!({ "$map": [] }),
            root_shared_folders: Vec::new(),
            permissions_by_folder: json!({ "$map": [] }),
            permissions_by_account: json!({ "$map": [] }),
            accounts_list: Vec::new(),
            audit_issues: Vec::new(),
            total_rows: 0,
            file_name: "Empty.csv".to_string(),
        });
    }

    let header_raw = split_csv_line(lines[0].to_string())?;
    let header_cols: Vec<String> = header_raw
        .iter()
        .map(|c| strip_enclosing_quote_once(&c.to_lowercase()).to_string())
        .collect();

    let path_idx = find_col_idx(&header_cols, &["path", "folder path", "directory"], |c| {
        c.contains("path")
    })
    .unwrap_or(0);
    let acc_type_idx = find_col_idx(
        &header_cols,
        &["account type", "principal type", "type"],
        |c| c.contains("account type"),
    );
    let acc_idx = find_col_idx(
        &header_cols,
        &["account", "account name", "user", "user/group", "trustee"],
        |c| c.contains("account") && !c.contains("type") && !c.contains("desc"),
    )
    .unwrap_or(2);
    let acc_desc_idx = find_col_idx(&header_cols, &["account description", "description"], |c| {
        c.contains("desc")
    });
    let inherited_idx = find_col_idx(&header_cols, &["inherited"], |c| c.starts_with("inherit"));
    let access_control_idx = find_col_idx(&header_cols, &["access control", "allow/deny"], |c| {
        c.contains("access control")
    });
    let permission_idx = find_col_idx(&header_cols, &["permission", "rights", "privilege"], |c| {
        c.contains("permission")
    });

    let mut row_count: usize = 0;
    let mut rule_id: usize = 0;

    for raw_line in lines.iter().skip(1) {
        let cols_raw = split_csv_line((*raw_line).to_string())?;
        let clean_cols: Vec<String> = cols_raw
            .iter()
            .map(|c| js_trim(strip_enclosing_quote_once(c)).to_string())
            .collect();

        let raw_path = clean_cols.get(path_idx).map_or("", String::as_str);
        let raw_account = clean_cols.get(acc_idx).map_or("", String::as_str);
        if raw_path.is_empty() || raw_account.is_empty() || raw_path.eq_ignore_ascii_case("path") {
            continue;
        }

        let normalized_path = clean_path(raw_path.to_string())?;
        let parts_val = extract_path_parts(normalized_path.clone())?;
        let row_shared_folder = parts_val["sharedFolder"].as_str().unwrap_or("Root");
        if scope_folder != "ALL" && row_shared_folder != scope_folder {
            continue;
        }

        row_count += 1;

        let mut current_path: Option<String> = Some(normalized_path.clone());
        while let Some(cp) = current_path {
            if folders.contains_key(&cp) {
                break;
            }
            let p_info = extract_path_parts(cp.clone())?;
            let sf = p_info["sharedFolder"]
                .as_str()
                .unwrap_or("Root")
                .to_string();
            let pp = p_info["parentPath"].as_str().map(ToString::to_string);
            let depth = p_info["depth"].as_u64().unwrap_or(0) as usize;
            let name = p_info["name"].as_str().unwrap_or("").to_string();
            root_shared_folders.insert(sf.clone());

            let node = FolderTreeNode {
                path: cp.clone(),
                name: name.clone(),
                lower_path: cp.to_lowercase(),
                lower_name: name.to_lowercase(),
                parent_path: pp.clone(),
                depth,
                shared_folder: sf.clone(),
                lower_shared_folder: sf.to_lowercase(),
                children_paths: Vec::new(),
                direct_perm_count: 0,
                has_deny: false,
                has_direct: false,
                has_inherited: false,
                levels: Vec::new(),
            };
            folders.insert(cp.clone(), node);
            folder_levels_map.insert(cp, IndexSet::new());
            current_path = pp;
        }

        let acc_type_cell = acc_type_idx
            .and_then(|idx| clean_cols.get(idx))
            .map_or("", String::as_str);
        let account_type = if acc_type_cell.to_lowercase().contains("group") {
            "group"
        } else {
            "user"
        }
        .to_string();

        let ac_cell = access_control_idx
            .and_then(|idx| clean_cols.get(idx))
            .filter(|s| !s.is_empty())
            .map_or("Allow", String::as_str);
        let access_control = if ac_cell.to_lowercase().contains("deny") {
            "Deny"
        } else {
            "Allow"
        }
        .to_string();

        let raw_perm = permission_idx
            .and_then(|idx| clean_cols.get(idx))
            .filter(|s| !s.is_empty())
            .map_or("Read", String::as_str)
            .to_string();
        let level = parse_acl_level(raw_perm.clone(), access_control.clone())?;

        let inherited_cell = inherited_idx
            .and_then(|idx| clean_cols.get(idx))
            .map_or("", String::as_str)
            .to_uppercase();
        let is_inherited =
            inherited_cell == "TRUE" || inherited_cell == "YES" || inherited_cell == "1";

        let account_desc = acc_desc_idx
            .and_then(|idx| clean_cols.get(idx))
            .map_or("", String::as_str)
            .to_string();

        if let Some(node) = folders.get_mut(&normalized_path) {
            if is_inherited {
                node.has_inherited = true;
            } else {
                node.has_direct = true;
                node.direct_perm_count += 1;
            }
            if access_control == "Deny" || level == "DENY" {
                node.has_deny = true;
            }
        }
        if let Some(levels_set) = folder_levels_map.get_mut(&normalized_path) {
            levels_set.insert(level.clone());
        }

        rule_id += 1;
        let rule_item = AclRuleItemOut {
            id: rule_id,
            folder_path: normalized_path.clone(),
            account: raw_account.to_string(),
            account_type: account_type.clone(),
            account_desc: account_desc.clone(),
            access_control,
            level,
            is_inherited,
            raw_permission: raw_perm,
        };

        permissions_by_folder
            .entry(normalized_path)
            .or_default()
            .push(rule_item.clone());
        permissions_by_account
            .entry(raw_account.to_string())
            .or_default()
            .push(rule_item);
        accounts_map
            .entry(raw_account.to_string())
            .or_insert(AccountMeta {
                acc_type: account_type,
                desc: account_desc,
            });
    }

    let keys_and_parents: Vec<(String, Option<String>)> = folders
        .iter()
        .map(|(p, node)| (p.clone(), node.parent_path.clone()))
        .collect();

    for (p, parent_opt) in &keys_and_parents {
        if let Some(levels_set) = folder_levels_map.get(p)
            && let Some(node) = folders.get_mut(p)
        {
            node.levels = levels_set.iter().cloned().collect();
        }
        if let Some(pp) = parent_opt
            && let Some(parent_node) = folders.get_mut(pp)
            && !parent_node.children_paths.contains(p)
        {
            parent_node.children_paths.push(p.clone());
        }
    }

    let accounts_list: Vec<Value> = accounts_map
        .iter()
        .map(|(name, info)| {
            json!({
                "name": name,
                "type": info.acc_type,
                "desc": info.desc,
            })
        })
        .collect();

    let folders_encoded = encode_index_map(&folders)?;
    let perms_folder_encoded = encode_index_map(&permissions_by_folder)?;
    let perms_account_encoded = encode_index_map(&permissions_by_account)?;

    let audit_issues = scan_security_audit(folders_encoded.clone(), perms_folder_encoded.clone())?;

    let roots: Vec<String> = root_shared_folders.into_iter().collect();

    Ok(AclDatasetOut {
        folders: folders_encoded,
        root_shared_folders: roots,
        permissions_by_folder: perms_folder_encoded,
        permissions_by_account: perms_account_encoded,
        accounts_list,
        audit_issues,
        total_rows: row_count,
        file_name: "Imported_NAS_ACL.csv".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_path_handles_windows_quotes_and_bom() {
        assert_eq!(clean_path("\u{FEFF}bom".into()).unwrap(), "/bom");
        assert_eq!(
            clean_path("  \"C:\\\\volume1\\\\Finance//2026\"  ".into()).unwrap(),
            "/volume1/Finance/2026"
        );
    }
}
