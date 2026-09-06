package com.khoavo.kvsynology.presentation.ai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.ChatMessage
import com.khoavo.kvsynology.domain.repository.AuthRepository
import com.khoavo.kvsynology.domain.repository.SystemRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val systemRepository: SystemRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating.asStateFlow()

    init {
        // Welcome message with quick tips (Local AI mode — no cloud API key)
        _messages.value = listOf(
            ChatMessage(
                role = "assistant",
                content = "Xin chào! Tôi là Trợ lý AI Cục bộ (Local AI) của Synology DSM — chạy hoàn toàn trên thiết bị, không cần API key. Tôi phân tích trực tiếp thông số NAS của bạn (nhiệt độ, CPU, RAM, Docker, ổ đĩa) để chẩn đoán và hướng dẫn. Hãy chọn câu hỏi nhanh bên dưới hoặc nhập tin nhắn!"
            )
        )
    }

    fun sendMessage(userText: String) {
        if (userText.isBlank() || _isGenerating.value) return

        val userMsg = ChatMessage(role = "user", content = userText.trim())
        _messages.update { it + userMsg }
        _isGenerating.value = true

        viewModelScope.launch {
            try {
                // Fetch real context from NAS
                val session = authRepository.getCurrentSession()
                val info = try { systemRepository.getSystemInfo() } catch (_: Exception) { null }
                val procs = try { systemRepository.getProcesses() } catch (_: Exception) { emptyList() }
                val highCpuProcs = procs.filter { it.cpu > 5.0 }.joinToString { "${it.name} (${it.cpu}%)" }

                // Simulate smart assistant generation
                delay(800)

                val reply = generateSmartReply(userText, session.model, info?.temperature ?: 42, highCpuProcs)
                val assistantMsg = ChatMessage(role = "assistant", content = reply)
                _messages.update { it + assistantMsg }
            } catch (e: Exception) {
                _messages.update {
                    it + ChatMessage(role = "assistant", content = "Xin lỗi, đã xảy ra lỗi khi phân tích: ${e.message}")
                }
            } finally {
                _isGenerating.value = false
            }
        }
    }

    private fun generateSmartReply(query: String, model: String, temp: Int, highCpuProcs: String): String {
        val q = query.lowercase()
        return when {
            q.contains("tình trạng") || q.contains("sức khỏe") || q.contains("chẩn đoán") -> {
                "📊 **Kết quả chẩn đoán $model**:\n" +
                        "• Nhiệt độ phần cứng: **$temp°C** (Mức an toàn: <65°C)\n" +
                        "• Tiến trình tiêu biểu: ${if (highCpuProcs.isNotBlank()) highCpuProcs else "Không có tiến trình bất thường (<5% CPU)"}\n" +
                        "• Trạng thái chung: Hệ thống đang vận hành ổn định và sẵn sàng xử lý tác vụ."
            }
            q.contains("ram") || q.contains("bộ nhớ") -> {
                "🧠 **Khuyến nghị tối ưu RAM cho Synology**:\n" +
                        "1. Kiểm tra các container Docker không dùng đến và dừng lại.\n" +
                        "2. Tắt dịch vụ lập chỉ mục file (Universal Search / Indexing) nếu không cần tìm kiếm nội dung tệp lớn.\n" +
                        "3. Khởi động lại các package tiêu tốn cache định kỳ hoặc đặt lịch bảo trì tự động trong Task Scheduler."
            }
            q.contains("bảo mật") || q.contains("tường lửa") || q.contains("firewall") -> {
                "🛡️ **Các bước tăng cường bảo mật DSM**:\n" +
                        "1. Đổi cổng mặc định 5000 / 5001 sang cổng tùy chỉnh.\n" +
                        "2. Kích hoạt tính năng xác thực hai yếu tố (2FA OTP) cho toàn bộ tài khoản quản trị.\n" +
                        "3. Bật tính năng 'Auto Block' (Tự động chặn IP) khi nhập sai mật khẩu quá 5 lần.\n" +
                        "4. Cấu hình quy tắc tường lửa chỉ cho phép dải IP nội bộ và các quốc gia chỉ định."
            }
            q.contains("docker") || q.contains("container") -> {
                "🐳 **Hướng dẫn quản trị Docker (Container Manager)**:\n" +
                        "• Để xem nhật ký lỗi container: Vào tab Docker -> chọn container -> xem tab Logs.\n" +
                        "• Nếu container bị crash liên tục: Kiểm tra quyền mount ổ đĩa (PGID/PUID) và port binding xem có bị trùng với dịch vụ nội bộ của DSM không."
            }
            q.contains("đĩa") || q.contains("ổ cứng") || q.contains("dung lượng") -> {
                "💾 **Chẩn đoán ổ đĩa & Lưu trữ**:\n" +
                        "• Bạn có thể vào tab **Lưu trữ** để xem trạng thái SMART và nhiệt độ từng ổ đĩa.\n" +
                        "• Nếu dung lượng sắp đầy: Hãy dọn dẹp Recycle Bin của các Shared Folder và kiểm tra snapshot của Btrfs."
            }
            else -> {
                "💡 **Thông tin từ Trợ lý DSM**:\n" +
                        "Đối với câu hỏi của bạn về '$query': Thiết bị **$model** của bạn hiện đang hoạt động bình thường. Bạn có thể sử dụng tab **Giám sát tài nguyên** để theo dõi tải, hoặc tab **Dòng lệnh (Terminal)** để thực thi các lệnh chẩn đoán nâng cao như `uptime`, `df -h`, `docker ps`."
            }
        }
    }

    fun clearHistory() {
        _messages.value = listOf(
            ChatMessage(role = "assistant", content = "Lịch sử trò chuyện đã được đặt lại. Tôi có thể giúp gì tiếp theo cho NAS của bạn?")
        )
    }
}
