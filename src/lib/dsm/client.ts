import {
  DSMConnectionConfig,
  DSMSession,
  SystemInfo,
  SystemUtilization,
  DSMProcess,
  FileItem,
  ShareLink,
  DockerContainer,
  DownloadTask,
  StorageVolume,
  PackageItem,
} from "./types";
import {
  mockSystemInfo,
  getMockUtilization,
  mockProcesses,
  mockFiles,
  mockDockerContainers,
  mockDownloadTasks,
  mockStorageVolumes,
  mockPackages,
} from "./mockData";

class DSMClient {
  private config: DSMConnectionConfig | null = null;
  private session: DSMSession = {
    sid: "",
    isConnected: false,
    isDemo: false,
    dsmVersion: 7,
    versionString: "DSM 7.2.1",
    model: "DS920+",
    hostname: "Synology-NAS",
    account: "admin",
  };

  public getSession(): DSMSession {
    return this.session;
  }

  public setSession(session: DSMSession, config?: DSMConnectionConfig) {
    this.session = session;
    if (config) this.config = config;
  }

  public getFileStreamUrl(filePath: string, isImage = false): string {
    if (this.session.isDemo || !this.session.isConnected || !this.config) {
      return "";
    }
    const host = this.config.host;
    const port = String(this.config.port || 5000);
    const https = String(this.config.https);
    const sid = this.session.sid;

    if (isImage) {
      const params = new URLSearchParams({
        api: "SYNO.FileStation.Thumb",
        version: "2",
        method: "get",
        path: filePath,
        size: "original",
        animate: "true",
        _host: host,
        _port: port,
        _https: https,
        _sid: sid,
      });
      return `/api/dsm/entry.cgi?${params.toString()}`;
    }

    const params = new URLSearchParams({
      api: "SYNO.FileStation.Download",
      version: "2",
      method: "download",
      path: filePath,
      mode: "open",
      _host: host,
      _port: port,
      _https: https,
      _sid: sid,
    });
    return `/api/dsm/entry.cgi?${params.toString()}`;
  }

  public getFileDownloadUrl(filePath: string): string {
    if (this.session.isDemo || !this.session.isConnected || !this.config) {
      return "";
    }
    const host = this.config.host;
    const port = String(this.config.port || 5000);
    const https = String(this.config.https);
    const sid = this.session.sid;

    const params = new URLSearchParams({
      api: "SYNO.FileStation.Download",
      version: "2",
      method: "download",
      path: filePath,
      mode: "download",
      _host: host,
      _port: port,
      _https: https,
      _sid: sid,
    });
    return `/api/dsm/entry.cgi?${params.toString()}`;
  }

  public async login(config: DSMConnectionConfig, isDemo = false): Promise<DSMSession> {
    if (isDemo) {
      this.session = {
        sid: "demo-session-token-12345",
        isConnected: true,
        isDemo: true,
        dsmVersion: 7,
        versionString: "DSM 7.2.1-69057 (Demo)",
        model: "DS920+",
        hostname: "Synology-Demo",
        account: config.account || "admin",
      };
      this.config = config;
      return this.session;
    }

    this.config = config;

    const authVersions = [6, 4, 3, 2];
    let lastError = "Không thể xác thực với Synology DSM";

    for (const ver of authVersions) {
      try {
        const params = new URLSearchParams({
          account: config.account,
          passwd: config.password || "",
          version: String(ver),
          api: "SYNO.API.Auth",
          method: "login",
          session: "FileStation",
          enable_device_token: "yes",
          enable_sync_token: "yes",
          isIframeLogin: "yes",
        });

        // ONLY send otp_code if an actual non-empty code is given
        if (config.otp && config.otp.trim().length > 0) {
          params.set("otp_code", config.otp.trim());
        }

        const res = await this.proxyFetch(`/auth.cgi?${params.toString()}`, {
          method: "GET",
        });

        const data = await res.json();
        if (data.success && data.data) {
          const sid = data.data.sid || "";
          const synoToken = data.data.synotoken || "";
          const did = data.data.did || "";

          this.session = {
            sid,
            synoToken,
            did,
            isConnected: true,
            isDemo: false,
            dsmVersion: ver >= 6 ? 7 : 6,
            versionString: ver >= 6 ? "DSM 7.x" : "DSM 6.x",
            model: "Synology NAS",
            hostname: config.host,
            account: config.account,
          };

          this.getSystemInfo().then((info) => {
            if (info?.model) this.session.model = info.model;
            if (info?.version) this.session.versionString = info.version;
          });

          return this.session;
        } else if (data.error) {
          const code = data.error.code;
          if (code === 400) {
            throw new Error("Tài khoản hoặc mật khẩu không chính xác.");
          } else if (code === 401) {
            throw new Error("Tài khoản này đã bị khóa hoặc vô hiệu hóa trên NAS.");
          } else if (code === 402) {
            throw new Error("Quyền truy cập bị từ chối.");
          } else if (code === 403 || code === 406) {
            if (config.otp && config.otp.trim().length > 0) {
              throw new Error("Mã xác thực 2 bước (OTP) không chính xác hoặc đã hết hạn.");
            } else {
              throw new Error("Tài khoản yêu cầu mã xác thực 2 bước (OTP). Vui lòng nhập mã OTP 6 chữ số.");
            }
          } else if (code === 404) {
            if (config.otp && config.otp.trim().length > 0) {
              throw new Error("Mã xác thực 2 bước (OTP) không đúng hoặc đã hết hạn.");
            }
            continue;
          } else if (code === 101) {
            continue;
          } else if (data.error.message) {
            lastError = data.error.message;
          }
        }
      } catch (err: any) {
        if (err.message && (err.message.includes("OTP") || err.message.includes("mật khẩu") || err.message.includes("khóa") || err.message.includes("từ chối"))) {
          throw err;
        }
        lastError = err.message || lastError;
      }
    }

    throw new Error(lastError);
  }

  public logout() {
    this.session = {
      sid: "",
      isConnected: false,
      isDemo: false,
      dsmVersion: 7,
      versionString: "",
      model: "",
      hostname: "",
      account: "",
    };
  }

  public async getSystemInfo(): Promise<SystemInfo> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockSystemInfo;
    }
    try {
      const data = await this.postEntry("SYNO.Core.System", "info", 1);
      if (data.success && data.data) {
        const d = data.data;

        let cpuStr = "";
        if (d.cpu_vendor || d.cpu_family || d.cpu_series) {
          const parts = [d.cpu_vendor, d.cpu_family, d.cpu_series].filter(Boolean);
          cpuStr = parts.join(" ");
        } else {
          cpuStr = "Intel Celeron J4125";
        }

        if (d.cpu_clock_speed) {
          const ghz = (Number(d.cpu_clock_speed) / 1000).toFixed(1);
          cpuStr += ` @ ${ghz} GHz`;
        }

        const totalRamMB = Number(d.ram_size || d.ram || 65536);

        let parsedUptime = 846200;
        if (typeof d.uptime === "number") {
          parsedUptime = d.uptime;
        } else if (typeof d.up_time === "string") {
          const [h, m, s] = d.up_time.split(":").map(Number);
          if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
            parsedUptime = h * 3600 + m * 60 + s;
          }
        }

        const info: SystemInfo = {
          model: d.model || this.session.model || "DS920+",
          serial: d.serial || "N/A",
          version: d.firmware_ver || "DSM 7.2.2",
          uptime: parsedUptime,
          temperature: Number(d.sys_temp || d.temperature || 45),
          time: d.time || new Date().toISOString(),
          ramTotal: totalRamMB,
          ramUsed: Math.floor(totalRamMB * 0.11),
          cpuModel: cpuStr,
          cpuCores: Number(d.cpu_cores || 4),
        };

        if (d.model) this.session.model = d.model;
        if (d.firmware_ver) this.session.versionString = d.firmware_ver;

        return info;
      }
    } catch (_) {}
    return mockSystemInfo;
  }

  public async getUtilization(): Promise<SystemUtilization> {
    if (this.session.isDemo || !this.session.isConnected) {
      return getMockUtilization();
    }
    try {
      const data = await this.postEntry("SYNO.Core.System.Utilization", "get", 1, {
        type: '"current"',
      });
      if (data.success && data.data) {
        const d = data.data;
        const rx = Array.isArray(d.network) ? d.network.reduce((acc: number, n: any) => acc + (n.rx || 0), 0) : 0;
        const tx = Array.isArray(d.network) ? d.network.reduce((acc: number, n: any) => acc + (n.tx || 0), 0) : 0;
        const diskR = Array.isArray(d.disk?.disk) ? d.disk.disk.reduce((acc: number, n: any) => acc + (n.read_byte || 0), 0) : 0;
        const diskW = Array.isArray(d.disk?.disk) ? d.disk.disk.reduce((acc: number, n: any) => acc + (n.write_byte || 0), 0) : 0;

        const memPercent = Number(d.memory?.real_usage || 0);

        const memTotalMB = d.memory?.memory_size
          ? Math.round(Number(d.memory.memory_size) / 1024)
          : d.memory?.total_real
          ? Math.round(Number(d.memory.total_real) / 1024)
          : 65536;

        const memUsedMB = d.memory?.total_real && d.memory?.avail_real
          ? Math.round((Number(d.memory.total_real) - Number(d.memory.avail_real)) / 1024)
          : Math.round((memPercent / 100) * memTotalMB);

        const cpuUsage = Number(d.cpu?.user_load || 0) + Number(d.cpu?.system_load || 0);

        return {
          cpuPercent: cpuUsage,
          memoryPercent: memPercent,
          memoryUsedMB: memUsedMB,
          memoryTotalMB: memTotalMB,
          networkRxBytes: rx,
          networkTxBytes: tx,
          diskReadBytes: diskR,
          diskWriteBytes: diskW,
          timestamp: Date.now(),
        };
      }
    } catch (_) {}
    return getMockUtilization();
  }

  public async getProcesses(): Promise<DSMProcess[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockProcesses;
    }
    try {
      const data = await this.postEntry("SYNO.Core.System.Process", "list", 1, {
        limit: "100",
        offset: "0",
        sort_by: '"cpu"',
        sort_direction: '"DESC"',
      });
      if (data.success && Array.isArray(data.data?.process)) {
        return data.data.process.map((p: any) => {
          let ramBytes = 0;
          if (p.mem_kb) ramBytes = Number(p.mem_kb) * 1024;
          else if (p.res) ramBytes = Number(p.res) * 1024;
          else if (p.mem) ramBytes = Number(p.mem) * 1024;
          else if (p.memory) ramBytes = Number(p.memory);

          return {
            pid: p.pid,
            name: p.command || p.name || "process",
            cpu: (Number(p.cpu || 0) > 100 ? Number(p.cpu) / 10 : Number(p.cpu || 0)),
            memory: ramBytes,
            user: p.user || "root",
            status: p.status || "R",
          };
        });
      }
    } catch (_) {}
    return mockProcesses;
  }

  public async killProcess(pid: number): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      const idx = mockProcesses.findIndex((p) => p.pid === pid);
      if (idx !== -1) {
        mockProcesses.splice(idx, 1);
      }
      return true;
    }
    try {
      const data = await this.postEntry("SYNO.Core.System.Process", "kill", 1, {
        pid: String(pid),
      });
      if (data.success) return true;
      // Fallback method "delete"
      const data2 = await this.postEntry("SYNO.Core.System.Process", "delete", 1, {
        pid: String(pid),
      });
      return !!data2.success;
    } catch (_) {
      return false;
    }
  }

  public async listFiles(folderPath: string): Promise<FileItem[]> {
    return this.getFiles(folderPath);
  }

  public async getFiles(folderPath: string): Promise<FileItem[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockFiles[folderPath] || [];
    }

    try {
      let data: any;
      if (folderPath === "/" || folderPath === "") {
        data = await this.postEntry("SYNO.FileStation.List", "list_share", 2, {
          additional: JSON.stringify(["perm", "time", "size", "owner", "real_path"]),
          limit: "1000",
          offset: "0",
          sort_by: '"name"',
          sort_direction: '"asc"',
        });
        if (data.success && Array.isArray(data.data?.shares)) {
          return data.data.shares.map((s: any) => ({
            path: s.path,
            name: s.name,
            isdir: true,
            size: s.additional?.size || 0,
            mtime: (s.additional?.time?.mtime || 0) * 1000,
            owner: s.additional?.owner?.user || "admin",
            perm: s.additional?.perm?.posix ? `${s.additional.perm.posix}` : "0755",
            realPath: s.additional?.real_path || s.path,
          }));
        }
      } else {
        data = await this.postEntry("SYNO.FileStation.List", "list", 2, {
          folder_path: JSON.stringify(folderPath),
          additional: JSON.stringify(["perm", "time", "size", "owner", "real_path", "type"]),
          limit: "5000",
          offset: "0",
          sort_by: '"name"',
          sort_direction: '"asc"',
        });
        if (data.success && Array.isArray(data.data?.files)) {
          return data.data.files.map((f: any) => ({
            path: f.path,
            name: f.name,
            isdir: !!f.isdir,
            size: f.additional?.size || 0,
            mtime: (f.additional?.time?.mtime || 0) * 1000,
            owner: f.additional?.owner?.user || "admin",
            perm: f.additional?.perm?.posix ? `${f.additional.perm.posix}` : "0644",
            realPath: f.additional?.real_path || f.path,
          }));
        }
      }
    } catch (_) {}
    return mockFiles[folderPath] || [];
  }

  public async getFileContent(filePath: string): Promise<string> {
    if (this.session.isDemo || !this.session.isConnected) {
      return `# Tệp tin mẫu (Demo File)\nname: dsm-service\nversion: "1.0.0"\nport: 8088\nenvironment:\n  - NODE_ENV=production\n  - LOG_LEVEL=debug`;
    }
    try {
      const streamUrl = this.getFileStreamUrl(filePath, false);
      const res = await fetch(streamUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch (_) {}
    return "";
  }

  public async saveTextFile(folderPath: string, fileName: string, content: string): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      const list = mockFiles[folderPath] || [];
      const targetPath = `${folderPath === "/" ? "" : folderPath}/${fileName}`;
      const existing = list.find((f) => f.path === targetPath);
      if (existing) {
        existing.size = content.length;
        existing.mtime = Date.now();
      } else {
        list.push({
          path: targetPath,
          name: fileName,
          isdir: false,
          size: content.length,
          mtime: Date.now(),
          owner: "admin",
          perm: "0644 (rw-r--r--)",
        });
        mockFiles[folderPath] = list;
      }
      return true;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    return this.uploadFile(folderPath, blob, fileName);
  }

  public async uploadFile(folderPath: string, file: File | Blob, customFileName?: string): Promise<boolean> {
    const fileName = customFileName || (file as File).name || "file.txt";

    if (this.session.isDemo || !this.session.isConnected) {
      const list = mockFiles[folderPath] || [];
      const targetPath = `${folderPath === "/" ? "" : folderPath}/${fileName}`;
      list.push({
        path: targetPath,
        name: fileName,
        isdir: false,
        size: file.size || 1024,
        mtime: Date.now(),
        owner: "admin",
        perm: "0644 (rw-r--r--)",
      });
      mockFiles[folderPath] = list;
      return true;
    }

    const formData = new FormData();
    formData.append("api", "SYNO.FileStation.Upload");
    formData.append("version", "2");
    formData.append("method", "upload");
    formData.append("_sid", this.session.sid);
    formData.append("path", folderPath);
    formData.append("create_parents", "true");
    formData.append("overwrite", "true");
    formData.append("file", file, fileName);

    const res = await this.proxyUpload(formData);
    return !!res.success;
  }

  public async createShareLink(path: string, password?: string, expireDate?: string): Promise<ShareLink> {
    if (this.session.isDemo || !this.session.isConnected) {
      const shareId = Math.random().toString(36).substring(2, 9);
      const host = this.config?.host || "quickconnect.to";
      return {
        id: shareId,
        url: `https://${host}/sharing/${shareId}`,
        path,
        name: path.split("/").pop() || "Shared Item",
        date_expired: expireDate || "2026-12-31",
        has_password: !!password,
      };
    }

    const extra: Record<string, string> = {
      path: JSON.stringify([path]),
    };
    if (password) {
      extra.password = JSON.stringify(password);
    }
    if (expireDate) {
      extra.date_expired = JSON.stringify(expireDate);
    }

    const data = await this.postEntry("SYNO.FileStation.Sharing", "create", 3, extra);
    if (data.success && Array.isArray(data.data?.links) && data.data.links.length > 0) {
      const item = data.data.links[0];
      const host = this.config?.host || "localhost";
      const port = this.config?.port || (this.config?.https ? 5001 : 5000);
      const isHttps = this.config?.https ?? true;
      const baseUrl = `${isHttps ? "https" : "http"}://${host}:${port}`;

      let url = item.url || "";
      if (url.startsWith("/")) {
        url = `${baseUrl}${url}`;
      } else if (!url.startsWith("http")) {
        url = `${baseUrl}/sharing/${item.id}`;
      }

      return {
        id: item.id,
        url,
        path,
        name: path.split("/").pop() || "Shared Item",
        date_expired: item.date_expired || "",
        has_password: !!password,
      };
    }

    throw new Error(data.error?.message || "Không thể tạo liên kết chia sẻ công khai");
  }

  public async listShareLinks(): Promise<ShareLink[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return [
        {
          id: "demo123",
          url: "https://demo.quickconnect.to/sharing/demo123",
          path: "/docker/docker-compose.yml",
          name: "docker-compose.yml",
          date_expired: "2026-12-31",
          has_password: false,
        },
      ];
    }
    try {
      const data = await this.postEntry("SYNO.FileStation.Sharing", "list", 3, {
        offset: "0",
        limit: "100",
      });
      if (data.success && Array.isArray(data.data?.links)) {
        const host = this.config?.host || "localhost";
        const port = this.config?.port || (this.config?.https ? 5001 : 5000);
        const isHttps = this.config?.https ?? true;
        const baseUrl = `${isHttps ? "https" : "http"}://${host}:${port}`;

        return data.data.links.map((l: any) => ({
          id: l.id,
          url: l.url?.startsWith("http") ? l.url : `${baseUrl}${l.url || `/sharing/${l.id}`}`,
          path: l.path,
          name: l.path?.split("/").pop() || l.id,
          date_expired: l.date_expired || "",
          has_password: !!l.has_password,
        }));
      }
    } catch (_) {}
    return [];
  }

  public async deleteShareLink(id: string): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      return true;
    }
    const data = await this.postEntry("SYNO.FileStation.Sharing", "delete", 3, {
      id: JSON.stringify([id]),
    });
    return !!data.success;
  }

  public async createFolder(folderPath: string, name: string): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      const list = mockFiles[folderPath] || [];
      const newFolder: FileItem = {
        path: `${folderPath === "/" ? "" : folderPath}/${name}`,
        name,
        isdir: true,
        size: 0,
        mtime: Date.now(),
        owner: "admin",
        perm: "0755 (rwxr-xr-x)",
      };
      mockFiles[folderPath] = [...list, newFolder];
      return true;
    }
    const data = await this.postEntry("SYNO.FileStation.CreateFolder", "create", 2, {
      folder_path: JSON.stringify(folderPath),
      name: JSON.stringify(name),
      force_parent: "false",
    });
    return !!data.success;
  }

  public async deleteFile(filePath: string): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      for (const [folder, items] of Object.entries(mockFiles)) {
        mockFiles[folder] = items.filter((f) => f.path !== filePath);
      }
      return true;
    }
    const data = await this.postEntry("SYNO.FileStation.Delete", "start", 2, {
      path: JSON.stringify([filePath]),
      accurate_progress: "true",
    });
    return !!data.success;
  }

  public async renameFile(filePath: string, newName: string): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      for (const items of Object.values(mockFiles)) {
        const item = items.find((f) => f.path === filePath);
        if (item) {
          item.name = newName;
          item.path = item.path.substring(0, item.path.lastIndexOf("/") + 1) + newName;
        }
      }
      return true;
    }
    const data = await this.postEntry("SYNO.FileStation.Rename", "rename", 2, {
      path: JSON.stringify(filePath),
      name: JSON.stringify(newName),
    });
    return !!data.success;
  }

  public async getDockerContainers(): Promise<DockerContainer[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockDockerContainers;
    }
    try {
      const data = await this.postEntry("SYNO.Docker.Container", "list", 1, {
        limit: "-1",
        offset: "0",
        type: '"all"',
      });

      let resourceMap: Record<string, { cpu: number; memory: string }> = {};
      try {
        const resData = await this.postEntry("SYNO.Docker.Container.Resource", "get", 1);
        if (resData.success && Array.isArray(resData.data?.resources)) {
          for (const r of resData.data.resources) {
            const rawCpu = Number(r.cpu || 0);
            const cpuVal = Number(rawCpu.toFixed(1));
            const memStr = r.memory ? `${Math.round(r.memory / 1024 / 1024)} MB` : "0 MB";
            resourceMap[r.name] = {
              cpu: cpuVal,
              memory: memStr,
            };
          }
        }
      } catch (_) {}

      if (data.success && Array.isArray(data.data?.containers)) {
        return data.data.containers.map((c: any) => {
          const stats = resourceMap[c.name] || {
            cpu: Number(Number(c.cpu || 0).toFixed(1)),
            memory: c.memory ? `${Math.round(c.memory / 1024 / 1024)} MB` : "0 MB",
          };
          return {
            id: c.id || c.name,
            name: c.name,
            image: c.image,
            status: c.status === "running" ? "running" : "stopped",
            created: c.created || "",
            ports: c.port_bindings ? Object.keys(c.port_bindings) : [],
            cpuUsage: stats.cpu,
            memoryUsage: stats.memory,
          };
        });
      }
    } catch (_) {}
    return mockDockerContainers;
  }

  public async toggleDockerContainer(id: string, action: "start" | "stop" | "restart"): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      const c = mockDockerContainers.find((item) => item.id === id);
      if (c) {
        if (action === "start") c.status = "running";
        if (action === "stop") c.status = "stopped";
        if (action === "restart") c.status = "running";
      }
      return true;
    }
    const method = action === "start" ? "start" : action === "stop" ? "stop" : "restart";
    const data = await this.postEntry("SYNO.Docker.Container", method, 1, {
      name: JSON.stringify(id),
    });
    return !!data.success;
  }

  public async getDownloadTasks(): Promise<DownloadTask[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockDownloadTasks;
    }
    try {
      let data = await this.postEntry("SYNO.DownloadStation2.Task", "list", 2, {
        additional: JSON.stringify(["detail", "transfer"]),
        limit: "500",
        offset: "0",
      });

      if (!data.success) {
        data = await this.postEntry("SYNO.DownloadStation.Task", "list", 1, {
          additional: JSON.stringify(["detail", "transfer"]),
        });
      }

      const tasks = data.data?.tasks || data.data?.task || [];
      if (Array.isArray(tasks)) {
        return tasks.map((t: any) => {
          const downloaded = t.additional?.transfer?.size_downloaded || t.additional?.transfer?.downloaded || 0;
          const totalSize = t.size || 0;
          const progress = totalSize > 0 ? Math.floor((downloaded / totalSize) * 100) : (t.status === "finished" ? 100 : 0);

          return {
            id: t.id,
            title: t.title || t.filename || "Download Task",
            size: totalSize,
            status: (t.status === "downloading" || t.status === "waiting") ? "downloading" : (t.status === "finished" || t.status === "complete") ? "finished" : "paused",
            progress,
            downloadSpeed: t.additional?.transfer?.speed_download || t.additional?.transfer?.download_rate || 0,
            uploadSpeed: t.additional?.transfer?.speed_upload || t.additional?.transfer?.upload_rate || 0,
            type: t.type || "HTTP",
          };
        });
      }
    } catch (_) {}
    return mockDownloadTasks;
  }

  public async addDownloadTask(uri: string): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      mockDownloadTasks.unshift({
        id: `dl_${Date.now()}`,
        title: uri.split("/").pop() || "Download_Task.zip",
        size: 512000000,
        status: "downloading",
        progress: 5,
        downloadSpeed: 5200000,
        uploadSpeed: 0,
        type: uri.startsWith("magnet:") ? "BitTorrent" : "HTTP",
      });
      return true;
    }
    let data = await this.postEntry("SYNO.DownloadStation2.Task", "create", 2, {
      type: '"url"',
      url: JSON.stringify([uri]),
    });
    if (!data.success) {
      data = await this.postEntry("SYNO.DownloadStation.Task", "create", 1, {
        uri,
      });
    }
    return !!data.success;
  }

  public async toggleDownloadTask(id: string, action: "pause" | "resume" | "delete"): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      const idx = mockDownloadTasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        if (action === "pause") mockDownloadTasks[idx].status = "paused";
        if (action === "resume") mockDownloadTasks[idx].status = "downloading";
        if (action === "delete") mockDownloadTasks.splice(idx, 1);
      }
      return true;
    }
    const method = action === "pause" ? "pause" : action === "resume" ? "resume" : "delete";
    let data = await this.postEntry("SYNO.DownloadStation2.Task", method, 2, {
      id: JSON.stringify([id]),
    });
    if (!data.success) {
      data = await this.postEntry("SYNO.DownloadStation.Task", method, 1, {
        id,
      });
    }
    return !!data.success;
  }

  public async getStorageVolumes(): Promise<StorageVolume[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockStorageVolumes;
    }
    try {
      const res = await this.postEntry("SYNO.Storage.CGI.Storage", "load_info", 1);
      if (res.success && Array.isArray(res.data?.volumes)) {
        const diskMap: Record<string, any> = {};
        if (Array.isArray(res.data?.disks)) {
          for (const d of res.data.disks) {
            diskMap[d.id || d.name] = d;
          }
        }

        return res.data.volumes.map((v: any) => {
          const totalBytes = Number(v.size?.total || v.total_size || 0);
          const usedBytes = Number(v.size?.used || v.used_size || 0);
          const freeBytes = totalBytes > usedBytes ? totalBytes - usedBytes : 0;
          const attachedDisks = Array.isArray(v.disks)
            ? v.disks.map((dName: string, idx: number) => {
                const diskObj = diskMap[dName] || {};
                return {
                  slot: idx + 1,
                  model: diskObj.model || diskObj.vendor || `Ổ đĩa ${idx + 1}`,
                  serial: diskObj.serial || "N/A",
                  status: (diskObj.status === "normal" ? "normal" : "warning") as "normal" | "warning" | "critical",
                  temp: Number(diskObj.temp || 38),
                  size: Number(diskObj.size_total_byte || 4000000000000),
                  health: diskObj.smart_status === "normal" ? "Bình thường" : "Cần kiểm tra",
                };
              })
            : [];

          return {
            id: v.id || v.num_id?.toString() || "volume_1",
            name: v.display_name || v.name || `Volume ${v.num_id || 1}`,
            path: v.volume_path || `/volume${v.num_id || 1}`,
            fsType: (v.fs_type || "btrfs").toUpperCase(),
            totalBytes,
            usedBytes,
            freeBytes,
            status: v.status === "normal" ? "normal" : "warning",
            drives: attachedDisks,
          };
        });
      }
    } catch (_) {}
    return mockStorageVolumes;
  }

  public async getPackages(): Promise<PackageItem[]> {
    if (this.session.isDemo || !this.session.isConnected) {
      return mockPackages;
    }
    try {
      const data = await this.postEntry("SYNO.Core.Package", "list", 1, {
        additional: JSON.stringify(["description", "status", "maintainer", "version", "display_name"]),
      });
      if (data.success && Array.isArray(data.data?.packages)) {
        return data.data.packages.map((p: any) => ({
          id: p.id,
          name: p.additional?.display_name || p.name || p.id,
          version: p.additional?.version || p.version || "1.0",
          status: p.additional?.status === "running" ? "running" : "stopped",
          description: p.additional?.description || "",
          maintainer: p.additional?.maintainer || "Synology Inc.",
        }));
      }
    } catch (_) {}
    return mockPackages;
  }

  public async togglePackage(id: string, action: "start" | "stop"): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      const pkg = mockPackages.find((p) => p.id === id);
      if (pkg) pkg.status = action === "start" ? "running" : "stopped";
      return true;
    }
    const data = await this.postEntry("SYNO.Core.Package.Control", action, 1, {
      id: JSON.stringify(id),
    });
    return !!data.success;
  }

  public async powerAction(method: "reboot" | "shutdown", force = true): Promise<boolean> {
    if (this.session.isDemo || !this.session.isConnected) {
      return true;
    }
    const data = await this.postEntry("SYNO.Core.System", method, 1, {
      force: String(force),
      local: "true",
    });
    return !!data.success;
  }

  private async postEntry(api: string, method: string, version: number, extraParams: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({
      api,
      method,
      version: String(version),
      _sid: this.session.sid,
      ...extraParams,
    });

    const res = await this.proxyFetch(`/entry.cgi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
    });

    return await res.json();
  }

  private async proxyUpload(formData: FormData): Promise<any> {
    if (!this.config) {
      throw new Error("No DSM configuration set");
    }
    const headers: Record<string, string> = {
      "x-dsm-host": this.config.host,
      "x-dsm-port": String(this.config.port || 5000),
      "x-dsm-https": String(this.config.https),
      "x-dsm-ignore-cert": String(this.config.ignoreCert ?? true),
    };
    if (this.session.sid) {
      headers["x-dsm-cookie"] = `id=${this.session.sid}`;
    }
    if (this.session.synoToken) {
      headers["x-dsm-synotoken"] = this.session.synoToken;
    }

    const res = await fetch("/api/dsm/entry.cgi", {
      method: "POST",
      headers,
      body: formData,
    });
    return await res.json();
  }

  private async proxyFetch(pathWithQuery: string, init: RequestInit): Promise<Response> {
    if (!this.config) {
      throw new Error("No DSM configuration set");
    }
    const headers: Record<string, string> = {
      ...(init.headers as any),
      "x-dsm-host": this.config.host,
      "x-dsm-port": String(this.config.port || 5000),
      "x-dsm-https": String(this.config.https),
      "x-dsm-ignore-cert": String(this.config.ignoreCert ?? true),
    };
    if (this.session.sid) {
      headers["x-dsm-cookie"] = `id=${this.session.sid}`;
    }
    if (this.session.synoToken) {
      headers["x-dsm-synotoken"] = this.session.synoToken;
    }

    return await fetch(`/api/dsm${pathWithQuery}`, {
      ...init,
      headers,
    });
  }
}

export const dsmClient = new DSMClient();
