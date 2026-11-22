import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
#if canImport(Security)
import Security
#endif

/// URLSession delegate handling SSL certificate trust, allowing self-signed Synology certificates.
public final class SSLTrustDelegate: NSObject, URLSessionDelegate, @unchecked Sendable {
    public let ignoreCert: Bool
    public let allowedHosts: Set<String>

    public init(ignoreCert: Bool = true, allowedHosts: Set<String> = []) {
        self.ignoreCert = ignoreCert
        self.allowedHosts = allowedHosts
        super.init()
    }

    public func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        #if canImport(Security)
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust {
            let host = challenge.protectionSpace.host
            if ignoreCert || allowedHosts.contains(host) {
                if let serverTrust = challenge.protectionSpace.serverTrust {
                    completionHandler(.useCredential, URLCredential(trust: serverTrust))
                    return
                }
            }
        }
        #endif
        completionHandler(.performDefaultHandling, nil)
    }
}
