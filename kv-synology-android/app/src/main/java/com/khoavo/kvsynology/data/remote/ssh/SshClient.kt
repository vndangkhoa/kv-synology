package com.khoavo.kvsynology.data.remote.ssh

import com.jcraft.jsch.ChannelExec
import com.jcraft.jsch.JSch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

data class SshResult(
    val stdout: String,
    val stderr: String,
    val exitCode: Int
)

class SshException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Minimal stateless SSH exec client (JSch).
 * Each [execute] opens a fresh connection + exec channel, so callers must
 * emulate persistent shell state themselves (e.g. prefix `cd <dir> &&`).
 * Must be called from a background thread (suspends on IO dispatcher).
 */
@Singleton
class SshClient @Inject constructor() {

    suspend fun execute(
        host: String,
        port: Int,
        username: String,
        password: String,
        command: String,
        connectTimeoutMs: Int = 10_000,
        commandTimeoutMs: Int = 20_000
    ): SshResult = withContext(Dispatchers.IO) {
        val jsch = JSch()
        val session = try {
            jsch.getSession(username, host, port).apply {
                // JSch 2.x: String overload deprecated; pass bytes and clear ASAP
                setPassword(password.toByteArray(Charsets.UTF_8))
                // NAS uses self-managed host keys; skip verification like the
                // DSM web client does with ignoreCert.
                setConfig("StrictHostKeyChecking", "no")
                // Prefer modern kex/hostkey algos; let JSch negotiate.
                connect(connectTimeoutMs)
            }
        } catch (e: Exception) {
            throw SshException(friendlyConnectError(host, port, e), e)
        }

        try {
            val channel = session.openChannel("exec") as ChannelExec
            val out = ByteArrayOutputStream()
            val err = ByteArrayOutputStream()
            channel.outputStream = null
            channel.setOutputStream(out)
            channel.setErrStream(err)
            channel.setCommand(command)
            channel.inputStream = null
            try {
                channel.connect(connectTimeoutMs)
            } catch (e: Exception) {
                throw SshException("Không mở được kênh SSH exec: ${e.message}", e)
            }

            val deadline = System.currentTimeMillis() + commandTimeoutMs
            while (!channel.isClosed) {
                if (System.currentTimeMillis() > deadline) {
                    channel.disconnect()
                    throw SshException("Lệnh SSH timed out sau ${commandTimeoutMs / 1000}s")
                }
                Thread.sleep(50)
            }
            SshResult(
                stdout = out.toString(Charsets.UTF_8.name()).trimEnd(),
                stderr = err.toString(Charsets.UTF_8.name()).trimEnd(),
                exitCode = channel.exitStatus
            )
        } finally {
            if (session.isConnected) session.disconnect()
        }
    }

    /** Lightweight probe used to validate host/port/credentials. */
    suspend fun probe(
        host: String,
        port: Int,
        username: String,
        password: String
    ): SshResult = execute(host, port, username, password, "echo __kv_ssh_ok__ && pwd")

    private fun friendlyConnectError(host: String, port: Int, e: Exception): String {
        val msg = e.message.orEmpty()
        return when {
            msg.contains("Auth fail", ignoreCase = true) || msg.contains("authentication", ignoreCase = true) ->
                "SSH xác thực thất bại cho '$host:$port' — sai mật khẩu hoặc user không có quyền SSH."
            msg.contains("refused", ignoreCase = true) ->
                "SSH bị từ chối tại $host:$port — hãy bật 'SSH Terminal' trong Dịch vụ & kiểm tra cổng."
            msg.contains("timed out", ignoreCase = true) || msg.contains("timeout", ignoreCase = true) ->
                "Không tới được $host:$port (timeout) — kiểm tra mạng/VPN và tường lửa."
            msg.contains("UnknownHost", ignoreCase = true) || msg.contains("unresolved", ignoreCase = true) ->
                "Không phân giải được host '$host'."
            else -> "Không kết nối SSH tới $host:$port: $msg"
        }
    }
}
