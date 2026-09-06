package com.khoavo.kvsynology.data.remote.quickconnect

import com.khoavo.kvsynology.data.remote.ssl.CertificatePolicy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class ResolvedTarget(
    val host: String,
    val port: Int,
    val isHttps: Boolean,
    val expires: Long = System.currentTimeMillis() + 10 * 60 * 1000
)

@Singleton
class QuickConnectResolver @Inject constructor() {

    private val cache = ConcurrentHashMap<String, ResolvedTarget>()

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(6, TimeUnit.SECONDS)
            .sslSocketFactory(CertificatePolicy.createPermissiveSslSocketFactory(), CertificatePolicy.permissiveTrustManager)
            .hostnameVerifier(CertificatePolicy.permissiveHostnameVerifier)
            .build()
    }

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    fun isQuickConnectId(host: String): Boolean {
        val clean = host.trim().lowercase()
        return clean.endsWith(".quickconnect.to") ||
                (!clean.contains(".") && !clean.contains(":") && clean != "localhost" && clean.isNotBlank())
    }

    suspend fun resolve(serverId: String, userPort: Int? = null, userHttps: Boolean? = null): ResolvedTarget? = withContext(Dispatchers.IO) {
        val cleanId = serverId.replace(Regex("\\.quickconnect\\.to$", RegexOption.IGNORE_CASE), "").trim().lowercase()
        val cacheKey = "${cleanId}_${userPort ?: "auto"}_${userHttps ?: "auto"}"

        val cached = cache[cacheKey] ?: cache[cleanId]
        if (cached != null && cached.expires > System.currentTimeMillis()) {
            return@withContext cached
        }

        val controlHosts = listOf(
            "global.quickconnect.to",
            "usc.quickconnect.to",
            "tw.quickconnect.to",
            "us.quickconnect.to",
            "eu.quickconnect.to"
        )

        for (controlHost in controlHosts) {
            try {
                var info = fetchServerInfo(cleanId, controlHost, "dsm_portal_https")
                if (info == null) {
                    info = fetchServerInfo(cleanId, controlHost, "dsm_portal")
                }

                if (info != null) {
                    val candidates = extractCandidates(cleanId, info, userPort, userHttps)
                    val verified = probeCandidates(candidates)

                    val target = verified ?: candidates.firstOrNull { it.host.contains("synology.me") || it.host.contains("quickconnect") }
                    ?: candidates.firstOrNull()

                    if (target != null) {
                        val resolved = ResolvedTarget(target.host, target.port, target.isHttps)
                        cache[cacheKey] = resolved
                        cache[cleanId] = resolved
                        return@withContext resolved
                    }
                }
            } catch (_: Exception) {
                // Try next control host
            }
        }
        null
    }

    private fun fetchServerInfo(cleanId: String, controlHost: String, portalId: String): JsonObject? {
        // First try request_tunnel
        val tunnelPayload = """{"version":1,"command":"request_tunnel","stop_mirror":true,"serverID":"$cleanId","id":"$portalId"}"""
        val tunnelRes = executeServRequest(controlHost, tunnelPayload)
        if (tunnelRes != null && tunnelRes["errno"]?.jsonPrimitive?.intOrNull == 0 && tunnelRes["server"] != null) {
            val controlHostRedirect = tunnelRes["env"]?.jsonObject?.get("control_host")?.jsonPrimitive?.content
            if (!controlHostRedirect.isNullOrBlank() && controlHostRedirect != controlHost) {
                val regional = fetchServerInfo(cleanId, controlHostRedirect, portalId)
                if (regional != null) return regional
            }
            return tunnelRes
        }

        // Fallback: get_server_info
        val infoPayload = """{"version":1,"command":"get_server_info","stop_mirror":true,"serverID":"$cleanId","id":"$portalId"}"""
        val infoRes = executeServRequest(controlHost, infoPayload)
        if (infoRes != null && infoRes["errno"]?.jsonPrimitive?.intOrNull == 0 && infoRes["server"] != null) {
            val controlHostRedirect = infoRes["env"]?.jsonObject?.get("control_host")?.jsonPrimitive?.content
            if (!controlHostRedirect.isNullOrBlank() && controlHostRedirect != controlHost) {
                val regional = fetchServerInfo(cleanId, controlHostRedirect, portalId)
                if (regional != null) return regional
            }
            return infoRes
        }
        return null
    }

    private fun executeServRequest(controlHost: String, jsonBody: String): JsonObject? {
        return try {
            val request = Request.Builder()
                .url("https://$controlHost/Serv.php")
                .post(jsonBody.toRequestBody("application/json".toMediaType()))
                .header("User-Agent", "Synology/DSM")
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: return null
                    json.parseToJsonElement(body).jsonObject
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun extractCandidates(
        cleanId: String,
        parsed: JsonObject,
        userPort: Int?,
        userHttps: Boolean?
    ): List<Candidate> {
        val serverObj = parsed["server"]?.jsonObject
        val serviceObj = parsed["service"]?.jsonObject
        val smartDnsObj = parsed["smartdns"]?.jsonObject

        val relayDn = serviceObj?.get("relay_dn")?.jsonPrimitive?.content
        val relayPort = serviceObj?.get("relay_port")?.jsonPrimitive?.intOrNull
        val relayIp = serviceObj?.get("relay_ip")?.jsonPrimitive?.content

        val ddnsRaw = serverObj?.get("ddns")?.jsonPrimitive?.content
        val ddns = if (ddnsRaw != null && ddnsRaw != "NULL") ddnsRaw else null
        val wanIp = serverObj?.get("external")?.jsonObject?.get("ip")?.jsonPrimitive?.content
        val smartDns = smartDnsObj?.get("host")?.jsonPrimitive?.content

        val dsmHttpsPort = serverObj?.get("https_port")?.jsonPrimitive?.intOrNull
            ?: serviceObj?.get("port")?.jsonPrimitive?.intOrNull ?: 5001
        val dsmHttpPort = serverObj?.get("port")?.jsonPrimitive?.intOrNull ?: 5000

        val candidates = mutableListOf<Candidate>()
        val seen = mutableSetOf<String>()

        fun addCand(h: String?, p: Int?, isHttps: Boolean) {
            if (h.isNullOrBlank() || p == null || p !in 1..65535) return
            val key = "$h:$p:$isHttps"
            if (seen.add(key)) {
                candidates.add(Candidate(h, p, isHttps))
            }
        }

        // 1. WAN Relay Tunnels
        if (!relayDn.isNullOrBlank() && relayPort != null) addCand(relayDn, relayPort, true)
        if (!relayIp.isNullOrBlank() && relayPort != null) addCand(relayIp, relayPort, true)

        // 2. Direct DDNS & WAN ports
        val standardPorts = listOfNotNull(userPort, dsmHttpsPort, 5001, dsmHttpPort, 5000).distinct()
        for (p in standardPorts) {
            val isH = p == 5001 || p == dsmHttpsPort || (userHttps ?: true)
            if (ddns != null) addCand(ddns, p, isH)
            if (smartDns != null) addCand(smartDns, p, isH)
            addCand("$cleanId.direct.quickconnect.to", p, isH)
            if (wanIp != null) addCand(wanIp, p, isH)
        }

        // 3. Web Ports (443, 80)
        for (p in listOf(443, 80)) {
            val isH = p == 443
            if (ddns != null) addCand(ddns, p, isH)
            if (wanIp != null) addCand(wanIp, p, isH)
        }

        // 4. LAN candidates
        val interfaces = serverObj?.get("interface")?.jsonArray
        if (interfaces != null) {
            for (elem in interfaces) {
                val ip = elem.jsonObject["ip"]?.jsonPrimitive?.content
                if (!ip.isNullOrBlank()) {
                    for (p in standardPorts) {
                        val isH = p == 5001 || p == dsmHttpsPort || (userHttps ?: true)
                        addCand(ip, p, isH)
                    }
                }
            }
        }

        return candidates
    }

    private suspend fun probeCandidates(candidates: List<Candidate>): Candidate? = coroutineScope {
        val probes = candidates.take(8).map { cand ->
            async(Dispatchers.IO) {
                if (verifyDsmApi(cand)) cand else null
            }
        }
        val results = probes.awaitAll()
        results.firstOrNull { it != null }
    }

    private fun verifyDsmApi(c: Candidate): Boolean {
        return try {
            val scheme = if (c.isHttps) "https" else "http"
            val url = "$scheme://${c.host}:${c.port}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth"
            val request = Request.Builder()
                .url(url)
                .get()
                .header("User-Agent", "DSMHelper/1.0")
                .header("Accept", "*/*")
                .build()

            httpClient.newCall(request).execute().use { response ->
                val body = response.body?.string() ?: ""
                val ctype = response.header("Content-Type") ?: ""
                val isHtml = body.contains("<html", ignoreCase = true) || body.contains("<!DOCTYPE", ignoreCase = true) || ctype.contains("text/html")
                !isHtml && (body.contains("\"success\"") || body.contains("SYNO.API.Auth") || ctype.contains("json"))
            }
        } catch (_: Exception) {
            false
        }
    }

    data class Candidate(val host: String, val port: Int, val isHttps: Boolean)
}
