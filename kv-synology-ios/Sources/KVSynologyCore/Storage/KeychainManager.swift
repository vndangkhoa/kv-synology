import Foundation
#if canImport(Security)
import Security
#endif

/// Cross-platform secure credential storage abstraction.
/// On Darwin platforms (iOS / macOS), uses the hardware-backed Security Keychain.
/// On Linux and non-Darwin environments, falls back to a memory-backed thread-safe store.
public final class KeychainManager: @unchecked Sendable {
    public static let shared = KeychainManager()

    private let lock = NSLock()
    private var fallbackStore: [String: [String: String]] = [:]

    public init() {}

    /// Saves a secret string into Keychain / fallback store.
    public func save(key: String, value: String, service: String = "com.khoavo.kvsynology") throws {
        #if canImport(Security) && !os(Linux)
        guard let data = value.data(using: .utf8) else { return }

        // Remove existing item if present
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        if status != errSecSuccess {
            // If keychain addition fails (e.g. headless sandbox), fallback to memory store
            lock.lock()
            defer { lock.unlock() }
            if fallbackStore[service] == nil { fallbackStore[service] = [:] }
            fallbackStore[service]?[key] = value
        }
        #else
        lock.lock()
        defer { lock.unlock() }
        if fallbackStore[service] == nil { fallbackStore[service] = [:] }
        fallbackStore[service]?[key] = value
        #endif
    }

    /// Retrieves a secret string from Keychain / fallback store.
    public func get(key: String, service: String = "com.khoavo.kvsynology") -> String? {
        #if canImport(Security) && !os(Linux)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data {
            return String(data: data, encoding: .utf8)
        }

        // Fallback check
        lock.lock()
        defer { lock.unlock() }
        return fallbackStore[service]?[key]
        #else
        lock.lock()
        defer { lock.unlock() }
        return fallbackStore[service]?[key]
        #endif
    }

    /// Deletes a key from Keychain / fallback store.
    public func delete(key: String, service: String = "com.khoavo.kvsynology") {
        #if canImport(Security) && !os(Linux)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
        #endif

        lock.lock()
        defer { lock.unlock() }
        fallbackStore[service]?.removeValue(forKey: key)
    }

    /// Clears all keys for the specified service.
    public func clearAll(service: String = "com.khoavo.kvsynology") {
        #if canImport(Security) && !os(Linux)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]
        SecItemDelete(query as CFDictionary)
        #endif

        lock.lock()
        defer { lock.unlock() }
        fallbackStore.removeValue(forKey: service)
    }

    /// Saves a Codable object securely.
    public func saveObject<T: Codable>(_ object: T, key: String, service: String = "com.khoavo.kvsynology") throws {
        let data = try JSONEncoder().encode(object)
        if let str = String(data: data, encoding: .utf8) {
            try save(key: key, value: str, service: service)
        }
    }

    /// Retrieves and decodes a Codable object.
    public func getObject<T: Codable>(_ type: T.Type, key: String, service: String = "com.khoavo.kvsynology") -> T? {
        guard let str = get(key: key, service: service),
              let data = str.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(type, from: data)
    }
}
