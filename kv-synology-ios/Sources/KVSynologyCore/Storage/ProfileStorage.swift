import Foundation

/// Multi-NAS profile manager handling profile saving, listing, deletion, and active connection tracking.
public final class ProfileStorage: @unchecked Sendable {
    public static let shared = ProfileStorage()

    private let lock = NSLock()
    private let keychain = KeychainManager.shared
    private let profilesKey = "kvsynology_saved_profiles"
    private let activeProfileIdKey = "kvsynology_active_profile_id"

    public init() {}

    /// Returns all saved NAS connection profiles.
    public func getAllProfiles() -> [ConnectionConfig] {
        lock.lock()
        defer { lock.unlock() }

        guard let savedList = keychain.getObject([ConnectionConfig].self, key: profilesKey) else {
            return []
        }

        // Restore passwords stored separately in Keychain if needed
        return savedList.map { profile in
            var p = profile
            if p.password == nil || p.password?.isEmpty == true {
                p.password = keychain.get(key: "profile_pwd_\(p.id)")
            }
            return p
        }
    }

    /// Retrieves a specific profile by unique ID.
    public func getProfile(id: String) -> ConnectionConfig? {
        getAllProfiles().first(where: { $0.id == id })
    }

    /// Saves or updates a NAS profile.
    public func saveProfile(_ config: ConnectionConfig, rememberPassword: Bool = true) {
        lock.lock()
        defer { lock.unlock() }

        var list = keychain.getObject([ConnectionConfig].self, key: profilesKey) ?? []

        var profileToSave = config
        if rememberPassword, let pwd = config.password, !pwd.isEmpty {
            try? keychain.save(key: "profile_pwd_\(config.id)", value: pwd)
        } else if !rememberPassword {
            keychain.delete(key: "profile_pwd_\(config.id)")
            profileToSave.password = nil
        }

        if let idx = list.firstIndex(where: { $0.id == config.id }) {
            list[idx] = profileToSave
        } else {
            list.append(profileToSave)
        }

        try? keychain.saveObject(list, key: profilesKey)
    }

    /// Deletes a connection profile by ID.
    public func deleteProfile(id: String) {
        lock.lock()
        defer { lock.unlock() }

        var list = keychain.getObject([ConnectionConfig].self, key: profilesKey) ?? []
        list.removeAll(where: { $0.id == id })
        try? keychain.saveObject(list, key: profilesKey)

        keychain.delete(key: "profile_pwd_\(id)")

        if getActiveProfileId() == id {
            setActiveProfileId(list.first?.id)
        }
    }

    /// Clears all saved profiles and associated secrets.
    public func clearAllProfiles() {
        lock.lock()
        defer { lock.unlock() }

        let list = keychain.getObject([ConnectionConfig].self, key: profilesKey) ?? []
        for p in list {
            keychain.delete(key: "profile_pwd_\(p.id)")
        }
        keychain.delete(key: profilesKey)
        keychain.delete(key: activeProfileIdKey)
    }

    /// Returns the ID of the currently active profile.
    public func getActiveProfileId() -> String? {
        keychain.get(key: activeProfileIdKey)
    }

    /// Sets the currently active profile ID.
    public func setActiveProfileId(_ id: String?) {
        if let id = id {
            try? keychain.save(key: activeProfileIdKey, value: id)
        } else {
            keychain.delete(key: activeProfileIdKey)
        }
    }

    /// Retrieves the currently active connection profile.
    public func getActiveProfile() -> ConnectionConfig? {
        guard let id = getActiveProfileId() else {
            return getAllProfiles().first
        }
        return getProfile(id: id)
    }
}
