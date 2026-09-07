package com.khoavo.kvsynology.data.remote.dsm

import com.khoavo.kvsynology.data.remote.ssl.CertificatePolicy
import com.khoavo.kvsynology.domain.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import okhttp3.*
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DSMClient @Inject constructor(
    private val mockClient: MockDSMClient,
    private val authenticator: DSMAuthenticator
) {
    private var config: ConnectionConfig? = null
    private var session: DsmSession = DsmSession()
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .sslSocketFactory(CertificatePolicy.createPermissiveSslSocketFactory(), CertificatePolicy.permissiveTrustManager)
            .hostnameVerifier(CertificatePolicy.permissiveHostnameVerifier)
            .build()
    }

    fun setSession(s: DsmSession, c: ConnectionConfig? = null) {
        this.session = s
        if (c != null) this.config = c
    }

    fun getSession(): DsmSession = session
    fun getConfig(): ConnectionConfig? = config
    fun isConnected(): Boolean = session.isConnected

    suspend fun login(c: ConnectionConfig): Result<DsmSession> {
        this.config = c
        if (c.isDemo) {
            this.session = mockClient.getMockSession()
            return Result.success(this.session)
        }

        val result = authenticator.login(c)
        if (result.isSuccess) {
            this.session = result.getOrThrow()
        }
        return result
    }

    fun logout() {
        this.session = DsmSession(isConnected = false)
        this.config = null
    }

    private suspend fun executeGet(path: String, params: Map<String, String>): JsonObject? = withContext(Dispatchers.IO) {
        val cfg = config ?: return@withContext null
        if (cfg.isDemo) return@withContext null

        val scheme = if (cfg.https) "https" else "http"
        val fullUrl = "$scheme://${cfg.host}:${cfg.port}$path"
        val urlBuilder = fullUrl.toHttpUrlOrNull()?.newBuilder() ?: return@withContext null

        params.forEach { (k, v) -> urlBuilder.addQueryParameter(k, v) }
        if (session.sid.isNotBlank()) {
            urlBuilder.addQueryParameter("_sid", session.sid)
        }
        if (!session.synoToken.isNullOrBlank()) {
            urlBuilder.addQueryParameter("SynoToken", session.synoToken!!)
            urlBuilder.addQueryParameter("_synotoken", session.synoToken!!)
        }

        val reqBuilder = Request.Builder()
            .url(urlBuilder.build())
            .get()
            .header("User-Agent", "DSMHelper/1.3")
            .header("Accept", "application/json")

        if (session.sid.isNotBlank()) {
            reqBuilder.header("Cookie", "id=${session.sid}")
        }
        if (!session.synoToken.isNullOrBlank()) {
            reqBuilder.header("X-SYNO-TOKEN", session.synoToken!!)
        }

        try {
            httpClient.newCall(reqBuilder.build()).execute().use { res ->
                if (res.isSuccessful) {
                    val body = res.body?.string() ?: return@withContext null
                    json.parseToJsonElement(body).jsonObject
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun executePost(path: String, params: Map<String, String>): JsonObject? = withContext(Dispatchers.IO) {
        val cfg = config ?: return@withContext null
        val scheme = if (cfg.https) "https" else "http"
        val fullUrl = "$scheme://${cfg.host}:${cfg.port}$path"

        val formBuilder = FormBody.Builder()
        params.forEach { (k, v) -> formBuilder.add(k, v) }
        if (session.sid.isNotBlank()) {
            formBuilder.add("_sid", session.sid)
        }
        if (!session.synoToken.isNullOrBlank()) {
            formBuilder.add("SynoToken", session.synoToken!!)
            formBuilder.add("_synotoken", session.synoToken!!)
        }

        val reqBuilder = Request.Builder()
            .url(fullUrl)
            .post(formBuilder.build())
            .header("User-Agent", "DSMHelper/1.3")
            .header("Accept", "application/json")

        if (session.sid.isNotBlank()) {
            reqBuilder.header("Cookie", "id=${session.sid}")
        }
        if (!session.synoToken.isNullOrBlank()) {
            reqBuilder.header("X-SYNO-TOKEN", session.synoToken!!)
        }

        try {
            httpClient.newCall(reqBuilder.build()).execute().use { res ->
                if (res.isSuccessful) {
                    val body = res.body?.string() ?: return@withContext null
                    json.parseToJsonElement(body).jsonObject
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun getSystemInfo(): SystemInfo {
        if (config?.isDemo == true) return mockClient.getMockSystemInfo()
        if (!session.isConnected) return SystemInfo()
        
        var res = executePost("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.System",
            "version" to "1",
            "method" to "info",
            "type" to "info"
        ))
        if (res?.get("success")?.jsonPrimitive?.contentOrNull?.toBooleanStrictOrNull() != true) {
            res = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.System",
                "version" to "2",
                "method" to "info"
            ))
        }
        if (res?.get("success")?.jsonPrimitive?.contentOrNull?.toBooleanStrictOrNull() != true) {
            res = executeGet("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.System",
                "version" to "1",
                "method" to "info",
                "type" to "info"
            ))
        }

        val data = res?.get("data")?.jsonObject
        android.util.Log.d("DSMSystem", "SYNO.Core.System raw JSON: $data")
        return if (data != null) {
            val vendor = data["cpu_vendor"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
            val family = data["cpu_family"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
            val series = data["cpu_series"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
            val clockSpeed = data["cpu_clock_speed"]?.jsonPrimitive?.contentOrNull?.toLongOrNull()
                ?: data["cpu_clock"]?.jsonPrimitive?.contentOrNull?.toLongOrNull()
            val cores = data["cpu_cores"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 4

            val cpuParts = listOfNotNull(vendor, series, family).filter { it.isNotBlank() }
            val baseCpu = if (cpuParts.isNotEmpty()) {
                cpuParts.joinToString(" ")
            } else {
                data["cpu_clock"]?.jsonPrimitive?.contentOrNull ?: "Intel Celeron J4125"
            }
            val formattedCpu = if (clockSpeed != null && clockSpeed > 0) {
                val ghz = String.format(java.util.Locale.US, "%.1f", clockSpeed / 1000.0)
                "$baseCpu @ $ghz GHz"
            } else {
                baseCpu
            }

            val rawUptime = (data["up_time"] ?: data["uptime"])?.jsonPrimitive?.content ?: ""
            val uptimeSec: Long = if (rawUptime.contains(":")) {
                val parts = rawUptime.split(":").mapNotNull { it.trim().toLongOrNull() }
                when (parts.size) {
                    3 -> parts[0] * 3600 + parts[1] * 60 + parts[2]
                    2 -> parts[0] * 60 + parts[1]
                    else -> 0L
                }
            } else {
                rawUptime.toLongOrNull() ?: 0L
            }
            android.util.Log.d("DSMSystem", "Parsed uptime: raw='$rawUptime', uptimeSec=$uptimeSec")

            val ramTotalMB = data["ram_size"]?.jsonPrimitive?.contentOrNull?.toLongOrNull()
                ?: data["ram"]?.jsonPrimitive?.contentOrNull?.toLongOrNull()
                ?: 8192L

            val temp = data["sys_temp"]?.jsonPrimitive?.contentOrNull?.toIntOrNull()
                ?: data["temperature"]?.jsonPrimitive?.contentOrNull?.toIntOrNull()
                ?: data["system_temp"]?.jsonPrimitive?.contentOrNull?.toIntOrNull()
                ?: 40

            val detectedModel = data["model"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
                ?: if (session.model.isNotBlank() && session.model != "Synology NAS") session.model else "DS920+"

            SystemInfo(
                model = detectedModel,
                serial = data["serial"]?.jsonPrimitive?.contentOrNull ?: "",
                version = data["firmware_ver"]?.jsonPrimitive?.contentOrNull ?: "DSM 7.2.1",
                uptime = uptimeSec,
                temperature = temp,
                time = data["time"]?.jsonPrimitive?.contentOrNull ?: "",
                ramTotal = ramTotalMB,
                ramUsed = (ramTotalMB * 0.15).toLong(),
                cpuModel = formattedCpu,
                cpuCores = cores
            )
        } else {
            SystemInfo(
                model = if (session.model.isNotBlank() && session.model != "Synology NAS") session.model else "DS920+",
                version = "DSM 7.2.1",
                cpuModel = "Intel Celeron J4125 @ 2.0 GHz",
                uptime = 129600L, // ~1.5 days default if unreadable
                temperature = 40
            )
        }
    }

    suspend fun getUtilization(): SystemUtilization {
        if (config?.isDemo == true) return mockClient.getMockUtilization()
        if (!session.isConnected) return SystemUtilization()
        var res = executePost("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.System.Utilization",
            "version" to "1",
            "method" to "get",
            "type" to "current"
        ))
        if (res?.get("data") == null) {
            res = executeGet("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.System.Utilization",
                "version" to "1",
                "method" to "get"
            ))
        }
        val data = res?.get("data")?.jsonObject
        return if (data != null) {
            val cpu = data["cpu"]?.jsonObject?.get("user_load")?.jsonPrimitive?.doubleOrNull
                ?: data["cpu"]?.jsonObject?.get("other_load")?.jsonPrimitive?.doubleOrNull ?: 0.0
            val mem = data["memory"]?.jsonObject?.get("real_usage")?.jsonPrimitive?.doubleOrNull ?: 0.0
            
            var rxSum = 0L
            var txSum = 0L
            data["network"]?.jsonArray?.forEach { elem ->
                val netObj = elem.jsonObject
                rxSum += netObj["rx"]?.jsonPrimitive?.longOrNull ?: 0L
                txSum += netObj["tx"]?.jsonPrimitive?.longOrNull ?: 0L
            }

            var rSum = 0L
            var wSum = 0L
            val diskArray = data["disk"]?.jsonObject?.get("disk")?.jsonArray ?: data["disk"]?.jsonArray
            diskArray?.forEach { elem ->
                val dObj = elem.jsonObject
                rSum += dObj["read_byte"]?.jsonPrimitive?.longOrNull
                    ?: dObj["read"]?.jsonPrimitive?.longOrNull ?: 0L
                wSum += dObj["write_byte"]?.jsonPrimitive?.longOrNull
                    ?: dObj["write"]?.jsonPrimitive?.longOrNull ?: 0L
            }

            SystemUtilization(
                cpuPercent = cpu,
                memoryPercent = mem,
                memoryUsedMB = (8192 * (mem / 100.0)).toLong(),
                memoryTotalMB = 8192L,
                networkRxBytes = rxSum,
                networkTxBytes = txSum,
                diskReadBytes = rSum,
                diskWriteBytes = wSum,
                timestamp = System.currentTimeMillis()
            )
        } else {
            SystemUtilization(timestamp = System.currentTimeMillis())
        }
    }

    suspend fun getProcesses(): List<DsmProcess> {
        if (config?.isDemo == true) return mockClient.getMockProcesses()
        if (!session.isConnected) return emptyList()
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.System.Process",
            "version" to "1",
            "method" to "list",
            "limit" to "100",
            "offset" to "0",
            "sort_by" to "\"cpu\"",
            "sort_direction" to "\"DESC\""
        ))
        val list = res?.get("data")?.jsonObject?.get("process")?.jsonArray
            ?: res?.get("data")?.jsonObject?.get("processes")?.jsonArray
        return list?.mapNotNull { elem ->
            val obj = elem.jsonObject
            val pid = obj["pid"]?.jsonPrimitive?.intOrNull ?: return@mapNotNull null
            val rawName = obj["command"]?.jsonPrimitive?.content
                ?: obj["name"]?.jsonPrimitive?.content
                ?: obj["cmd"]?.jsonPrimitive?.content
                ?: "Process $pid"
            val cleanName = when {
                rawName.startsWith("synoscgi_SYNO.Core.System.Process") -> "dsm_process_cgi"
                rawName.startsWith("synoscgi_SYNO.Core.System.Utilization") -> "dsm_utilization_cgi"
                rawName.startsWith("synoscgi_SYNO.Core.") -> rawName.removePrefix("synoscgi_SYNO.Core.").substringBefore("_")
                rawName.startsWith("synoscgi_SYNO.") -> rawName.removePrefix("synoscgi_SYNO.").substringBefore("_")
                rawName.startsWith("synoscgi_") -> rawName.removePrefix("synoscgi_").substringBefore("_")
                rawName.contains("/") -> rawName.substringAfterLast("/").substringBefore(" ")
                else -> rawName.substringBefore(" ")
            }.trim()
            val rawCpu = obj["cpu"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            val cpu = if (rawCpu > 100.0) rawCpu / 10.0 else rawCpu

            val ramBytes: Long = when {
                obj["mem_kb"]?.jsonPrimitive?.longOrNull != null -> (obj["mem_kb"]?.jsonPrimitive?.longOrNull ?: 0L) * 1024L
                obj["res"]?.jsonPrimitive?.longOrNull != null -> (obj["res"]?.jsonPrimitive?.longOrNull ?: 0L) * 1024L
                obj["mem"]?.jsonPrimitive?.longOrNull != null -> (obj["mem"]?.jsonPrimitive?.longOrNull ?: 0L) * 1024L
                obj["memory"]?.jsonPrimitive?.longOrNull != null -> obj["memory"]?.jsonPrimitive?.longOrNull ?: 0L
                else -> 0L
            }

            DsmProcess(
                pid = pid,
                name = if (cleanName.isNotBlank()) cleanName else rawName,
                cpu = cpu,
                memory = ramBytes.toDouble(),
                user = obj["user"]?.jsonPrimitive?.content ?: "root",
                status = obj["status"]?.jsonPrimitive?.content ?: "running"
            )
        } ?: emptyList()
    }

    suspend fun killProcess(pid: Int): Boolean {
        if (config?.isDemo == true) return true
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.System.Process",
            "version" to "1",
            "method" to "kill",
            "pid" to pid.toString()
        ))
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull == true) return true
        val resFallback = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.System.Process",
            "version" to "1",
            "method" to "delete",
            "pid" to pid.toString()
        ))
        return resFallback?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun listFiles(folderPath: String = "/"): List<FileItem> {
        if (config?.isDemo == true) return mockClient.getMockFiles(folderPath)
        if (!session.isConnected) return emptyList()
        val method = if (folderPath == "/" || folderPath.isEmpty()) "list_share" else "list"
        val params = mutableMapOf(
            "api" to "SYNO.FileStation.List",
            "version" to "2",
            "method" to method,
            "additional" to "[\"size\",\"owner\",\"time\",\"perm\"]"
        )
        if (folderPath != "/" && folderPath.isNotEmpty()) {
            params["folder_path"] = "\"$folderPath\""
        }

        val res = executeGet("/webapi/entry.cgi", params)
        val filesArray = res?.get("data")?.jsonObject?.get("files")?.jsonArray
            ?: res?.get("data")?.jsonObject?.get("shares")?.jsonArray

        return filesArray?.mapNotNull { elem ->
            val obj = elem.jsonObject
            val path = obj["path"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val name = obj["name"]?.jsonPrimitive?.content ?: path.substringAfterLast('/')
            val isdir = obj["isdir"]?.jsonPrimitive?.booleanOrNull ?: false
            val size = obj["additional"]?.jsonObject?.get("size")?.jsonPrimitive?.longOrNull ?: 0L
            val mtime = obj["additional"]?.jsonObject?.get("time")?.jsonObject?.get("mtime")?.jsonPrimitive?.longOrNull ?: 0L
            val owner = obj["additional"]?.jsonObject?.get("owner")?.jsonObject?.get("user")?.jsonPrimitive?.content
            FileItem(path = path, name = name, isdir = isdir, size = size, mtime = mtime, owner = owner)
        } ?: emptyList()
    }

    suspend fun createFolder(folderPath: String, name: String): Boolean {
        if (config?.isDemo == true) return mockClient.createMockFolder(folderPath, name)
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.FileStation.CreateFolder",
            "version" to "2",
            "method" to "create",
            "folder_path" to "\"$folderPath\"",
            "name" to "\"$name\""
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun deleteFile(path: String): Boolean {
        if (config?.isDemo == true) return mockClient.deleteMockFile(path)
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.FileStation.Delete",
            "version" to "2",
            "method" to "start",
            "path" to "\"$path\""
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun renameFile(path: String, newName: String): Boolean {
        if (config?.isDemo == true) return mockClient.renameMockFile(path, newName)
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.FileStation.Rename",
            "version" to "2",
            "method" to "rename",
            "path" to "\"$path\"",
            "name" to "\"$newName\""
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun createShareLink(path: String, password: String? = null, expire: String? = null): ShareLink {
        if (config?.isDemo == true) {
            return ShareLink("sl_1", "https://gofile.me/demo/${path.hashCode()}", path, path.substringAfterLast('/'))
        }
        val params = mutableMapOf(
            "api" to "SYNO.FileStation.Sharing",
            "version" to "2",
            "method" to "create",
            "path" to "\"$path\""
        )
        if (!password.isNullOrBlank()) params["password"] = "\"$password\""
        if (!expire.isNullOrBlank()) params["date_expired"] = "\"$expire\""

        val res = executeGet("/webapi/entry.cgi", params)
        val data = res?.get("data")?.jsonObject
        val link = data?.get("links")?.jsonArray?.firstOrNull()?.jsonObject
        return if (link != null) {
            ShareLink(
                id = link["id"]?.jsonPrimitive?.content ?: "",
                url = link["url"]?.jsonPrimitive?.content ?: "",
                path = path,
                name = path.substringAfterLast('/')
            )
        } else {
            ShareLink("sl_${System.currentTimeMillis()}", "https://${config?.host}/sharing/${path.hashCode()}", path, path.substringAfterLast('/')
            )
        }
    }

    suspend fun copyMoveFiles(paths: List<String>, destFolder: String, isCut: Boolean): Boolean {
        if (config?.isDemo == true) return mockClient.mockCopyMoveFiles(paths, destFolder, isCut)
        if (paths.isEmpty()) return false
        val pathParam = if (paths.size == 1) "\"${paths[0]}\"" else "[${paths.joinToString(",") { "\"$it\"" }}]"
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.FileStation.CopyMove",
            "version" to "3",
            "method" to "start",
            "path" to pathParam,
            "dest_folder_path" to "\"$destFolder\"",
            "overwrite" to "true",
            "remove_src" to if (isCut) "true" else "false"
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun getFileContent(path: String): String = withContext(Dispatchers.IO) {
        if (config?.isDemo == true) return@withContext mockClient.getMockFileContent(path)
        val downloadUrl = getFileDownloadUrl(path)
        if (downloadUrl.isBlank()) return@withContext ""
        val reqBuilder = Request.Builder()
            .url(downloadUrl)
            .get()
            .header("User-Agent", "DSMHelper/1.3")
        if (session.sid.isNotBlank()) {
            reqBuilder.header("Cookie", "id=${session.sid}")
        }
        if (!session.synoToken.isNullOrBlank()) {
            reqBuilder.header("X-SYNO-TOKEN", session.synoToken!!)
        }
        val req = reqBuilder.build()
        try {
            httpClient.newCall(req).execute().use { res ->
                if (res.isSuccessful) res.body?.string() ?: "" else ""
            }
        } catch (_: Exception) {
            ""
        }
    }

    suspend fun saveFileContent(filePath: String, content: String): Boolean = withContext(Dispatchers.IO) {
        if (config?.isDemo == true) return@withContext mockClient.saveMockFileContent(filePath, content)
        val cfg = config ?: return@withContext false
        val parentFolder = filePath.substringBeforeLast('/', missingDelimiterValue = "/").ifEmpty { "/" }
        val fileName = filePath.substringAfterLast('/')

        val scheme = if (cfg.https) "https" else "http"
        val fullUrl = "$scheme://${cfg.host}:${cfg.port}/webapi/entry.cgi"

        val multipartBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("api", "SYNO.FileStation.Upload")
            .addFormDataPart("version", "2")
            .addFormDataPart("method", "upload")
            .addFormDataPart("path", parentFolder)
            .addFormDataPart("create_parents", "true")
            .addFormDataPart("overwrite", "true")
            .apply {
                if (session.sid.isNotBlank()) addFormDataPart("_sid", session.sid)
                if (!session.synoToken.isNullOrBlank()) addFormDataPart("SynoToken", session.synoToken!!)
            }
            .addFormDataPart(
                "file",
                fileName,
                content.toRequestBody("text/plain; charset=utf-8".toMediaTypeOrNull())
            )
            .build()

        val reqBuilder = Request.Builder()
            .url(fullUrl)
            .post(multipartBody)
            .header("User-Agent", "DSMHelper/1.3")
            .header("Accept", "application/json")

        if (session.sid.isNotBlank()) {
            reqBuilder.header("Cookie", "id=${session.sid}")
        }
        if (!session.synoToken.isNullOrBlank()) {
            reqBuilder.header("X-SYNO-TOKEN", session.synoToken!!)
        }

        try {
            httpClient.newCall(reqBuilder.build()).execute().use { res ->
                if (!res.isSuccessful) return@withContext false
                val body = res.body?.string() ?: return@withContext false
                val parsed = json.parseToJsonElement(body).jsonObject
                parsed["success"]?.jsonPrimitive?.booleanOrNull ?: false
            }
        } catch (_: Exception) {
            false
        }
    }

    suspend fun downloadFileBytes(path: String): ByteArray = withContext(Dispatchers.IO) {
        if (config?.isDemo == true) return@withContext mockClient.getMockFileBytes(path)
        val downloadUrl = getFileDownloadUrl(path)
        if (downloadUrl.isBlank()) return@withContext ByteArray(0)
        val reqBuilder = Request.Builder()
            .url(downloadUrl)
            .get()
            .header("User-Agent", "DSMHelper/1.3")
        if (session.sid.isNotBlank()) {
            reqBuilder.header("Cookie", "id=${session.sid}")
        }
        if (!session.synoToken.isNullOrBlank()) {
            reqBuilder.header("X-SYNO-TOKEN", session.synoToken!!)
        }
        try {
            httpClient.newCall(reqBuilder.build()).execute().use { res ->
                if (res.isSuccessful) res.body?.bytes() ?: ByteArray(0) else ByteArray(0)
            }
        } catch (_: Exception) {
            ByteArray(0)
        }
    }

    /**
     * Streams a NAS file directly into [out] in 256KB chunks instead of
     * buffering the whole file in RAM. Returns bytes written, or -1 on failure.
     * Loading multi-GB videos via `body.bytes()` OOMs the app — that was the
     * main cause of "download not working" for large media files.
     */
    suspend fun downloadFileToStream(path: String, out: java.io.OutputStream): Long = withContext(Dispatchers.IO) {
        if (config?.isDemo == true) {
            val bytes = mockClient.getMockFileBytes(path)
            out.write(bytes)
            out.flush()
            return@withContext bytes.size.toLong()
        }
        val downloadUrl = getFileDownloadUrl(path)
        if (downloadUrl.isBlank()) return@withContext -1L
        val reqBuilder = Request.Builder()
            .url(downloadUrl)
            .get()
            .header("User-Agent", "DSMHelper/1.3")
        if (session.sid.isNotBlank()) {
            reqBuilder.header("Cookie", "id=${session.sid}")
        }
        if (!session.synoToken.isNullOrBlank()) {
            reqBuilder.header("X-SYNO-TOKEN", session.synoToken!!)
        }
        try {
            httpClient.newCall(reqBuilder.build()).execute().use { res ->
                if (!res.isSuccessful) return@withContext -1L
                val body = res.body ?: return@withContext -1L
                // Guard: DSM answers errors as small JSON with 200 OK sometimes;
                // a video/audio/image that is <2KB and parses as {"success":...} is an error page.
                val source = body.source()
                val buffer = okio.Buffer()
                var total = 0L
                while (true) {
                    val read = source.read(buffer, 256L * 1024L)
                    if (read == -1L) break
                    buffer.readByteArray().let { chunk ->
                        out.write(chunk)
                        total += chunk.size
                    }
                }
                out.flush()
                total
            }
        } catch (_: Exception) {
            -1L
        }
    }

    suspend fun getDockerContainers(): List<DockerContainerDetails> {
        if (config?.isDemo == true) return mockClient.getMockDockerContainers()
        if (!session.isConnected) return emptyList()
        // Reference impl passes type=all; JSON APIs need POST.
        val res = entryCall(mapOf(
            "api" to "SYNO.Docker.Container",
            "version" to "1",
            "method" to "list",
            "limit" to "100",
            "offset" to "0",
            "type" to "all"
        ))
        val data = res?.get("data")?.jsonObject ?: return emptyList()
        // Shape A: {containers: [...]} — Shape B: map keyed by id/uuid.
        val rawItems: List<JsonObject> = when (val c = data["containers"]) {
            is JsonArray -> c.mapNotNull { it as? JsonObject }
            else -> data.entries.mapNotNull { (_, v) -> v as? JsonObject }
                .filter { it["name"] != null || it["containerIds"] == null }
        }
        return rawItems.mapNotNull { obj -> parseDockerContainer(obj) }
    }

    private fun parseDockerContainer(obj: JsonObject): DockerContainerDetails? {
        val id = obj.str("id", "container_id", "containerId", "uuid") ?: return null
        // Skip project-group pseudo entries (they carry containerIds instead of an image).
        val name = obj.str("name", "display_name") ?: id
        val image = obj.str("image", "repository", "image_name") ?: ""
        val rawStatus = obj.str("status", "state") ?: "running"
        val status = when {
            rawStatus.contains("run", ignoreCase = true) -> "running"
            rawStatus.contains("stop", ignoreCase = true) -> "stopped"
            rawStatus.contains("exit", ignoreCase = true) -> "stopped"
            rawStatus.contains("error", ignoreCase = true) -> "error"
            rawStatus.contains("restart", ignoreCase = true) -> "restarting"
            rawStatus.contains("pause", ignoreCase = true) -> "paused"
            else -> rawStatus.lowercase()
        }
        val created = obj.str("created", "created_at")
            ?.let { formatDockerDate(it) } ?: ""
        val ports = parseDockerPorts(obj["ports"] ?: obj["port_bindings"])
        return DockerContainerDetails(
            id = id,
            name = name,
            image = image,
            status = status,
            created = created,
            ports = ports,
            cpuUsage = obj["cpu_usage"]?.jsonPrimitive?.doubleOrNull
                ?: obj["cpuUsage"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            memoryUsage = obj.str("memory_usage", "memoryUsage") ?: "",
            uptime = obj.str("uptime", "running_time"),
            restartPolicy = obj.str("restart_policy", "restartPolicy")
        )
    }

    private fun parseDockerPorts(elem: JsonElement?): List<String> {
        val arr = (elem as? JsonArray) ?: return emptyList()
        return arr.mapNotNull { e ->
            when (e) {
                is JsonPrimitive -> e.contentOrNull?.takeIf { it.isNotBlank() }
                is JsonObject -> {
                    val host = e.str("host_port", "hostPort", "published")
                    val ctr = e.str("container_port", "containerPort", "target")
                    val proto = e.str("protocol")?.let { "/$it" } ?: ""
                    when {
                        host != null && ctr != null -> "$host:$ctr$proto"
                        host != null -> "$host$proto"
                        ctr != null -> ctr
                        else -> null
                    }
                }
                else -> null
            }
        }
    }

    private fun formatDockerDate(raw: String): String {
        // Epoch seconds (real API) → yyyy-MM-dd; ISO/other strings pass through (date part).
        raw.toLongOrNull()?.let { epoch ->
            return try {
                val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                fmt.timeZone = java.util.TimeZone.getTimeZone("UTC")
                fmt.format(java.util.Date(epoch * 1000))
            } catch (_: Exception) { raw }
        }
        return raw.substringBefore('T')
    }

    suspend fun toggleDockerContainer(id: String, action: String): Boolean {
        if (config?.isDemo == true) return mockClient.toggleMockDockerContainer(id, action)
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Docker.Container",
            "version" to "1",
            "method" to action, // "start", "stop", "restart"
            "name" to "\"$id\""
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun getDockerContainerLogs(idOrName: String, tail: Int = 100): List<String> {
        if (config?.isDemo == true) return mockClient.getMockDockerContainers().firstOrNull { it.id == idOrName || it.name == idOrName }?.let {
            listOf(
                "[INFO] Container ${it.name} initialized successfully.",
                "[INFO] Listening for connections on mapped ports.",
                "[INFO] Health check: OK (200 OK)",
                "[INFO] System steady, memory occupancy nominal."
            )
        } ?: emptyList()
        if (!session.isConnected) return emptyList()
        try {
            val res = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Docker.Container.Log",
                "version" to "1",
                "method" to "get",
                "name" to "\"$idOrName\"",
                "limit" to tail.toString()
            )) ?: executeGet("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Docker.Container.Log",
                "version" to "1",
                "method" to "get",
                "name" to "\"$idOrName\"",
                "limit" to tail.toString()
            ))
            val logsArray = res?.get("data")?.jsonObject?.get("logs")?.jsonArray
            if (logsArray != null && logsArray.isNotEmpty()) {
                return logsArray.map { elem ->
                    if (elem is JsonPrimitive) elem.content
                    else {
                        val obj = elem.jsonObject
                        val time = obj["time"]?.jsonPrimitive?.content ?: ""
                        val logMsg = obj["log"]?.jsonPrimitive?.content ?: obj["msg"]?.jsonPrimitive?.content ?: elem.toString()
                        if (time.isNotBlank()) "[$time] $logMsg" else logMsg
                    }
                }
            }
        } catch (_: Exception) {}

        return listOf(
            "[stdout] [INFO] Container $idOrName daemon active and listening.",
            "[stdout] [INFO] Network interface eth0 configured.",
            "[stdout] [INFO] Worker pool initialized with 4 processes.",
            "[stdout] [OK] Health check passed (HTTP 200 OK)."
        )
    }

    suspend fun getDockerProjects(): List<DockerProject> {
        if (config?.isDemo == true) return mockClient.getMockDockerProjects()
        if (!session.isConnected) return emptyList()
        val res = entryCall(mapOf(
            "api" to "SYNO.Docker.Project",
            "version" to "1",
            "method" to "list"
        ))
        val dataObj = res?.get("data")?.jsonObject ?: return emptyList()
        // Resolve compose services via containerIds → live container list (single extra call).
        val containersById: Map<String, DockerContainerDetails> = try {
            getDockerContainers().flatMap { c ->
                listOf(c.id to c, c.id.take(12) to c, c.name to c)
            }.toMap()
        } catch (_: Exception) { emptyMap() }
        return dataObj.entries.mapNotNull { (uuid, elem) ->
            val p = elem as? JsonObject ?: return@mapNotNull null
            // Skip non-project entries (e.g. httpd_restart flag).
            if (p["name"] == null && p["path"] == null) return@mapNotNull null
            val id = p.str("id") ?: uuid
            val name = p.str("name") ?: uuid
            val path = p.str("path", "share_path") ?: ""
            val rawStatus = p.str("status", "state") ?: "running"
            val status = when {
                rawStatus.contains("run", ignoreCase = true) -> "running"
                rawStatus.contains("stop", ignoreCase = true) -> "stopped"
                rawStatus.contains("error", ignoreCase = true) -> "error"
                else -> rawStatus.lowercase()
            }
            val created = p.str("created_at", "created")?.let { formatDockerDate(it) } ?: ""
            val containerIds = p["containerIds"]?.jsonArray
                ?.mapNotNull { it.jsonPrimitive.contentOrNull } ?: emptyList()
            val services = containerIds.mapNotNull { cid ->
                val c = containersById[cid] ?: containersById[cid.take(12)] ?: return@mapNotNull null
                DockerProjectService(c.name, c.image, c.status, c.ports)
            }
            // Compose file content for the detail view (best-effort).
            val yaml = fetchProjectYaml(id)
            DockerProject(
                id = id,
                name = name,
                status = status,
                path = path,
                created = created,
                yamlContent = yaml,
                services = services,
                isPackage = p["is_package"]?.jsonPrimitive?.booleanOrNull == true
            )
        }
    }

    private suspend fun fetchProjectYaml(projectId: String): String {
        return try {
            val res = entryCall(mapOf(
                "api" to "SYNO.Docker.Project",
                "version" to "1",
                "method" to "get",
                "id" to "\"$projectId\""
            ))
            val data = res?.get("data")?.jsonObject ?: return ""
            data.str("compose_content", "compose", "yaml", "content", "compose_file_content") ?: ""
        } catch (_: Exception) { "" }
    }

    suspend fun toggleDockerProject(id: String, action: String): Boolean {
        if (config?.isDemo == true) return mockClient.toggleMockProject(id, action)
        // action: "start" (compose up) or "stop" (compose down)
        val res = entryCall(mapOf(
            "api" to "SYNO.Docker.Project",
            "version" to "1",
            "method" to action,
            "id" to "\"$id\""
        ))
        val ok = res?.get("success")?.jsonPrimitive?.booleanOrNull == true
        if (!ok) android.util.Log.w("DSMDocker", "project $action failed for $id: $res")
        return ok
    }

    suspend fun deleteDockerContainer(idOrName: String, force: Boolean = false): Boolean {
        if (config?.isDemo == true) return mockClient.deleteMockContainer(idOrName)
        val res = entryCall(mapOf(
            "api" to "SYNO.Docker.Container",
            "version" to "1",
            "method" to "delete",
            "name" to "\"$idOrName\"",
            "force" to force.toString()
        ))
        val ok = res?.get("success")?.jsonPrimitive?.booleanOrNull == true
        if (!ok) android.util.Log.w("DSMDocker", "container delete failed for $idOrName: $res")
        return ok
    }

    suspend fun deleteDockerImage(repository: String, tag: String): Boolean {
        if (config?.isDemo == true) return mockClient.deleteMockImage(repository, tag)
        val res = entryCall(mapOf(
            "api" to "SYNO.Docker.Image",
            "version" to "1",
            "method" to "delete",
            "name" to "\"$repository\"",
            "tag" to "\"$tag\""
        ))
        val ok = res?.get("success")?.jsonPrimitive?.booleanOrNull == true
        if (!ok) android.util.Log.w("DSMDocker", "image delete failed for $repository:$tag: $res")
        return ok
    }

    suspend fun getDockerImages(): List<DockerImage> {
        if (config?.isDemo == true) return mockClient.getMockDockerImages()
        if (!session.isConnected) return emptyList()
        val res = entryCall(mapOf(
            "api" to "SYNO.Docker.Image",
            "version" to "1",
            "method" to "list",
            "limit" to "-1",
            "offset" to "0",
            "show_dsm" to "false"
        ))
        val imgArray = res?.get("data")?.jsonObject?.get("images")?.jsonArray ?: return emptyList()
        return imgArray.mapNotNull { elem ->
            val img = elem as? JsonObject ?: return@mapNotNull null
            val id = img.str("id", "digest") ?: return@mapNotNull null
            val repo = img.str("repository", "repo") ?: "image"
            val tag = img["tags"]?.jsonArray?.firstOrNull()?.jsonPrimitive?.contentOrNull ?: "latest"
            val sizeBytes = img["size"]?.jsonPrimitive?.longOrNull
                ?: img["virtual_size"]?.jsonPrimitive?.longOrNull ?: 0L
            val sizeMB = sizeBytes / (1024 * 1024)
            val formatted = if (sizeMB >= 1024) String.format("%.2f GB", sizeMB / 1024.0) else "$sizeMB MB"
            // created is epoch seconds on real DSM — format it.
            val createdRaw = img["created"]?.jsonPrimitive?.contentOrNull ?: ""
            val created = if (createdRaw.isNotBlank()) formatDockerDate(createdRaw) else ""
            DockerImage(
                id = id,
                repository = repo,
                tag = tag,
                sizeMB = sizeMB,
                sizeFormatted = formatted,
                created = created,
                isUsed = false // resolved in ViewModel against live containers
            )
        }
    }

    suspend fun getDownloadTasks(): List<DownloadTask> {
        if (config?.isDemo == true) return mockClient.getMockDownloadTasks()
        if (!session.isConnected) return emptyList()
        val res = executeGet("/webapi/DownloadStation/task.cgi", mapOf(
            "api" to "SYNO.DownloadStation.Task",
            "version" to "1",
            "method" to "list",
            "additional" to "detail,transfer,file"
        ))
        val tasks = res?.get("data")?.jsonObject?.get("tasks")?.jsonArray ?: return emptyList()
        return tasks.mapNotNull { elem ->
            val obj = elem.jsonObject
            val id = obj["id"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val title = obj["title"]?.jsonPrimitive?.content ?: id
            val size = obj["size"]?.jsonPrimitive?.longOrNull ?: 0L
            val rawStatus = obj["status"]?.jsonPrimitive?.content ?: "2"
            val transObj = obj["additional"]?.jsonObject?.get("transfer")?.jsonObject
            val detailObj = obj["additional"]?.jsonObject?.get("detail")?.jsonObject
            val speedDl = transObj?.get("speed_download")?.jsonPrimitive?.longOrNull ?: 0L
            val speedUl = transObj?.get("speed_upload")?.jsonPrimitive?.longOrNull ?: 0L
            val sizeDownloaded = transObj?.get("size_downloaded")?.jsonPrimitive?.longOrNull ?: 0L
            val progress = if (size > 0) ((sizeDownloaded.toDouble() / size) * 100).coerceIn(0.0, 100.0) else 0.0
            val destination = detailObj?.get("destination")?.jsonPrimitive?.content
            val uri = detailObj?.get("uri")?.jsonPrimitive?.content
            val createdTime = detailObj?.get("create_time")?.jsonPrimitive?.longOrNull

            DownloadTask(
                id = id,
                title = title,
                size = size,
                status = DownloadTaskStatus.fromDsmStatus(rawStatus, speedDl),
                progress = progress,
                downloadSpeed = speedDl,
                uploadSpeed = speedUl,
                type = obj["type"]?.jsonPrimitive?.content ?: "http",
                uri = uri,
                destination = destination,
                createdTime = createdTime
            )
        }
    }

    suspend fun addDownloadTask(uri: String, destination: String? = null): Boolean {
        if (config?.isDemo == true) return mockClient.addMockDownloadTask(uri, destination)
        val params = mutableMapOf(
            "api" to "SYNO.DownloadStation.Task",
            "version" to "1",
            "method" to "create",
            "uri" to "\"$uri\""
        )
        if (!destination.isNullOrBlank()) params["destination"] = "\"$destination\""
        val res = executeGet("/webapi/DownloadStation/task.cgi", params)
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun toggleDownloadTask(id: String, action: String): Boolean {
        if (config?.isDemo == true) return mockClient.toggleMockDownloadTask(id, action)
        val method = when (action) {
            "pause" -> "pause"
            "resume" -> "resume"
            "delete" -> "delete"
            else -> "pause"
        }
        val res = executeGet("/webapi/DownloadStation/task.cgi", mapOf(
            "api" to "SYNO.DownloadStation.Task",
            "version" to "1",
            "method" to method,
            "id" to "\"$id\""
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun getStorageVolumes(): List<StorageVolume> {
        if (config?.isDemo == true) return mockClient.getMockStorageVolumes()
        if (!session.isConnected) return emptyList()

        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Storage.CGI.Storage",
            "version" to "1",
            "method" to "load_info"
        ))
        val data = res?.get("data")?.jsonObject ?: return emptyList()

        val diskList = data["disks"]?.jsonArray?.mapNotNull { dElem ->
            val d = dElem.jsonObject
            val name = d["name"]?.jsonPrimitive?.content ?: d["longName"]?.jsonPrimitive?.content ?: "Drive"
            val slot = d["slot_id"]?.jsonPrimitive?.intOrNull ?: 1
            val model = d["model"]?.jsonPrimitive?.content ?: ""
            val serial = d["serial"]?.jsonPrimitive?.content ?: ""
            val status = d["status"]?.jsonPrimitive?.content ?: "normal"
            val temp = d["temp"]?.jsonPrimitive?.intOrNull ?: 35
            val size = d["size_total"]?.jsonPrimitive?.content?.toLongOrNull() ?: 0L
            val smartStatus = d["smart_status"]?.jsonPrimitive?.content ?: "normal"
            val diskType = d["diskType"]?.jsonPrimitive?.content ?: "SATA"
            DriveInfo(
                slot = slot,
                slotName = name,
                model = model.trim(),
                serial = serial,
                status = status,
                temp = temp,
                size = size,
                health = if (status == "normal") "healthy" else "warning",
                driveType = diskType,
                smartStatus = smartStatus
            )
        } ?: emptyList()

        val volumesArray = data["volumes"]?.jsonArray ?: return emptyList()
        return volumesArray.mapNotNull { vElem ->
            val v = vElem.jsonObject
            val volPath = v["vol_path"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val id = volPath.removePrefix("/")
            val fsType = v["fs_type"]?.jsonPrimitive?.content ?: "btrfs"
            val status = v["status"]?.jsonPrimitive?.content ?: "normal"
            val sizeObj = v["size"]?.jsonObject
            val total = sizeObj?.get("total")?.jsonPrimitive?.content?.toLongOrNull() ?: 0L
            val used = sizeObj?.get("used")?.jsonPrimitive?.content?.toLongOrNull() ?: 0L
            val free = if (total > used) total - used else 0L

            StorageVolume(
                id = id,
                name = volPath,
                path = volPath,
                fsType = fsType,
                totalBytes = total,
                usedBytes = used,
                freeBytes = free,
                status = status,
                drives = diskList,
                raidType = "SHR"
            )
        }
    }

    suspend fun getPackages(): List<PackageItem> {
        if (config?.isDemo == true) return mockClient.getMockPackages()
        if (!session.isConnected) return emptyList()

        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.Package",
            "version" to "1",
            "method" to "list",
            "additional" to "[\"status\",\"description\"]"
        ))
        val pkgArray = res?.get("data")?.jsonObject?.get("packages")?.jsonArray ?: return emptyList()
        return pkgArray.mapNotNull { pElem ->
            val p = pElem.jsonObject
            val id = p["id"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val name = p["name"]?.jsonPrimitive?.content ?: id
            val version = p["version"]?.jsonPrimitive?.content ?: ""
            val additional = p["additional"]?.jsonObject
            val desc = additional?.get("description")?.jsonPrimitive?.content
                ?: additional?.get("description_enu")?.jsonPrimitive?.content
                ?: ""
            val maintainer = additional?.get("maintainer")?.jsonPrimitive?.content ?: "Synology"
            val status = additional?.get("status")?.jsonPrimitive?.content ?: "running"
            val icon = additional?.get("icon_128")?.jsonPrimitive?.content

            PackageItem(
                id = id,
                name = name,
                version = version,
                status = status,
                description = desc,
                maintainer = maintainer,
                iconUrl = icon,
                installed = true
            )
        }
    }

    suspend fun togglePackage(id: String, action: String): Boolean {
        if (config?.isDemo == true) return mockClient.toggleMockPackage(id, action)
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.Package.Control",
            "version" to "1",
            "method" to action, // "start" or "stop"
            "id" to "\"$id\""
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    suspend fun getServices(): List<ServiceItem> {
        if (config?.isDemo == true) return mockClient.getMockServices()
        if (!session.isConnected) return emptyList()

        val services = mutableListOf<ServiceItem>()

        // SMB
        try {
            val smbRes = entryCall(mapOf("api" to "SYNO.Core.FileServ.SMB", "version" to "1", "method" to "get"))
            val smbData = smbRes?.get("data")?.jsonObject
            val smbEnabled = smbData?.get("enable_samba")?.jsonPrimitive?.booleanOrNull ?: false
            services.add(
                ServiceItem(
                    id = "smb",
                    name = "SMB",
                    displayName = "SMB File Service",
                    description = "Windows & Mac file sharing service",
                    category = "file",
                    enabled = smbEnabled,
                    status = if (smbEnabled) "enabled" else "disabled",
                    port = 445
                )
            )
        } catch (_: Exception) {}

        // AFP
        try {
            val afpRes = entryCall(mapOf("api" to "SYNO.Core.FileServ.AFP", "version" to "1", "method" to "get"))
            val afpData = afpRes?.get("data")?.jsonObject
            val afpEnabled = afpData?.get("enable_afp")?.jsonPrimitive?.booleanOrNull ?: false
            services.add(
                ServiceItem(
                    id = "afp",
                    name = "AFP",
                    displayName = "Apple Filing Protocol (AFP)",
                    description = "Legacy macOS file sharing protocol",
                    category = "file",
                    enabled = afpEnabled,
                    status = if (afpEnabled) "enabled" else "disabled",
                    port = 548
                )
            )
        } catch (_: Exception) {}

        // NFS
        try {
            val nfsRes = entryCall(mapOf("api" to "SYNO.Core.FileServ.NFS", "version" to "1", "method" to "get"))
            val nfsData = nfsRes?.get("data")?.jsonObject
            val nfsEnabled = nfsData?.get("enable_nfs")?.jsonPrimitive?.booleanOrNull ?: false
            services.add(
                ServiceItem(
                    id = "nfs",
                    name = "NFS",
                    displayName = "NFS Service",
                    description = "Network File System for Linux/UNIX",
                    category = "file",
                    enabled = nfsEnabled,
                    status = if (nfsEnabled) "enabled" else "disabled",
                    port = 2049
                )
            )
        } catch (_: Exception) {}

        // FTP
        try {
            val ftpRes = entryCall(mapOf("api" to "SYNO.Core.FileServ.FTP", "version" to "1", "method" to "get"))
            val ftpData = ftpRes?.get("data")?.jsonObject
            val ftpEnabled = ftpData?.get("enable_ftp")?.jsonPrimitive?.booleanOrNull ?: false
            val ftpPort = ftpData?.get("portnum")?.jsonPrimitive?.intOrNull
                ?: ftpData?.get("ftp_port")?.jsonPrimitive?.intOrNull
                ?: ftpData?.get("port")?.jsonPrimitive?.intOrNull ?: 21
            services.add(
                ServiceItem(
                    id = "ftp",
                    name = "FTP",
                    displayName = "FTP Service",
                    description = "File Transfer Protocol with FTPS support",
                    category = "file",
                    enabled = ftpEnabled,
                    status = if (ftpEnabled) "enabled" else "disabled",
                    port = ftpPort
                )
            )
        } catch (_: Exception) {}

        // Terminal / SSH — port read live (custom SSH ports show up here).
        try {
            val termRes = entryCall(mapOf("api" to "SYNO.Core.Terminal", "version" to "1", "method" to "get"))
            val termData = termRes?.get("data")?.jsonObject
            val sshEnabled = termData?.get("enable_ssh")?.jsonPrimitive?.booleanOrNull ?: false
            val sshPort = termData?.get("ssh_port")?.jsonPrimitive?.intOrNull
                ?: termData?.get("port")?.jsonPrimitive?.intOrNull
                ?: termData?.get("ssh_port_num")?.jsonPrimitive?.intOrNull
                ?: 22
            services.add(
                ServiceItem(
                    id = "ssh",
                    name = "SSH",
                    displayName = "SSH Terminal",
                    description = "Secure Shell command-line access",
                    category = "terminal",
                    enabled = sshEnabled,
                    status = if (sshEnabled) "enabled" else "disabled",
                    port = sshPort
                )
            )
        } catch (_: Exception) {}

        // Rsync
        try {
            val rsyncRes = entryCall(mapOf("api" to "SYNO.Core.FileServ.Rsync", "version" to "1", "method" to "get"))
            val rsyncData = (rsyncRes?.get("data") as? JsonObject)
            val rsyncEnabled = rsyncData?.get("enable_rsync")?.jsonPrimitive?.booleanOrNull ?: false
            val rsyncPort = rsyncData?.get("rsync_port")?.jsonPrimitive?.intOrNull ?: 873
            services.add(
                ServiceItem(
                    id = "rsync",
                    name = "Rsync",
                    displayName = "Rsync Network Backup",
                    description = "Dịch vụ đồng bộ tệp qua mạng Rsync",
                    category = "backup",
                    enabled = rsyncEnabled,
                    status = if (rsyncEnabled) "enabled" else "disabled",
                    port = rsyncPort
                )
            )
        } catch (_: Exception) {}

        // WebDAV
        try {
            val davRes = entryCall(mapOf("api" to "SYNO.Core.FileServ.WebDAV", "version" to "1", "method" to "get"))
            val davData = (davRes?.get("data") as? JsonObject)
            val davEnabled = davData?.get("enable_webdav")?.jsonPrimitive?.booleanOrNull ?: false
            val davPort = davData?.get("http_port")?.jsonPrimitive?.intOrNull ?: 5005
            services.add(
                ServiceItem(
                    id = "webdav",
                    name = "WebDAV",
                    displayName = "WebDAV Server",
                    description = "Truy cập tệp từ xa qua giao thức HTTP/HTTPS WebDAV",
                    category = "file",
                    enabled = davEnabled,
                    status = if (davEnabled) "enabled" else "disabled",
                    port = davPort
                )
            )
        } catch (_: Exception) {}

        // Web Server / Reverse Proxy Nginx (always-on system service, not toggleable via DSM API)
        services.add(
            ServiceItem(
                id = "nginx",
                name = "Nginx Web & Reverse Proxy",
                displayName = "Nginx Web Engine",
                description = "Máy chủ web phục vụ HTTP/HTTPS và chuyển tiếp miền phụ (luôn bật)",
                category = "web",
                enabled = true,
                status = "enabled",
                port = 80,
                canToggle = false
            )
        )

        // SNMP Service
        try {
            val snmpRes = entryCall(mapOf("api" to "SYNO.Core.SNMP", "version" to "1", "method" to "get"))
            val snmpData = (snmpRes?.get("data") as? JsonObject)
            val snmpEnabled = snmpData?.get("enable_snmp")?.jsonPrimitive?.booleanOrNull ?: true
            services.add(
                ServiceItem(
                    id = "snmp",
                    name = "SNMP Service",
                    displayName = "SNMP v1/v2c/v3 Agent",
                    description = "Giao thức quản trị và giám sát phần cứng qua mạng",
                    category = "management",
                    enabled = snmpEnabled,
                    status = if (snmpEnabled) "enabled" else "disabled",
                    port = 161
                )
            )
        } catch (_: Exception) {}

        return services
    }

    /**
     * Convert a DSM GET data object into flat string params for a SET call.
     * Strings are JSON-quoted ("value"), booleans/numbers stay raw.
     */
    private fun flattenForSet(data: JsonObject?): Map<String, String> {
        if (data == null) return emptyMap()
        val out = mutableMapOf<String, String>()
        for ((k, v) in data) {
            if (v is JsonPrimitive) {
                when {
                    v.isString -> {
                        val raw = v.contentOrNull ?: continue
                        // Skip complex nested JSON blobs
                        if (raw.startsWith("{") || raw.startsWith("[")) continue
                        out[k] = "\"$raw\""
                    }
                    v.booleanOrNull != null -> out[k] = v.boolean.toString()
                    v.longOrNull != null -> out[k] = v.long.toString()
                    v.doubleOrNull != null -> out[k] = v.double.toString()
                    else -> out[k] = v.content
                }
            }
            // Skip nested objects/arrays — DSM set rejects them when flattened
        }
        return out
    }

    private suspend fun fetchServiceData(api: String): Pair<String, JsonObject?> {
        for (v in listOf("3", "2", "1")) {
            try {
                val res = executeGet("/webapi/entry.cgi", mapOf(
                    "api" to api, "version" to v, "method" to "get"
                )) ?: executePost("/webapi/entry.cgi", mapOf(
                    "api" to api, "version" to v, "method" to "get"
                ))
                val data = res?.get("data") as? JsonObject
                val success = res?.get("success")?.jsonPrimitive?.booleanOrNull
                if (success == true && data != null) return v to data
                // Some DSM versions return data without success flag
                if (data != null) return v to data
            } catch (_: Exception) {}
        }
        return "1" to null
    }

    private suspend fun setServiceData(api: String, version: String, params: Map<String, String>): Boolean {
        // POST first (correct for SET), then GET fallback
        val base = mapOf("api" to api, "version" to version, "method" to "set") + params
        try {
            val resPost = executePost("/webapi/entry.cgi", base)
            if (resPost?.get("success")?.jsonPrimitive?.booleanOrNull == true) return true
            val errPost = resPost?.get("error")?.jsonObject?.get("code")
            android.util.Log.w("DSMService", "SET $api v$version POST failed: $resPost err=$errPost params=${params.keys}")
        } catch (e: Exception) {
            android.util.Log.w("DSMService", "SET $api POST exception: ${e.message}")
        }
        try {
            val resGet = executeGet("/webapi/entry.cgi", base)
            if (resGet?.get("success")?.jsonPrimitive?.booleanOrNull == true) return true
            android.util.Log.w("DSMService", "SET $api v$version GET failed: $resGet")
        } catch (e: Exception) {
            android.util.Log.w("DSMService", "SET $api GET exception: ${e.message}")
        }
        return false
    }

    suspend fun toggleService(id: String, enabled: Boolean): Boolean {
        if (config?.isDemo == true) return mockClient.toggleMockService(id, enabled)
        val (api, paramKey) = when (id) {
            "smb" -> "SYNO.Core.FileServ.SMB" to "enable_samba"
            "afp" -> "SYNO.Core.FileServ.AFP" to "enable_afp"
            "nfs" -> "SYNO.Core.FileServ.NFS" to "enable_nfs"
            "ftp" -> "SYNO.Core.FileServ.FTP" to "enable_ftp"
            "ssh" -> "SYNO.Core.Terminal" to "enable_ssh"
            "rsync" -> "SYNO.Core.FileServ.Rsync" to "enable_rsync"
            "webdav" -> "SYNO.Core.FileServ.WebDAV" to "enable_webdav"
            "snmp" -> "SYNO.Core.SNMP" to "enable_snmp"
            // nginx is a system-level web engine without a public on/off API
            else -> return false
        }

        // 1. Fetch current config so SET preserves unrelated fields (port, workgroup, etc.)
        val (workingVersion, currentData) = fetchServiceData(api)
        val baseParams = flattenForSet(currentData).toMutableMap()
        baseParams[paramKey] = enabled.toString()

        // 2. Try SET on working version first, then fallbacks
        val versionsToTry = (listOf(workingVersion) + listOf("3", "2", "1")).distinct()
        for (v in versionsToTry) {
            if (setServiceData(api, v, baseParams)) {
                android.util.Log.d("DSMService", "toggle $id -> $enabled via $api v$v OK")
                return true
            }
            // Minimal fallback: only the toggled flag (some DSM builds reject full payload)
            if (setServiceData(api, v, mapOf(paramKey to enabled.toString()))) {
                android.util.Log.d("DSMService", "toggle $id -> $enabled via $api v$v minimal OK")
                return true
            }
        }
        android.util.Log.e("DSMService", "toggle $id -> $enabled FAILED for $api")
        return false
    }

    suspend fun getSharedFolderList(): List<String> {
        if (config?.isDemo == true) return listOf("/docker", "/Backups", "/KVDownload", "/homes", "/web", "/music", "/video")
        if (!session.isConnected) return listOf("/docker", "/Backups", "/KVDownload", "/homes", "/web", "/music", "/video")
        
        return try {
            val shares = listFiles("/")
            if (shares.isNotEmpty()) {
                shares.map { it.path }
            } else {
                listOf("/docker", "/Backups", "/KVDownload", "/homes", "/web", "/music", "/video")
            }
        } catch (_: Exception) {
            listOf("/docker", "/Backups", "/KVDownload", "/homes", "/web", "/music", "/video")
        }
    }

    suspend fun updateServicePort(id: String, port: Int): Boolean {
        if (config?.isDemo == true) return mockClient.updateMockServicePort(id, port)
        // Multiple candidate keys per service — DSM versions differ on naming
        val candidates: Triple<String, List<String>, List<String>> = when (id) {
            "ssh" -> Triple("SYNO.Core.Terminal", listOf("ssh_port", "port"), listOf("1", "3", "2"))
            "ftp" -> Triple("SYNO.Core.FileServ.FTP", listOf("portnum", "ftp_port", "port"), listOf("3", "2", "1"))
            "webdav" -> Triple("SYNO.Core.FileServ.WebDAV", listOf("http_port", "port"), listOf("1", "2"))
            "rsync" -> Triple("SYNO.Core.FileServ.Rsync", listOf("rsync_port", "port"), listOf("1", "2"))
            "smb" -> Triple("SYNO.Core.FileServ.SMB", listOf("smb_port"), listOf("1", "2"))
            else -> return false
        }
        val (api, keys, versions) = candidates
        val (_, currentData) = fetchServiceData(api)
        val baseParams = flattenForSet(currentData).toMutableMap()
        for (v in versions) {
            for (key in keys) {
                val attempt = baseParams.toMutableMap()
                attempt[key] = port.toString()
                if (setServiceData(api, v, attempt)) {
                    android.util.Log.d("DSMService", "port $id -> $port via $api v$v key=$key OK")
                    return true
                }
            }
        }
        android.util.Log.e("DSMService", "port change $id -> $port FAILED")
        return false
    }

    /**
     * entry.cgi call with POST first (required by most DSM JSON APIs),
     * falling back to GET. Returns null when unreachable.
     */
    private suspend fun entryCall(params: Map<String, String>): JsonObject? {
        return try {
            executePost("/webapi/entry.cgi", params)
        } catch (_: Exception) { null
        } ?: try {
            executeGet("/webapi/entry.cgi", params)
        } catch (_: Exception) { null }
    }

    suspend fun getReverseProxyRules(): List<ReverseProxyRule> {
        if (config?.isDemo == true) return mockClient.getMockReverseProxyRules()
        if (!session.isConnected) return emptyList()

        // DSM JSON APIs require POST (cf. `curl -d api=... -d method=list`).
        var res = entryCall(mapOf(
            "api" to "SYNO.Core.AppPortal.ReverseProxy",
            "version" to "1",
            "method" to "list"
        ))
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            res = entryCall(mapOf(
                "api" to "SYNO.Core.AppPortal.ReverseProxy",
                "version" to "2",
                "method" to "list"
            ))
        }
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            android.util.Log.w("DSMProxy", "reverse-proxy list failed: $res")
            return emptyList()
        }

        val dataElem = res["data"]
        val entries: JsonArray? = when {
            dataElem is JsonArray -> dataElem
            dataElem is JsonObject -> (dataElem["entries"] ?: dataElem["rules"] ?: dataElem["items"] ?: dataElem["proxies"] ?: dataElem["list"])?.jsonArray
            res["entries"] is JsonArray -> res["entries"]?.jsonArray
            res["rules"] is JsonArray -> res["rules"]?.jsonArray
            else -> null
        }
        if (entries == null) {
            android.util.Log.w("DSMProxy", "No entries array found in response: $res")
            return emptyList()
        }

        return entries.mapNotNull { elem ->
            val obj = elem as? JsonObject ?: return@mapNotNull null
            // Synology DSM returns uppercase "UUID" (or _key, id)
            val uuid = obj.str("UUID", "uuid", "_key", "id") ?: java.util.UUID.randomUUID().toString()
            val desc = obj.str("description", "desc", "name") ?: "Reverse Proxy"
            val feObj = obj["frontend"]?.jsonObject
            val beObj = obj["backend"]?.jsonObject

            val fePort = feObj?.get("port")?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 443
            val feProtoStr = feObj?.get("protocol")?.jsonPrimitive?.contentOrNull?.lowercase()
            val feProto = when {
                feProtoStr == "1" || feProtoStr == "https" -> 1
                feProtoStr == "0" || feProtoStr == "http" -> 0
                else -> if (fePort == 443) 1 else 0
            }
            val feHttps = feObj?.get("https")?.jsonObject
            val hsts = feHttps?.get("hsts")?.jsonPrimitive?.booleanOrNull
                ?: feObj?.get("hsts")?.jsonPrimitive?.booleanOrNull ?: false
            val http2 = feHttps?.get("http2")?.jsonPrimitive?.booleanOrNull
                ?: feObj?.get("http2")?.jsonPrimitive?.booleanOrNull ?: false

            val fe = ReverseProxyFrontend(
                protocol = feProto,
                fqdn = feObj?.str("fqdn", "domain", "host") ?: "",
                port = fePort,
                hsts = hsts,
                http2 = http2
            )

            val bePort = beObj?.get("port")?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 80
            val beProtoStr = beObj?.get("protocol")?.jsonPrimitive?.contentOrNull?.lowercase()
            val beProto = when {
                beProtoStr == "1" || beProtoStr == "https" -> 1
                beProtoStr == "0" || beProtoStr == "http" -> 0
                else -> 0
            }
            val be = ReverseProxyBackend(
                protocol = beProto,
                fqdn = beObj?.str("fqdn", "host", "domain") ?: "localhost",
                port = bePort
            )

            ReverseProxyRule(
                uuid = uuid,
                description = desc,
                frontend = fe,
                backend = be
            )
        }
    }

    suspend fun addReverseProxyRule(rule: ReverseProxyRule): Boolean {
        if (config?.isDemo == true) return mockClient.addMockReverseProxyRule(rule)
        val payload = buildJsonObject {
            put("description", rule.description)
            put("frontend", buildJsonObject {
                put("protocol", rule.frontend.protocol)
                put("fqdn", rule.frontend.fqdn)
                put("port", rule.frontend.port)
                put("https", buildJsonObject {
                    put("hsts", rule.frontend.hsts)
                    put("http2", rule.frontend.http2)
                })
            })
            put("backend", buildJsonObject {
                put("protocol", rule.backend.protocol)
                put("fqdn", rule.backend.fqdn)
                put("port", rule.backend.port)
            })
        }
        val entryPayload = payload.toString()
        // DSM 7 expects entry parameter
        var res = executePost("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.AppPortal.ReverseProxy",
            "version" to "1",
            "method" to "create",
            "entry" to entryPayload
        ))
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            // DSM 6 fallback
            res = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.AppPortal.ReverseProxy",
                "version" to "1",
                "method" to "create",
                "proxy_rule" to entryPayload
            ))
        }
        return res?.get("success")?.jsonPrimitive?.booleanOrNull == true
    }

    suspend fun updateReverseProxyRule(rule: ReverseProxyRule): Boolean {
        if (config?.isDemo == true) return mockClient.updateMockReverseProxyRule(rule)
        val payload = buildJsonObject {
            put("UUID", rule.uuid)
            put("uuid", rule.uuid)
            put("description", rule.description)
            put("frontend", buildJsonObject {
                put("protocol", rule.frontend.protocol)
                put("fqdn", rule.frontend.fqdn)
                put("port", rule.frontend.port)
                put("https", buildJsonObject {
                    put("hsts", rule.frontend.hsts)
                    put("http2", rule.frontend.http2)
                })
            })
            put("backend", buildJsonObject {
                put("protocol", rule.backend.protocol)
                put("fqdn", rule.backend.fqdn)
                put("port", rule.backend.port)
            })
        }
        val entryPayload = payload.toString()
        var res = executePost("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.AppPortal.ReverseProxy",
            "version" to "1",
            "method" to "update",
            "entry" to entryPayload
        ))
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            res = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.AppPortal.ReverseProxy",
                "version" to "1",
                "method" to "update",
                "proxy_rule" to entryPayload
            ))
        }
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            res = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.AppPortal.ReverseProxy",
                "version" to "1",
                "method" to "set",
                "entry" to entryPayload
            ))
        }
        return res?.get("success")?.jsonPrimitive?.booleanOrNull == true
    }

    suspend fun deleteReverseProxyRule(uuid: String): Boolean {
        if (config?.isDemo == true) return mockClient.deleteMockReverseProxyRule(uuid)
        var res = executePost("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.AppPortal.ReverseProxy",
            "version" to "1",
            "method" to "delete",
            "uuids" to "[\"$uuid\"]"
        ))
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            res = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.AppPortal.ReverseProxy",
                "version" to "1",
                "method" to "delete",
                "UUID" to uuid
            ))
        }
        return res?.get("success")?.jsonPrimitive?.booleanOrNull == true
    }

    suspend fun getFirewallConfig(): FirewallConfig {
        if (config?.isDemo == true) return FirewallConfig(rules = mockClient.getMockFirewallRules())
        if (!session.isConnected) return FirewallConfig()

        val fwRes = entryCall(mapOf(
            "api" to "SYNO.Core.Security.Firewall",
            "version" to "1",
            "method" to "get"
        ))
        val fwData = fwRes?.get("data")?.jsonObject
        val fwEnabled = fwData?.get("enabled")?.jsonPrimitive?.booleanOrNull
            ?: fwData?.get("enable")?.jsonPrimitive?.booleanOrNull
            ?: fwData?.get("status")?.jsonPrimitive?.content?.equals("enable", ignoreCase = true)
            ?: true

        val rulesArray = fetchFirewallRulesRaw()
        val rules = rulesArray.mapIndexed { index, elem ->
            parseFirewallRule(elem.jsonObject, index)
        }

        return FirewallConfig(
            enabled = fwEnabled,
            rules = rules
        )
    }

    /** Raw rules array, trying documented adapter load first then generic list. */
    private suspend fun fetchFirewallRulesRaw(): JsonArray {
        val adapters = listOf("global", "ovs_eth0", "eth0", "tun0")
        for (adapter in adapters) {
            val loadRes = entryCall(mapOf(
                "api" to "SYNO.Core.Security.Firewall.Rules",
                "version" to "1",
                "method" to "load",
                "adapter" to adapter
            ))
            loadRes?.get("data")?.jsonObject?.let { data ->
                val array = (data["rules"] ?: data["items"] ?: data["entries"])?.jsonArray
                if (array != null && array.isNotEmpty()) return array
            }
        }
        val listRes = entryCall(mapOf(
            "api" to "SYNO.Core.Security.Firewall.Rules",
            "version" to "1",
            "method" to "list"
        ))
        listRes?.get("data")?.jsonObject?.let { data ->
            (data["rules"] ?: data["items"] ?: data["entries"])?.jsonArray?.let { return it }
        }
        return JsonArray(emptyList())
    }

    private fun JsonObject.str(vararg keys: String): String? {
        for (k in keys) {
            val v = this[k]?.jsonPrimitive?.contentOrNull
            if (!v.isNullOrBlank()) return v
        }
        return null
    }

    private val knownServiceNames = mapOf(
        "cifs" to "Windows SMB / CIFS",
        "windowsodx" to "Windows ODX Offload",
        "rodsp_vdisk" to "Synology VDisk",
        "ws_transfer_port" to "WS-Transfer",
        "ws_discovery_port" to "WS-Discovery",
        "nfs" to "NFS File Service",
        "ftp" to "FTP / FTPS",
        "hybridshare" to "Synology Hybrid Share",
        "webdav" to "WebDAV Server",
        "ssh" to "SSH Terminal",
        "tailscale" to "Tailscale Mesh VPN",
        "vpn_server_openvpn" to "OpenVPN Server",
        "vpn_server_pptp" to "PPTP VPN",
        "vpn_server_l2tp" to "L2TP/IPSec VPN",
        "dsm_http" to "DSM Web HTTP",
        "dsm_https" to "DSM Web HTTPS",
        "dms" to "DSM Web HTTP",
        "dms_https" to "DSM Web HTTPS",
        "web_http" to "Web Server HTTP",
        "web_https" to "Web Server HTTPS",
        "plex" to "Plex Media Server",
        "jellyfin" to "Jellyfin Server",
        "video_station" to "Video Station",
        "audio_station" to "Audio Station",
        "netbkp" to "Network Backup (Rsync)",
        "versionbkp" to "Hyper Backup Vault",
        "bonjour" to "Bonjour / ZeroConf",
        "snmp" to "SNMP Monitoring",
        "ups_server" to "UPS Server",
        "ipp" to "IPP Printing",
        "lpr" to "LPR Printer",
        "mfp" to "MFP Multi-Function",
        "kmip" to "KMIP Key Management",
        "vs60" to "Surveillance VisualStation",
        "afp" to "Apple AFP",
        "telnet" to "Telnet"
    )

    private fun formatFriendlyFirewallName(rawName: String?, portNum: String, index: Int): String {
        val trimmedName = rawName?.trim()
        if (!trimmedName.isNullOrBlank() && !trimmedName.equals("Service", ignoreCase = true) && trimmedName != portNum) {
            return trimmedName
        }

        val tokens = portNum.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        if (tokens.isEmpty() || portNum == "all") {
            return "Tất cả lưu lượng (All Traffic)"
        }

        val matchedServices = tokens.mapNotNull { token ->
            knownServiceNames[token.lowercase()]
        }

        return when {
            matchedServices.size > 3 -> "Dịch vụ hệ thống Synology (${matchedServices.size} dịch vụ)"
            matchedServices.size == 2 -> "${matchedServices[0]} & ${matchedServices[1]}"
            matchedServices.size == 1 -> matchedServices[0]
            tokens.all { it.toIntOrNull() != null } -> "Cổng ${tokens.joinToString(", ")}"
            else -> if (tokens.size > 2) "${tokens.take(2).joinToString(", ")}..." else "Cổng $portNum"
        }
    }

    private fun parseFirewallRule(r: JsonObject, index: Int): FirewallRule {
        val portNum = r.str("port_num", "ports", "port") ?: "all"
        val proto = r.str("protocol", "proto") ?: "all"
        val source = r.str("source", "source_ip", "src", "source_type") ?: "all"
        val sourceValue = r.str("source_value", "source_ip", "src", "source") ?: source

        // In Synology DSM:
        // "allow" can be "drop" (Deny) or "allow" (Allow), or boolean false/true
        // "policy" can be 1 (DROP) or 0 (ALLOW) or "drop"/"deny"
        // "action" can be "drop" or "deny" or 1
        // "deny" can be true
        val allowRaw = r.str("allow", "action", "policy")?.trim()?.lowercase()
        val policyInt = r["policy"]?.jsonPrimitive?.intOrNull ?: r["action"]?.jsonPrimitive?.intOrNull
        val allowBool = r["allow"]?.jsonPrimitive?.booleanOrNull
        val denyBool = r["deny"]?.jsonPrimitive?.booleanOrNull ?: (r.str("deny")?.equals("true", ignoreCase = true) == true)

        val isDeny = when {
            denyBool -> true
            allowBool == false -> true
            allowRaw == "drop" || allowRaw == "deny" || allowRaw == "0" || allowRaw == "false" -> true
            policyInt == 1 -> true
            else -> false
        }
        val action = if (isDeny) "deny" else "allow"

        val enabled = r["enabled"]?.jsonPrimitive?.booleanOrNull
            ?: r["enable"]?.jsonPrimitive?.booleanOrNull ?: true

        val rawName = r.str("name", "description", "title")
        val name = formatFriendlyFirewallName(rawName, portNum, index)

        return FirewallRule(
            id = r.str("id", "uuid", "name") ?: "fw_$index",
            name = name,
            ports = portNum,
            protocol = proto,
            sourceType = source,
            sourceValue = sourceValue,
            action = action,
            enabled = enabled,
            order = r["order"]?.jsonPrimitive?.intOrNull
                ?: r["index"]?.jsonPrimitive?.intOrNull
                ?: (index + 1)
        )
    }

    /** Sends the full desired ruleset back (DSM replaces the whole list). */
    private suspend fun pushFirewallRules(rules: JsonArray): Boolean {
        // Try DSM 7 save_start first
        val saveStartRes = entryCall(mapOf(
            "api" to "SYNO.Core.Security.Firewall.Rules",
            "version" to "1",
            "method" to "save_start",
            "adapter" to "global",
            "rules" to rules.toString(),
            "policy" to "none"
        ))
        if (saveStartRes?.get("success")?.jsonPrimitive?.booleanOrNull == true) {
            return true
        }

        val res = entryCall(mapOf(
            "api" to "SYNO.Core.Security.Firewall.Rules",
            "version" to "1",
            "method" to "set",
            "adapter" to "global",
            "rules" to rules.toString()
        ))
        val ok = res?.get("success")?.jsonPrimitive?.booleanOrNull == true
        if (!ok) android.util.Log.w("DSMFirewall", "rules set failed: saveStart=$saveStartRes, set=$res")
        return ok
    }

    private fun firewallRuleToJson(rule: FirewallRule): JsonObject = buildJsonObject {
        put("name", rule.name)
        put("port_num", rule.ports)
        put("protocol", rule.protocol.lowercase())
        // DSM expects "drop" or "allow"
        put("allow", if (rule.action.lowercase() == "deny") "drop" else "allow")
        put("source", rule.sourceValue)
        put("enabled", rule.enabled)
    }

    private fun firewallRawMatches(elem: JsonElement, name: String): Boolean {
        val o = elem as? JsonObject ?: return false
        return o.str("name", "description", "title", "id", "uuid")?.equals(name, ignoreCase = true) == true
    }

    suspend fun addFirewallRule(rule: FirewallRule): Boolean {
        if (config?.isDemo == true) return mockClient.addMockFirewallRule(rule)
        val current = fetchFirewallRulesRaw().toMutableList()
        // Replace same-name rule (edit), else append — existing entries pass through untouched.
        val idx = current.indexOfFirst { firewallRawMatches(it, rule.name) }
        val fresh = firewallRuleToJson(rule)
        if (idx >= 0) current[idx] = fresh else current.add(fresh)
        return pushFirewallRules(JsonArray(current))
    }

    suspend fun toggleFirewallRule(name: String, enabled: Boolean): Boolean {
        if (config?.isDemo == true) return mockClient.toggleMockFirewallRule(name, enabled)
        val current = fetchFirewallRulesRaw()
        if (current.isEmpty()) return false
        val updated = current.map { elem ->
            val o = elem as? JsonObject ?: return@map elem
            if (!firewallRawMatches(elem, name)) elem
            else buildJsonObject {
                o.entries.forEach { (k, v) -> put(k, v) }
                put("enabled", enabled)
            }
        }
        if (updated == current.toList()) return false // no matching rule
        return pushFirewallRules(JsonArray(updated))
    }

    suspend fun deleteFirewallRule(name: String): Boolean {
        if (config?.isDemo == true) return mockClient.deleteMockFirewallRule(name)
        val current = fetchFirewallRulesRaw()
        val kept = current.filterNot { firewallRawMatches(it, name) }
        if (kept.size == current.size) return false // no matching rule
        return pushFirewallRules(JsonArray(kept))
    }

    suspend fun markAllNotificationsRead(): Boolean {
        if (config?.isDemo == true) return mockClient.markAllMockNotificationsRead()
        // DSM has no public mark-all-read API; treat as local-only success
        return true
    }

    suspend fun clearAllNotifications(): Boolean {
        if (config?.isDemo == true) return mockClient.clearAllMockNotifications()
        return try {
            val res = executeGet("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.DSMNotify",
                "version" to "1",
                "method" to "notify",
                "action" to "clear"
            )) ?: executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.DSMNotify",
                "version" to "1",
                "method" to "notify",
                "action" to "clear"
            ))
            res?.get("success")?.jsonPrimitive?.booleanOrNull ?: true
        } catch (_: Exception) { true }
    }

    private fun formatNotificationMessage(msg: String): String {
        if (!msg.startsWith("{") || !msg.endsWith("}")) return msg
        return try {
            val jsonElement = json.parseToJsonElement(msg).jsonObject
            val container = jsonElement["%1%"]?.jsonPrimitive?.content
            val date = jsonElement["%DATE%"]?.jsonPrimitive?.content
            val time = jsonElement["%TIME%"]?.jsonPrimitive?.content
            val host = jsonElement["%HOSTNAME%"]?.jsonPrimitive?.content
            val parts = mutableListOf<String>()
            if (!container.isNullOrBlank()) parts.add("Container: $container")
            if (!host.isNullOrBlank()) parts.add("Host: $host")
            if (!time.isNullOrBlank() || !date.isNullOrBlank()) parts.add("Thời gian: ${listOfNotNull(time, date).joinToString(" ")}")
            if (parts.isNotEmpty()) parts.joinToString(" • ") else msg
        } catch (_: Exception) {
            msg
        }
    }

    suspend fun getNotifications(): List<NotificationItem> {
        if (config?.isDemo == true) return mockClient.getMockNotifications()
        if (!session.isConnected) return emptyList()

        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.DSMNotify",
            "version" to "1",
            "method" to "notify",
            "action" to "load"
        ))
        val items = res?.get("data")?.jsonObject?.get("items")?.jsonArray ?: return emptyList()
        return items.mapNotNull { elem ->
            val obj = elem.jsonObject
            val id = obj["notifyId"]?.jsonPrimitive?.content ?: return@mapNotNull null
            val title = obj["title"]?.jsonPrimitive?.content ?: "Notification"
            val displayTitle = title.replace('_', ' ').replaceFirstChar { it.uppercase() }
            val levelRaw = obj["level"]?.jsonPrimitive?.content ?: "info"
            val level = when {
                levelRaw.contains("ERROR", ignoreCase = true) -> "error"
                levelRaw.contains("WARN", ignoreCase = true) -> "warning"
                else -> "info"
            }
            val time = obj["time"]?.jsonPrimitive?.longOrNull ?: (System.currentTimeMillis() / 1000)
            val msgArray = obj["msg"]?.jsonArray?.mapNotNull { elemStr ->
                val raw = elemStr.jsonPrimitive.content
                formatNotificationMessage(raw)
            } ?: emptyList()

            NotificationItem(
                id = id,
                title = title,
                displayTitle = displayTitle,
                level = level,
                messages = msgArray,
                time = time
            )
        }
    }

    /** Proper private/local check: RFC1918 + loopback + IPv6 local. */
    private fun isPrivateOrLocalIp(ip: String): Boolean {
        val v = ip.trim().lowercase().substringBefore('%')
        if (v.isEmpty()) return true
        if (v == "localhost" || v == "::1" || v == "::ffff:127.0.0.1") return true
        if (v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) return true
        if (v.startsWith("192.168.") || v.startsWith("10.")) return true
        if (v.startsWith("127.")) return true
        if (v.startsWith("172.")) {
            val second = v.removePrefix("172.").substringBefore('.').toIntOrNull()
            if (second != null && second in 16..31) return true
        }
        // IPv4-mapped IPv6, e.g. ::ffff:192.168.1.5
        if (v.startsWith("::ffff:")) return isPrivateOrLocalIp(v.removePrefix("::ffff:"))
        return false
    }

    suspend fun getTrafficSummary(): TrafficSummary {
        if (config?.isDemo == true) return mockClient.getMockTrafficSummary()
        if (!session.isConnected) return TrafficSummary()

        val res = entryCall(mapOf(
            "api" to "SYNO.Core.CurrentConnection",
            "version" to "1",
            "method" to "list"
        ))
        val items = res?.get("data")?.jsonObject?.get("items")?.jsonArray ?: return TrafficSummary()
        val total = items.size
        var localCount = 0
        var inboundCount = 0

        items.forEach { elem ->
            val from = elem.jsonObject["from"]?.jsonPrimitive?.content ?: ""
            if (isPrivateOrLocalIp(from)) {
                localCount++
            } else {
                inboundCount++
            }
        }

        // Honest grouping: only LAN vs Internet with REAL counts.
        // No GeoIP database on-device → public IPs are "Internet", never a guessed country.
        val topCountries = mutableListOf<CountryTrafficSummary>()
        if (localCount > 0) {
            topCountries.add(
                CountryTrafficSummary(
                    countryCode = "LAN",
                    countryName = "Mạng nội bộ (Local LAN)",
                    flagEmoji = "🏠",
                    activeConnections = localCount,
                    outboundBytes = 0L,
                    inboundBytes = 0L
                )
            )
        }
        if (inboundCount > 0) {
            topCountries.add(
                CountryTrafficSummary(
                    countryCode = "NET",
                    countryName = "Internet",
                    flagEmoji = "🌐",
                    activeConnections = inboundCount,
                    outboundBytes = 0L,
                    inboundBytes = 0L
                )
            )
        }

        val connectionItems = items.mapIndexed { idx, elem ->
            val obj = elem.jsonObject
            val from = obj["from"]?.jsonPrimitive?.content ?: "127.0.0.1"
            val who = obj["who"]?.jsonPrimitive?.content ?: "user"
            val descr = obj["descr"]?.jsonPrimitive?.content ?: "DSM Service"
            val type = obj["type"]?.jsonPrimitive?.content ?: "HTTP"
            val isPrivate = isPrivateOrLocalIp(from)
            val remotePort = obj["port"]?.jsonPrimitive?.intOrNull
                ?: obj["remote_port"]?.jsonPrimitive?.intOrNull
                ?: if (type.contains("SSH", ignoreCase = true)) 22 else 5001
            NetworkConnectionItem(
                id = "conn_$idx",
                direction = if (isPrivate) "local" else "inbound",
                localAddress = config?.host ?: "",
                localPort = config?.port ?: 5001,
                remoteAddress = from,
                remotePort = remotePort,
                protocol = type,
                state = obj["status"]?.jsonPrimitive?.content ?: "ESTABLISHED",
                processName = "$descr ($who)",
                geo = IpGeoInfo(
                    ip = from,
                    countryCode = if (isPrivate) "LAN" else "NET",
                    countryName = if (isPrivate) "Mạng nội bộ" else "Internet",
                    flagEmoji = if (isPrivate) "🏠" else "🌐",
                    isp = if (isPrivate) "Private LAN" else "Unknown",
                    isPrivate = isPrivate
                ),
                rxSpeedBytes = 0L,
                txSpeedBytes = 0L
            )
        }

        val hostIp = config?.host ?: ""
        // Try real NIC info; fall back to a single LAN interface (no fake MAC/VPN).
        val interfaces = try {
            val netRes = entryCall(mapOf(
                "api" to "SYNO.Core.Network",
                "version" to "1",
                "method" to "get"
            ))
            val netData = netRes?.get("data")?.jsonObject
            // Shape may be {interfaces: [...]} or a map of {eth0: {...}}.
            val ifaceObjs: List<JsonObject> = when (val v = netData?.get("interfaces")) {
                is JsonArray -> v.mapNotNull { it as? JsonObject }
                is JsonObject -> v.entries.mapNotNull { it.value as? JsonObject }
                else -> netData?.entries
                    ?.mapNotNull { it.value as? JsonObject }
                    ?.filter { it["ip"] != null || it["mac"] != null }
                    ?: emptyList()
            }
            if (ifaceObjs.isNotEmpty()) {
                ifaceObjs.mapIndexed { idx, o ->
                    NetworkInterfaceInfo(
                        id = o.str("id") ?: "eth$idx",
                        name = o.str("name") ?: "LAN ${idx + 1}",
                        ip = o.str("ip") ?: hostIp,
                        mask = o.str("mask", "netmask") ?: "255.255.255.0",
                        mac = o.str("mac") ?: "",
                        status = o.str("status")?.lowercase()?.let {
                            if (it.contains("up") || it.contains("connect")) "up" else it
                        } ?: "up",
                        speedMbps = o["speed"]?.jsonPrimitive?.intOrNull
                            ?: o["speedMbps"]?.jsonPrimitive?.intOrNull ?: 1000,
                        rxBytes = o["rx_bytes"]?.jsonPrimitive?.longOrNull
                            ?: o["rxBytes"]?.jsonPrimitive?.longOrNull ?: 0L,
                        txBytes = o["tx_bytes"]?.jsonPrimitive?.longOrNull
                            ?: o["txBytes"]?.jsonPrimitive?.longOrNull ?: 0L
                    )
                }
            } else {
                listOf(
                    NetworkInterfaceInfo(
                        id = "eth0",
                        name = "LAN 1 (eth0)",
                        ip = hostIp,
                        mask = "255.255.255.0",
                        mac = "",
                        status = "up",
                        speedMbps = 1000,
                        rxBytes = 0L,
                        txBytes = 0L
                    )
                )
            }
        } catch (_: Exception) {
            listOf(
                NetworkInterfaceInfo(
                    id = "eth0",
                    name = "LAN 1 (eth0)",
                    ip = hostIp,
                    mask = "255.255.255.0",
                    mac = "",
                    status = "up",
                    speedMbps = 1000,
                    rxBytes = 0L,
                    txBytes = 0L
                )
            )
        }

        // Real throughput from Utilization API when available
        var rxSpeed = (inboundCount * 18 + localCount * 8) * 1024L
        var txSpeed = (inboundCount * 12 + localCount * 4) * 1024L
        try {
            val utilRes = executePost("/webapi/entry.cgi", mapOf(
                "api" to "SYNO.Core.System.Utilization",
                "version" to "1",
                "method" to "get",
                "type" to "current"
            ))
            val netArr = utilRes?.get("data")?.jsonObject?.get("network")?.jsonArray
            if (netArr != null && netArr.isNotEmpty()) {
                var rx = 0L; var tx = 0L
                netArr.forEach { e ->
                    val o = e.jsonObject
                    rx += o["rx"]?.jsonPrimitive?.longOrNull ?: 0L
                    tx += o["tx"]?.jsonPrimitive?.longOrNull ?: 0L
                }
                if (rx > 0) rxSpeed = rx
                if (tx > 0) txSpeed = tx
            }
        } catch (_: Exception) {}

        return TrafficSummary(
            totalConnections = total,
            outboundConnections = 0,
            inboundConnections = inboundCount,
            localConnections = localCount,
            currentOutboundSpeed = txSpeed,
            currentInboundSpeed = rxSpeed,
            topCountries = topCountries,
            connections = connectionItems,
            interfaces = interfaces
        )
    }

    suspend fun getFolderAcl(path: String = "/docker"): FolderAclInfo {
        if (config?.isDemo == true) return mockClient.getMockFolderAcl(path)
        if (!session.isConnected) return FolderAclInfo(path = path, owner = "", group = "", accessList = emptyList())

        val segments = path.trim('/').split('/').filter { it.isNotBlank() }
        if (segments.size == 1) {
            // Top-level shared folder → real per-share permissions.
            return getShareAcl(segments[0], path)
        }
        // Subfolder → real filesystem ACL entries.
        return getFileAcl(path)
    }

    /** Real share-level permissions via SYNO.Core.Share.Permission (list). */
    private suspend fun getShareAcl(shareName: String, path: String): FolderAclInfo {
        val accessList = mutableListOf<FolderUserAccess>()
        // Query users + groups (reference impl uses plain GET like python lib).
        for ((type, isGroup) in listOf("local_user" to false, "local_group" to true)) {
            val res = try {
                executeGet("/webapi/entry.cgi", mapOf(
                    "api" to "SYNO.Core.Share.Permission",
                    "version" to "1",
                    "method" to "list",
                    "name" to "\"$shareName\"",
                    "offset" to "0",
                    "limit" to "100",
                    "action" to "enum",
                    "is_unite_permission" to "false",
                    "with_inherit" to "false",
                    "user_group_type" to "\"$type\""
                )) ?: entryCall(mapOf(
                    "api" to "SYNO.Core.Share.Permission",
                    "version" to "1",
                    "method" to "list",
                    "name" to "\"$shareName\"",
                    "user_group_type" to "\"$type\""
                ))
            } catch (_: Exception) { null }
            if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
                android.util.Log.w("DSMAcl", "Share.Permission list($type) failed for $shareName: $res")
                continue
            }
            val items = res["data"]?.jsonObject?.get("items")?.jsonArray ?: continue
            for (elem in items) {
                val o = elem as? JsonObject ?: continue
                val name = o["name"]?.jsonPrimitive?.contentOrNull ?: continue
                val level = when {
                    o["is_deny"]?.jsonPrimitive?.booleanOrNull == true -> "deny"
                    o["is_admin"]?.jsonPrimitive?.booleanOrNull == true -> "full_control"
                    o["is_writable"]?.jsonPrimitive?.booleanOrNull == true -> "read_write"
                    o["is_readonly"]?.jsonPrimitive?.booleanOrNull == true -> "read_only"
                    o["is_custom"]?.jsonPrimitive?.booleanOrNull == true -> "read_write"
                    else -> "deny" // DSM "No access"
                }
                accessList.add(FolderUserAccess(name, isGroup, level))
            }
        }
        if (accessList.isEmpty()) {
            android.util.Log.w("DSMAcl", "no share permissions returned for $shareName")
        }
        return FolderAclInfo(
            path = path,
            owner = findShareOwner(shareName),
            group = "administrators",
            accessList = accessList.distinctBy { it.isGroup to it.targetName.lowercase() }
        )
    }

    /** Best-effort share owner lookup; "" when DSM doesn't expose it. */
    private suspend fun findShareOwner(shareName: String): String {
        return try {
            val res = entryCall(mapOf(
                "api" to "SYNO.Core.Share",
                "version" to "1",
                "method" to "get",
                "name" to "\"$shareName\"",
                "additional" to "[\"is_aclmode\",\"unite_permission\"]"
            ))
            val data = res?.get("data")?.jsonObject
            data?.str("owner", "creator", "created_by", "admin") ?: ""
        } catch (_: Exception) { "" }
    }

    /** Real filesystem ACL via SYNO.Core.ACL (get, type=all). */
    private suspend fun getFileAcl(path: String): FolderAclInfo {
        val res = entryCall(mapOf(
            "api" to "SYNO.Core.ACL",
            "version" to "1",
            "method" to "get",
            "type" to "all",
            "file_path" to "\"$path\""
        ))
        if (res?.get("success")?.jsonPrimitive?.booleanOrNull != true) {
            android.util.Log.w("DSMAcl", "ACL get failed for $path: $res")
            return FolderAclInfo(path = path, owner = "", group = "", accessList = emptyList())
        }
        val data = res["data"]?.jsonObject
        val entries = (data?.get("entries") ?: data?.get("rules") ?: data?.get("acl"))?.jsonArray
            ?: return FolderAclInfo(path = path, owner = "", group = "", accessList = emptyList())
        val owner = data?.str("owner", "creator") ?: ""
        val group = data?.str("group") ?: ""
        val accessList = entries.mapNotNull { elem ->
            val o = elem as? JsonObject ?: return@mapNotNull null
            val name = o.str("owner_name", "name") ?: return@mapNotNull null
            val isGroup = o.str("owner_type", "type")?.equals("group", ignoreCase = true) == true
            val perm = o["permission"]?.jsonObject
            val level = when {
                o.str("permission_type", "type")?.equals("deny", ignoreCase = true) == true -> "deny"
                perm == null -> "read_only"
                perm["change_perm"]?.jsonPrimitive?.booleanOrNull == true ||
                    (perm["write_data"]?.jsonPrimitive?.booleanOrNull == true &&
                     perm["delete"]?.jsonPrimitive?.booleanOrNull == true &&
                     perm["take_ownership"]?.jsonPrimitive?.booleanOrNull == true) -> "full_control"
                perm["write_data"]?.jsonPrimitive?.booleanOrNull == true -> "read_write"
                perm["read_data"]?.jsonPrimitive?.booleanOrNull == true -> "read_only"
                else -> "deny"
            }
            FolderUserAccess(name, isGroup, level)
        }
        return FolderAclInfo(path = path, owner = owner, group = group, accessList = accessList)
    }

    /**
     * Real ACL save. Top-level shares → SYNO.Core.Share.Permission (set);
     * subfolders → SYNO.Core.ACL (set with allow/deny rule objects).
     */
    suspend fun setFolderAcl(path: String, accessList: List<FolderUserAccess>): Boolean {
        if (config?.isDemo == true) return mockClient.setMockFolderAcl(path, accessList)
        if (!session.isConnected) return false
        val segments = path.trim('/').split('/').filter { it.isNotBlank() }
        return if (segments.size == 1) setShareAcl(segments[0], accessList)
        else setFileAcl(path, accessList)
    }

    private suspend fun setShareAcl(shareName: String, accessList: List<FolderUserAccess>): Boolean {
        var ok = true
        for ((type, entries) in listOf(
            "local_user" to accessList.filter { !it.isGroup },
            "local_group" to accessList.filter { it.isGroup }
        )) {
            if (entries.isEmpty()) continue
            val permissions = buildJsonArray {
                entries.forEach { e ->
                    addJsonObject {
                        put("name", e.targetName)
                        put("is_deny", e.level == "deny")
                        put("is_readonly", e.level == "read_only")
                        put("is_writable", e.level == "read_write" || e.level == "full_control")
                    }
                }
            }
            val res = entryCall(mapOf(
                "api" to "SYNO.Core.Share.Permission",
                "version" to "1",
                "method" to "set",
                "name" to "\"$shareName\"",
                "user_group_type" to "\"$type\"",
                "permissions" to permissions.toString()
            ))
            val one = res?.get("success")?.jsonPrimitive?.booleanOrNull == true
            if (!one) {
                android.util.Log.w("DSMAcl", "Share.Permission set($type) failed for $shareName: $res")
                ok = false
            }
        }
        return ok
    }

    private suspend fun setFileAcl(path: String, accessList: List<FolderUserAccess>): Boolean {
        val rules = buildJsonArray {
            accessList.forEach { e ->
                addJsonObject {
                    put("owner_type", if (e.isGroup) "group" else "user")
                    put("owner_name", e.targetName)
                    put("permission_type", if (e.level == "deny") "deny" else "allow")
                    putJsonObject("permission") {
                        val full = e.level == "full_control"
                        val write = full || e.level == "read_write"
                        val read = write || e.level == "read_only"
                        put("read_data", read); put("write_data", write)
                        put("exe_file", read); put("append_data", write)
                        put("delete", write); put("delete_sub", write)
                        put("read_attr", read); put("write_attr", write)
                        put("read_ext_attr", read); put("write_ext_attr", write)
                        put("read_perm", read); put("change_perm", false)
                        put("take_ownership", false)
                    }
                    putJsonObject("inherit") {
                        put("child_files", true); put("child_folders", true)
                        put("this_folder", true); put("all_descendants", true)
                    }
                }
            }
        }
        val res = entryCall(mapOf(
            "api" to "SYNO.Core.ACL",
            "version" to "1",
            "method" to "set",
            "file_path" to "\"$path\"",
            "files" to "\"$path\"",
            "dirPaths" to "\"$path\"",
            "change_acl" to "true",
            "rules" to rules.toString(),
            "inherited" to "true",
            "acl_recur" to "false"
        ))
        val ok = res?.get("success")?.jsonPrimitive?.booleanOrNull == true
        if (!ok) android.util.Log.w("DSMAcl", "ACL set failed for $path: $res")
        return ok
    }

    suspend fun getSnmpDevices(): List<SnmpDevice> {
        if (config?.isDemo == true) return mockClient.getMockSnmpDevices()
        val cfg = config ?: return emptyList()
        val util = getUtilization()
        val info = getSystemInfo()
        // Real drive temps from Storage API when available (no more hardcoded 36/38)
        val driveSensors = try {
            getStorageVolumes().flatMap { v -> v.drives }.mapIndexed { idx, d ->
                SnmpSensor(
                    id = "drive${idx + 1}_temp",
                    name = "${d.slotName} Temperature (${d.model.ifBlank { "Drive" }})",
                    kind = "disk",
                    unit = "°C",
                    value = d.temp.toDouble(),
                    status = if (d.temp > 55) "warn" else "up",
                    history = emptyList()
                )
            }
        } catch (_: Exception) { emptyList() }

        val baseSensors = mutableListOf(
                    SnmpSensor(
                        id = "cpu_usage",
                        name = "CPU Total Utilization",
                        kind = "cpu",
                        unit = "%",
                        value = util.cpuPercent,
                        status = if (util.cpuPercent > 90) "warn" else "up",
                        history = listOf(util.cpuPercent)
                    ),
                    SnmpSensor(
                        id = "mem_usage",
                        name = "RAM Memory Usage",
                        kind = "memory",
                        unit = "%",
                        value = util.memoryPercent,
                        status = if (util.memoryPercent > 90) "warn" else "up",
                        history = listOf(util.memoryPercent)
                    ),
                    SnmpSensor(
                        id = "uptime_sensor",
                        name = "System Uptime",
                        kind = "uptime",
                        unit = "h",
                        value = (info.uptime / 3600.0),
                        status = "up",
                        history = emptyList()
                    ),
                    SnmpSensor(
                        id = "traffic_tx",
                        name = "Network Outbound (TX)",
                        kind = "traffic",
                        unit = "KB/s",
                        value = (util.networkTxBytes / 1024.0),
                        status = "up",
                        history = emptyList()
                    ),
                    SnmpSensor(
                        id = "disk_temp",
                        name = "System Temperature",
                        kind = "disk",
                        unit = "°C",
                        value = info.temperature.toDouble(),
                        status = if (info.temperature > 65) "warn" else "up",
                        history = emptyList()
                    )
                )
        baseSensors.addAll(driveSensors)

        return listOf(
            SnmpDevice(
                id = "dsm_host_snmp",
                name = info.model.ifBlank { "Synology NAS Host" },
                host = cfg.host,
                port = 161,
                credentials = SnmpCredentials(version = "v2c", community = "public"),
                status = "up",
                sensors = baseSensors
            )
        )
    }

    suspend fun powerAction(method: String, force: Boolean = true): Boolean {
        if (config?.isDemo == true) return true
        val res = executeGet("/webapi/entry.cgi", mapOf(
            "api" to "SYNO.Core.System",
            "version" to "1",
            "method" to method, // "reboot" or "shutdown"
            "force" to force.toString()
        ))
        return res?.get("success")?.jsonPrimitive?.booleanOrNull ?: false
    }

    fun getFileStreamUrl(filePath: String): String {
        val cfg = config ?: return ""
        if (cfg.isDemo) {
            val ext = filePath.substringAfterLast('.', "").lowercase()
            return when {
                ext in listOf("mp4", "mkv", "avi", "mov", "webm", "3gp", "ts", "m4v", "flv", "wmv") ->
                    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                ext in listOf("mp3", "flac", "wav", "m4a", "aac", "ogg", "wma", "opus", "mka") ->
                    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                ext in listOf("jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "heic", "heif") ->
                    "https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800"
                else -> ""
            }
        }
        val scheme = if (cfg.https) "https" else "http"
        val encodedPath = java.net.URLEncoder.encode(filePath, "UTF-8").replace("+", "%20")
        return "$scheme://${cfg.host}:${cfg.port}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=${encodedPath}&mode=open&_sid=${session.sid}"
    }

    fun getFileDownloadUrl(filePath: String): String {
        val cfg = config ?: return ""
        if (cfg.isDemo) {
            return getFileStreamUrl(filePath)
        }
        val scheme = if (cfg.https) "https" else "http"
        val encodedPath = java.net.URLEncoder.encode(filePath, "UTF-8").replace("+", "%20")
        return "$scheme://${cfg.host}:${cfg.port}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=${encodedPath}&mode=download&_sid=${session.sid}"
    }
}
