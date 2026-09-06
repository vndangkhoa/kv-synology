import { NextRequest, NextResponse } from "next/server";
import { Client } from "ssh2";
import http from "http";
import https from "https";
import { parseSynoSmartOutput } from "@/lib/storage/synoSmartParser";
import { SynoSmartResult } from "@/lib/dsm/types";

export const dynamic = "force-dynamic";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

const httpAgent = new http.Agent({
  keepAlive: true,
});

// Demo fallback result simulating a 4-bay Synology NAS with 4 SATA drives & 2 NVMe SSDs
const MOCK_SMART_OUTPUT = `
Synology-NAS DS920+ DSM 7.2.1-69057-3 

Drive 1  WD40EFRX-68N32N0  WD-WCC7K1234567  /dev/sata1
User Capacity:        4,000,787,030,016 bytes [4.00 TB]
Firmware Version:     82.00A82
Rotation Rate:        5400 rpm
SATA Version is:      SATA 3.1, 6.0 Gb/s (current: 6.0 Gb/s)
Temperature Celsius:  36 C
Power-on Hours:       14,250
SMART overall-health self-assessment test result: \x1b[1;32mPASSED\x1b[0m
SMART Error Counter Log:         \x1b[1;32mNo Errors Logged\x1b[0m
ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE
  1 Raw_Read_Error_Rate     0x002f   200   200   051    Pre-fail  Always       -       0
  3 Spin_Up_Time            0x0027   182   175   021    Pre-fail  Always       -       6158
  4 Start_Stop_Count        0x0032   100   100   000    Old_age   Always       -       48
  5 Reallocated_Sector_Ct   0x0033   200   200   140    Pre-fail  Always       -       0
  7 Seek_Error_Rate         0x002e   200   200   000    Old_age   Always       -       0
  9 Power_On_Hours          0x0032   081   081   000    Old_age   Always       -       14250
 10 Spin_Retry_Count        0x0032   100   100   000    Old_age   Always       -       0
 11 Calibration_Retry_Count 0x0032   100   100   000    Old_age   Always       -       0
 12 Power_Cycle_Count       0x0032   100   100   000    Old_age   Always       -       42
192 Power-Off_Retract_Count 0x0032   200   200   000    Old_age   Always       -       24
193 Load_Cycle_Count        0x0032   200   200   000    Old_age   Always       -       112
194 Temperature_Celsius     0x0022   116   102   000    Old_age   Always       -       36
196 Reallocated_Event_Count 0x0032   200   200   000    Old_age   Always       -       0
197 Current_Pending_Sector  0x0032   200   200   000    Old_age   Always       -       0
198 Offline_Uncorrectable   0x0030   100   253   000    Old_age   Offline      -       0
199 UDMA_CRC_Error_Count    0x003e   200   200   000    Old_age   Always       -       0
200 Multi_Zone_Error_Rate   0x0008   200   200   000    Old_age   Offline      -       0

Drive 2  ST4000VN008-2DR166  ZA123456  /dev/sata2
User Capacity:        4,000,787,030,016 bytes [4.00 TB]
Firmware Version:     SC60
Rotation Rate:        5900 rpm
SATA Version is:      SATA 3.1, 6.0 Gb/s (current: 6.0 Gb/s)
Temperature Celsius:  38 C
Power-on Hours:       9,840
SMART overall-health self-assessment test result: \x1b[1;32mPASSED\x1b[0m
SMART Error Counter Log:         \x1b[1;32mNo Errors Logged\x1b[0m
ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE
  1 Raw_Read_Error_Rate     0x000f   082   064   006    Pre-fail  Always       -       163840
  3 Spin_Up_Time            0x0003   094   092   000    Pre-fail  Always       -       0
  4 Start_Stop_Count        0x0032   100   100   020    Old_age   Always       -       32
  5 Reallocated_Sector_Ct   0x0033   100   100   010    Pre-fail  Always       -       0
  7 Seek_Error_Rate         0x000f   086   060   045    Pre-fail  Always       -       48102394
  9 Power_On_Hours          0x0032   089   089   000    Old_age   Always       -       9840
 10 Spin_Retry_Count        0x0013   100   100   097    Pre-fail  Always       -       0
 12 Power_Cycle_Count       0x0032   100   100   020    Old_age   Always       -       28
187 Reported_Uncorrect      0x0032   100   100   000    Old_age   Always       -       0
188 Command_Timeout         0x0032   100   100   000    Old_age   Always       -       0
190 Airflow_Temperature_Cel 0x0022   062   058   040    Old_age   Always       -       38 (Min/Max 28/42)
194 Temperature_Celsius     0x0022   038   042   000    Old_age   Always       -       38 (0 21 0 0 0)
197 Current_Pending_Sector  0x0012   100   100   000    Old_age   Always       -       0
198 Offline_Uncorrectable   0x0010   100   100   000    Old_age   Offline      -       0
199 UDMA_CRC_Error_Count    0x003e   200   200   000    Old_age   Always       -       0
240 Head_Flying_Hours       0x0000   100   253   000    Old_age   Offline      -       9840
241 Total_LBAs_Written      0x0000   100   253   000    Old_age   Offline      -       28410291480
242 Total_LBAs_Read         0x0000   100   253   000    Old_age   Offline      -       45102941020

Drive 3  WD40EFRX-68N32N0  WD-WCC7K7654321  /dev/sata3
User Capacity:        4,000,787,030,016 bytes [4.00 TB]
Firmware Version:     82.00A82
Rotation Rate:        5400 rpm
SATA Version is:      SATA 3.1, 6.0 Gb/s (current: 6.0 Gb/s)
Temperature Celsius:  37 C
Power-on Hours:       14,210
SMART overall-health self-assessment test result: \x1b[1;32mPASSED\x1b[0m
SMART Error Counter Log:         \x1b[1;32mNo Errors Logged\x1b[0m
ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE
  1 Raw_Read_Error_Rate     0x002f   200   200   051    Pre-fail  Always       -       0
  3 Spin_Up_Time            0x0027   180   174   021    Pre-fail  Always       -       6210
  4 Start_Stop_Count        0x0032   100   100   000    Old_age   Always       -       45
  5 Reallocated_Sector_Ct   0x0033   200   200   140    Pre-fail  Always       -       0
  7 Seek_Error_Rate         0x002e   200   200   000    Old_age   Always       -       0
  9 Power_On_Hours          0x0032   081   081   000    Old_age   Always       -       14210
 10 Spin_Retry_Count        0x0032   100   100   000    Old_age   Always       -       0
 12 Power_Cycle_Count       0x0032   100   100   000    Old_age   Always       -       40
194 Temperature_Celsius     0x0022   115   101   000    Old_age   Always       -       37
196 Reallocated_Event_Count 0x0032   200   200   000    Old_age   Always       -       0
197 Current_Pending_Sector  0x0032   200   200   000    Old_age   Always       -       0
198 Offline_Uncorrectable   0x0030   100   253   000    Old_age   Offline      -       0
199 UDMA_CRC_Error_Count    0x003e   200   200   000    Old_age   Always       -       0

Drive 4  ST4000VN008-2DR166  ZA654321  /dev/sata4
User Capacity:        4,000,787,030,016 bytes [4.00 TB]
Firmware Version:     SC60
Rotation Rate:        5900 rpm
SATA Version is:      SATA 3.1, 6.0 Gb/s (current: 6.0 Gb/s)
Temperature Celsius:  39 C
Power-on Hours:       9,800
SMART overall-health self-assessment test result: \x1b[1;32mPASSED\x1b[0m
SMART Error Counter Log:         \x1b[1;32mNo Errors Logged\x1b[0m
ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE
  1 Raw_Read_Error_Rate     0x000f   081   064   006    Pre-fail  Always       -       182300
  3 Spin_Up_Time            0x0003   095   092   000    Pre-fail  Always       -       0
  4 Start_Stop_Count        0x0032   100   100   020    Old_age   Always       -       30
  5 Reallocated_Sector_Ct   0x0033   100   100   010    Pre-fail  Always       -       0
  7 Seek_Error_Rate         0x000f   085   060   045    Pre-fail  Always       -       51201948
  9 Power_On_Hours          0x0032   089   089   000    Old_age   Always       -       9800
 10 Spin_Retry_Count        0x0013   100   100   097    Pre-fail  Always       -       0
 12 Power_Cycle_Count       0x0032   100   100   020    Old_age   Always       -       27
187 Reported_Uncorrect      0x0032   100   100   000    Old_age   Always       -       0
190 Airflow_Temperature_Cel 0x0022   061   057   040    Old_age   Always       -       39
194 Temperature_Celsius     0x0022   039   043   000    Old_age   Always       -       39 (0 22 0 0 0)
197 Current_Pending_Sector  0x0012   100   100   000    Old_age   Always       -       0
198 Offline_Uncorrectable   0x0010   100   100   000    Old_age   Offline      -       0
199 UDMA_CRC_Error_Count    0x003e   200   200   000    Old_age   Always       -       0
241 Total_LBAs_Written      0x0000   100   253   000    Old_age   Offline      -       27810291480
242 Total_LBAs_Read         0x0000   100   253   000    Old_age   Offline      -       44102941020

M.2 Drive 1  Samsung 970 EVO Plus 1TB  S4EVNF0M123456  /dev/nvme0n1
Total NVM Capacity:                 1,000,204,886,016 [1.00 TB]
Firmware Version:                   2B2QEXM7
SMART Health Status:                \x1b[1;32mOK\x1b[0m
Critical Warning:                   0x00
Temperature:                        42 C
Available Spare:                    100%
Available Spare Threshold:          10%
Percentage Used:                    3%
Data Units Read:                    12,450,210 [6.37 TB]
Data Units Written:                 9,120,440 [4.66 TB]
Host Read Commands:                 154,210,840
Host Write Commands:                112,890,200
Controller Busy Time:               380 minutes
Power On Hours:                     6,820
Power Cycles:                       64
Unsafe Shutdowns:                   3
Media and Data Integrity Errors:    0
Error Information Log Entries:      0
Warning  Comp. Temperature Time:    0
Critical Comp. Temperature Time:    0

M.2 Drive 2  Samsung 970 EVO Plus 1TB  S4EVNF0M654321  /dev/nvme1n1
Total NVM Capacity:                 1,000,204,886,016 [1.00 TB]
Firmware Version:                   2B2QEXM7
SMART Health Status:                \x1b[1;32mOK\x1b[0m
Critical Warning:                   0x00
Temperature:                        43 C
Available Spare:                    100%
Available Spare Threshold:          10%
Percentage Used:                    3%
Data Units Read:                    12,448,100 [6.37 TB]
Data Units Written:                 9,118,900 [4.66 TB]
Host Read Commands:                 154,198,300
Host Write Commands:                112,875,100
Controller Busy Time:               382 minutes
Power On Hours:                     6,820
Power Cycles:                       64
Unsafe Shutdowns:                   3
Media and Data Integrity Errors:    0
Error Information Log Entries:      0
Warning  Comp. Temperature Time:    0
Critical Comp. Temperature Time:    0

Finished
`;

interface RequestPayload {
  action?: "check" | "info" | "run";
  option?: string; // "" | "-a" | "-i" | "-v" | "-h"
  mode?: "auto" | "cgi" | "ssh";
  dsmConfig?: {
    host: string;
    port?: number;
    https?: boolean;
    sid?: string;
    synoToken?: string;
  };
  sshConfig?: {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
  };
  isDemo?: boolean;
}

// Call DSM CGI API directly
async function callDsmCgi(
  dsmConfig: NonNullable<RequestPayload["dsmConfig"]>,
  action: string,
  option: string = ""
): Promise<{ success: boolean; data?: any; text?: string; status: number; sudoers_missing?: boolean }> {
  const isHttps = dsmConfig.https ?? false;
  const host = dsmConfig.host;
  const port = dsmConfig.port || (isHttps ? 5001 : 5000);
  const agent = isHttps ? httpsAgent : httpAgent;
  const clientLib = isHttps ? https : http;

  const urlParams = new URLSearchParams();
  urlParams.append("action", action);
  if (option) urlParams.append("option", option);

  const postBody = urlParams.toString();

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": String(Buffer.byteLength(postBody)),
    "User-Agent": "DSMHelper/1.3.0 (SynoSmartInfo)",
  };

  if (dsmConfig.sid) {
    headers["Cookie"] = `id=${dsmConfig.sid}`;
  }
  if (dsmConfig.synoToken) {
    headers["X-SYNO-TOKEN"] = dsmConfig.synoToken;
  }

  return new Promise((resolve) => {
    const req = clientLib.request(
      {
        host,
        port,
        path: `/webman/3rdparty/Synosmartinfo/api.cgi`,
        method: "POST",
        headers,
        agent,
        timeout: 45000, // wait up to 45s for SMART run
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({
              success: parsed.success === true,
              data: parsed,
              text: parsed.result || raw,
              status: res.statusCode || 200,
              sudoers_missing: parsed.sudoers_missing,
            });
          } catch (_) {
            resolve({
              success: (res.statusCode || 500) < 400 && raw.includes("success"),
              text: raw,
              status: res.statusCode || 500,
            });
          }
        });
      }
    );

    req.on("error", (err) => {
      resolve({ success: false, text: err.message, status: 500 });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, text: "DSM CGI request timed out", status: 504 });
    });

    req.write(postBody);
    req.end();
  });
}

// Call via SSH fallback
async function callViaSsh(
  sshConfig: NonNullable<RequestPayload["sshConfig"]>,
  option: string = ""
): Promise<{ success: boolean; stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        conn.end();
      } catch {}
      reject(new Error("SSH connection timed out after 30 seconds"));
    }, 30000);

    const safeOpt = ["-a", "-i", "-v", "-h", ""].includes(option.trim()) ? option.trim() : "";
    // Command tries:
    // 1. Synosmartinfo package helper or script if installed
    // 2. syno_smart_info.sh in PATH
    // 3. Fallback to PeterSuh repo raw script
    const cmd = `
if [ -x /var/packages/Synosmartinfo/target/bin/helper/smartinfo-helper.$(uname -m) ]; then
  /var/packages/Synosmartinfo/target/bin/helper/smartinfo-helper.$(uname -m) ${safeOpt}
elif [ -f /var/packages/Synosmartinfo/target/bin/syno_smart_info.sh ]; then
  sudo /var/packages/Synosmartinfo/target/bin/syno_smart_info.sh ${safeOpt}
elif command -v syno_smart_info.sh >/dev/null 2>&1; then
  sudo syno_smart_info.sh ${safeOpt}
else
  curl -fsSL https://raw.githubusercontent.com/PeterSuh-Q3/SynoSmartInfo/main/src/bin/syno_smart_info.sh | sudo bash -s -- ${safeOpt}
fi
`.trim();

    conn
      .on("ready", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        conn.exec(cmd, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          stream
            .on("close", (code: number) => {
              conn.end();
              resolve({
                success: code === 0 || stdout.includes("Drive ") || stdout.includes("Finished"),
                stdout,
                stderr,
                code,
              });
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString("utf8");
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString("utf8");
            });
        });
      })
      .on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err);
      });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port || 22,
      username: sshConfig.username,
      password: sshConfig.password,
      privateKey: sshConfig.privateKey,
      readyTimeout: 15000,
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestPayload = await req.json().catch(() => ({}));
    const action = body.action || "run";
    const option = body.option || "";
    const mode = body.mode || "auto";

    // Demo Mode Return
    if (body.isDemo || (!body.dsmConfig?.host && !body.sshConfig?.host)) {
      const parsed = parseSynoSmartOutput(MOCK_SMART_OUTPUT);
      return NextResponse.json({
        success: true,
        source: "mock",
        message: "Dữ liệu mẫu S.M.A.R.T. (Demo Mode - Synology DS920+)",
        result: MOCK_SMART_OUTPUT,
        parsed,
        systemInfo: {
          MODEL: "DS920+",
          PLATFORM: "geminilake",
          DSM_VERSION: "7.2.1-69057",
          Update: "3",
        },
      } satisfies SynoSmartResult);
    }

    // 1. ACTION = CHECK: Check if SynoSmartInfo package is installed on DSM
    if (action === "check") {
      if (body.dsmConfig?.host) {
        const checkRes = await callDsmCgi(body.dsmConfig, "info");
        if (checkRes.status === 200 && checkRes.data?.success) {
          let sysInfo: any = null;
          try {
            sysInfo = typeof checkRes.data.result === "string" ? JSON.parse(checkRes.data.result) : checkRes.data.result;
          } catch (_) {}
          return NextResponse.json({
            success: true,
            source: "cgi",
            message: "Package SynoSmartInfo đã được cài đặt và sẵn sàng.",
            result: null,
            systemInfo: sysInfo,
          } satisfies SynoSmartResult);
        }
      }

      // If CGI not found or returns 404
      return NextResponse.json({
        success: false,
        source: "cgi",
        message: "Chưa cài đặt package SynoSmartInfo trên DSM (hoặc dịch vụ chưa bật).",
        result: null,
      } satisfies SynoSmartResult);
    }

    // 2. ACTION = INFO: Retrieve DSM system & hardware information from SynoSmartInfo
    if (action === "info") {
      if (body.dsmConfig?.host) {
        const infoRes = await callDsmCgi(body.dsmConfig, "info");
        if (infoRes.success && infoRes.data?.result) {
          let sysInfo: any = null;
          try {
            sysInfo = typeof infoRes.data.result === "string" ? JSON.parse(infoRes.data.result) : infoRes.data.result;
          } catch (_) {}
          return NextResponse.json({
            success: true,
            source: "cgi",
            message: "Lấy thông tin hệ thống thành công.",
            result: null,
            systemInfo: sysInfo,
          } satisfies SynoSmartResult);
        }
      }
    }

    // 3. ACTION = RUN: Execute S.M.A.R.T. scan
    // A) Try CGI Mode first if mode is "auto" or "cgi"
    if ((mode === "auto" || mode === "cgi") && body.dsmConfig?.host) {
      const cgiRes = await callDsmCgi(body.dsmConfig, "run", option);
      if (cgiRes.status === 200 && cgiRes.success && cgiRes.text) {
        const parsed = parseSynoSmartOutput(cgiRes.text);
        return NextResponse.json({
          success: true,
          source: "cgi",
          message: "Quét S.M.A.R.T. hoàn tất qua DSM Package CGI.",
          result: cgiRes.text,
          parsed,
          sudoers_missing: cgiRes.sudoers_missing,
        } satisfies SynoSmartResult);
      }

      // If explicit CGI mode requested and failed, return error immediately
      if (mode === "cgi") {
        return NextResponse.json({
          success: false,
          source: "cgi",
          message: cgiRes.text || "Không thể kết nối đến CGI SynoSmartInfo trên NAS.",
          result: null,
          sudoers_missing: cgiRes.sudoers_missing,
        } satisfies SynoSmartResult, { status: cgiRes.status >= 400 ? cgiRes.status : 500 });
      }
    }

    // B) Fallback to SSH Mode if mode is "ssh" or "auto" (and SSH config provided)
    if ((mode === "auto" || mode === "ssh") && body.sshConfig?.host && body.sshConfig?.username) {
      try {
        const sshRes = await callViaSsh(body.sshConfig, option);
        const output = sshRes.stdout || sshRes.stderr;
        const parsed = parseSynoSmartOutput(output);
        return NextResponse.json({
          success: sshRes.success,
          source: "ssh",
          message: "Quét S.M.A.R.T. thành công qua SSH Direct Runner.",
          result: output,
          parsed,
        } satisfies SynoSmartResult);
      } catch (err: any) {
        if (mode === "ssh") {
          return NextResponse.json({
            success: false,
            source: "ssh",
            message: `Lỗi kết nối SSH: ${err.message || String(err)}`,
            result: null,
          } satisfies SynoSmartResult, { status: 500 });
        }
      }
    }

    // Fallback if neither CGI nor SSH succeeded
    return NextResponse.json({
      success: false,
      source: "cgi",
      message: "Không thể thực hiện quét S.M.A.R.T. Vui lòng cài đặt package SynoSmartInfo trên DSM hoặc cung cấp thông tin SSH.",
      result: null,
    } satisfies SynoSmartResult, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      source: "cgi",
      message: err.message || "Lỗi xử lý API SynoSmartInfo",
      result: null,
    } satisfies SynoSmartResult, { status: 500 });
  }
}
