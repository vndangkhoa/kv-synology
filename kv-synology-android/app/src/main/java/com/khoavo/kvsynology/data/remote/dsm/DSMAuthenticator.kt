package com.khoavo.kvsynology.data.remote.dsm

import com.khoavo.kvsynology.data.remote.ssl.CertificatePolicy
import com.khoavo.kvsynology.domain.model.ConnectionConfig
import com.khoavo.kvsynology.domain.model.DsmSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DSMAuthenticator @Inject constructor() {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private fun getClient(ignoreCert: Boolean): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)

        if (ignoreCert) {
            builder.sslSocketFactory(CertificatePolicy.createPermissiveSslSocketFactory(), CertificatePolicy.permissiveTrustManager)
                .hostnameVerifier(CertificatePolicy.permissiveHostnameVerifier)
        }
        return builder.build()
    }

    suspend fun login(config: ConnectionConfig): Result<DsmSession> = withContext(Dispatchers.IO) {
        val authVersions = listOf(7, 6, 3, 2, 1)
        var lastError = "Không thể xác thực với Synology DSM"

        val client = getClient(config.ignoreCert)
        val scheme = if (config.https) "https" else "http"
        val base = "$scheme://${config.host}:${config.port}"

        for (ver in authVersions) {
            try {
                val urlBuilder = "$base/webapi/auth.cgi".toHttpUrlOrNull()?.newBuilder()
                    ?: return@withContext Result.failure(Exception("Địa chỉ NAS không hợp lệ: ${config.host}"))

                urlBuilder.addQueryParameter("api", "SYNO.API.Auth")
                urlBuilder.addQueryParameter("version", ver.toString())
                urlBuilder.addQueryParameter("method", "login")
                urlBuilder.addQueryParameter("account", config.account)
                urlBuilder.addQueryParameter("passwd", config.password ?: "")
                urlBuilder.addQueryParameter("session", "FileStation")
                urlBuilder.addQueryParameter("enable_device_token", "yes")
                urlBuilder.addQueryParameter("enable_sync_token", "yes")
                urlBuilder.addQueryParameter("isIframeLogin", "yes")

                if (!config.otp.isNullOrBlank()) {
                    urlBuilder.addQueryParameter("otp_code", config.otp.trim())
                }

                val request = Request.Builder()
                    .url(urlBuilder.build())
                    .get()
                    .header("User-Agent", "Mozilla/5.0 (Android) DSMHelper/1.3")
                    .header("Accept", "application/json")
                    .build()

                val (statusCode, bodyString) = client.newCall(request).execute().use { response ->
                    Pair(response.code, response.body?.string() ?: "")
                }
                android.util.Log.d("DSMAuth", "URL: ${request.url} => HTTP $statusCode: $bodyString")

                if (statusCode == 403) {
                    return@withContext Result.failure(Exception("Máy chủ hoặc tường lửa từ chối kết nối (Mã 403). Kiểm tra cổng và Auto-block."))
                }

                val jsonElem = try {
                    json.parseToJsonElement(bodyString).jsonObject
                } catch (_: Exception) {
                    return@withContext Result.failure(Exception("Phản hồi từ máy chủ không hợp lệ: $bodyString"))
                }

                val isSuccess = jsonElem["success"]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: false
                if (isSuccess && jsonElem["data"] != null) {
                    val dataObj = jsonElem["data"]!!.jsonObject
                    val sid = dataObj["sid"]?.jsonPrimitive?.content ?: ""
                    val synoToken = dataObj["synotoken"]?.jsonPrimitive?.content
                    val did = dataObj["did"]?.jsonPrimitive?.content

                    val session = DsmSession(
                        sid = sid,
                        synoToken = synoToken,
                        did = did,
                        isConnected = true,
                        dsmVersion = if (ver >= 6) 7 else 6,
                        versionString = if (ver >= 6) "DSM 7.x" else "DSM 6.x",
                        model = "Synology NAS",
                        hostname = config.host,
                        account = config.account
                    )
                    return@withContext Result.success(session)
                } else if (jsonElem["error"] != null) {
                    val errorObj = jsonElem["error"]!!.jsonObject
                    val code = errorObj["code"]?.jsonPrimitive?.intOrNull ?: 0
                    when (code) {
                        400 -> return@withContext Result.failure(Exception("Tài khoản hoặc mật khẩu không chính xác."))
                        401 -> return@withContext Result.failure(Exception("Tài khoản đã bị khóa hoặc vô hiệu hóa trên NAS."))
                        402 -> return@withContext Result.failure(Exception("Quyền truy cập bị từ chối."))
                        403, 406 -> {
                            return@withContext if (!config.otp.isNullOrBlank()) {
                                Result.failure(Exception("Mã xác thực 2 bước (OTP) không chính xác hoặc đã hết hạn."))
                            } else {
                                Result.failure(Exception("Tài khoản yêu cầu mã xác thực 2 bước (OTP). Vui lòng nhập mã OTP."))
                            }
                        }
                        404 -> {
                            if (!config.otp.isNullOrBlank()) {
                                return@withContext Result.failure(Exception("Mã xác thực 2 bước (OTP) không đúng hoặc đã hết hạn."))
                            }
                            // Version unsupported, fallback
                            continue
                        }
                        else -> {
                            lastError = "Lỗi xác thực DSM (mã lỗi $code)"
                            continue
                        }
                    }
                }
            } catch (e: Exception) {
                lastError = e.message ?: "Không thể kết nối đến máy chủ Synology"
            }
        }

        Result.failure(Exception(lastError))
    }
}
