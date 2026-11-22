import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Specific errors thrown during Synology DSM authentication.
public enum DSMAuthError: LocalizedError, Sendable {
    case invalidHost(String)
    case accessDenied403
    case invalidCredentials
    case accountDisabled
    case permissionDenied
    case otpRequired
    case otpInvalid
    case invalidResponse(String)
    case connectionFailed(String)
    case unknown(Int, String?)

    public var errorDescription: String? {
        switch self {
        case .invalidHost(let host):
            return "Địa chỉ NAS không hợp lệ: \(host)"
        case .accessDenied403:
            return "Máy chủ hoặc tường lửa từ chối kết nối (Mã 403). Kiểm tra cổng và cấu hình Auto-block."
        case .invalidCredentials:
            return "Tài khoản hoặc mật khẩu không chính xác."
        case .accountDisabled:
            return "Tài khoản đã bị khóa hoặc vô hiệu hóa trên NAS."
        case .permissionDenied:
            return "Quyền truy cập bị từ chối."
        case .otpRequired:
            return "Tài khoản yêu cầu mã xác thực 2 bước (OTP). Vui lòng nhập mã OTP."
        case .otpInvalid:
            return "Mã xác thực 2 bước (OTP) không chính xác hoặc đã hết hạn."
        case .invalidResponse(let body):
            return "Phản hồi từ máy chủ không hợp lệ: \(body)"
        case .connectionFailed(let message):
            return "Không thể kết nối đến máy chủ Synology: \(message)"
        case .unknown(let code, let msg):
            return msg ?? "Lỗi xác thực DSM (mã lỗi \(code))"
        }
    }
}

/// Actor responsible for authenticating with Synology DSM via SYNO.API.Auth.
public actor DSMAuthenticator {
    public static let shared = DSMAuthenticator()

    public init() {}

    private func makeSession(ignoreCert: Bool) -> URLSession {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10.0
        config.timeoutIntervalForResource = 15.0
        let delegate = SSLTrustDelegate(ignoreCert: ignoreCert)
        return URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
    }

    /// Authenticates with the DSM API trying versions 7, 6, 3, 2, 1 with automatic OTP negotiation.
    public func login(config: ConnectionConfig) async -> Result<DsmSession, Error> {
        let authVersions = [7, 6, 3, 2, 1]
        var lastError: Error = DSMAuthError.connectionFailed("Không thể kết nối đến máy chủ Synology")

        let session = makeSession(ignoreCert: config.ignoreCert)
        let scheme = config.https ? "https" : "http"
        let base = "\(scheme)://\(config.host):\(config.port)"

        for ver in authVersions {
            guard var components = URLComponents(string: "\(base)/webapi/auth.cgi") else {
                return .failure(DSMAuthError.invalidHost(config.host))
            }

            var queryItems: [URLQueryItem] = [
                URLQueryItem(name: "api", value: "SYNO.API.Auth"),
                URLQueryItem(name: "version", value: "\(ver)"),
                URLQueryItem(name: "method", value: "login"),
                URLQueryItem(name: "account", value: config.account),
                URLQueryItem(name: "passwd", value: config.password ?? ""),
                URLQueryItem(name: "session", value: "FileStation"),
                URLQueryItem(name: "enable_device_token", value: "yes"),
                URLQueryItem(name: "enable_sync_token", value: "yes"),
                URLQueryItem(name: "isIframeLogin", value: "yes")
            ]

            if let otp = config.otp?.trimmingCharacters(in: .whitespacesAndNewlines), !otp.isEmpty {
                queryItems.append(URLQueryItem(name: "otp_code", value: otp))
            }

            components.queryItems = queryItems

            guard let url = components.url else {
                return .failure(DSMAuthError.invalidHost(config.host))
            }

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) DSMHelper/1.3", forHTTPHeaderField: "User-Agent")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            do {
                let (data, response) = try await execute(request, on: session)
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

                if statusCode == 403 {
                    return .failure(DSMAuthError.accessDenied403)
                }

                guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    let rawBody = String(data: data, encoding: .utf8) ?? ""
                    return .failure(DSMAuthError.invalidResponse(rawBody))
                }

                let isSuccess = json["success"] as? Bool ?? false
                if isSuccess, let dataObj = json["data"] as? [String: Any] {
                    let sid = dataObj["sid"] as? String ?? ""
                    let synoToken = dataObj["synotoken"] as? String
                    let did = dataObj["did"] as? String

                    let dsmSession = DsmSession(
                        sid: sid,
                        synoToken: synoToken,
                        did: did,
                        isConnected: true,
                        dsmVersion: ver >= 6 ? 7 : 6,
                        versionString: ver >= 6 ? "DSM 7.x" : "DSM 6.x",
                        model: "Synology NAS",
                        hostname: config.host,
                        account: config.account
                    )
                    return .success(dsmSession)
                } else if let errorObj = json["error"] as? [String: Any] {
                    let code = errorObj["code"] as? Int ?? 0
                    switch code {
                    case 400:
                        return .failure(DSMAuthError.invalidCredentials)
                    case 401:
                        return .failure(DSMAuthError.accountDisabled)
                    case 402:
                        return .failure(DSMAuthError.permissionDenied)
                    case 403, 406:
                        if let otp = config.otp, !otp.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            return .failure(DSMAuthError.otpInvalid)
                        } else {
                            return .failure(DSMAuthError.otpRequired)
                        }
                    case 404:
                        if let otp = config.otp, !otp.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            return .failure(DSMAuthError.otpInvalid)
                        }
                        // Version unsupported, retry with older auth version
                        continue
                    default:
                        lastError = DSMAuthError.unknown(code, nil)
                        continue
                    }
                }
            } catch {
                lastError = DSMAuthError.connectionFailed(error.localizedDescription)
            }
        }

        return .failure(lastError)
    }

    /// Logs out of DSM session releasing the session key on the server.
    public func logout(config: ConnectionConfig, session: DsmSession) async -> Bool {
        guard session.isConnected, !session.sid.isEmpty else { return true }
        let urlSession = makeSession(ignoreCert: config.ignoreCert)
        let scheme = config.https ? "https" : "http"
        let base = "\(scheme)://\(config.host):\(config.port)"

        guard var components = URLComponents(string: "\(base)/webapi/auth.cgi") else { return false }
        components.queryItems = [
            URLQueryItem(name: "api", value: "SYNO.API.Auth"),
            URLQueryItem(name: "version", value: "6"),
            URLQueryItem(name: "method", value: "logout"),
            URLQueryItem(name: "session", value: "FileStation"),
            URLQueryItem(name: "_sid", value: session.sid)
        ]

        guard let url = components.url else { return false }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        do {
            let (data, response) = try await execute(request, on: urlSession)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return false }
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            return json?["success"] as? Bool ?? false
        } catch {
            return false
        }
    }

    private func execute(_ request: URLRequest, on session: URLSession) async throws -> (Data, URLResponse) {
        #if canImport(FoundationNetworking)
        return try await withCheckedThrowingContinuation { continuation in
            let task = session.dataTask(with: request) { data, response, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else if let data = data, let response = response {
                    continuation.resume(returning: (data, response))
                } else {
                    continuation.resume(throwing: URLError(.badServerResponse))
                }
            }
            task.resume()
        }
        #else
        return try await session.data(for: request)
        #endif
    }
}
