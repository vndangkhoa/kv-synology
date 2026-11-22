import Foundation
import SwiftUI
import KVSynologyCore

@Observable
@MainActor
public final class TrafficViewModel {
    public var trafficSummary: TrafficSummary = TrafficSummary()
    public var filterQuery: String = ""
    public var selectedDirection: String = "All"
    
    public var isLiveMonitoring: Bool = true
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    
    nonisolated(unsafe) private var monitoringTask: Task<Void, Never>? = nil
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockDataIfEmpty()
    }
    
    public var filteredConnections: [NetworkConnectionItem] {
        trafficSummary.connections.filter { conn in
            let matchesDirection: Bool
            if selectedDirection == "All" {
                matchesDirection = true
            } else {
                matchesDirection = (conn.direction.localizedCaseInsensitiveCompare(selectedDirection) == .orderedSame)
            }
            
            let matchesQuery: Bool
            if filterQuery.trimmingCharacters(in: .whitespaces).isEmpty {
                matchesQuery = true
            } else {
                let q = filterQuery.lowercased()
                matchesQuery = conn.remoteAddress.lowercased().contains(q) ||
                               conn.localAddress.lowercased().contains(q) ||
                               conn.processName.lowercased().contains(q) ||
                               conn.geo.countryName.lowercased().contains(q) ||
                               String(conn.remotePort).contains(q) ||
                               String(conn.localPort).contains(q)
            }
            
            return matchesDirection && matchesQuery
        }
    }
    
    public func loadTrafficData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                self.trafficSummary = try await client.getTrafficSummary()
            } else {
                loadMockDataIfEmpty()
            }
        } catch {
            self.errorMessage = "Failed to load network traffic: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func startLiveMonitoring() {
        isLiveMonitoring = true
        monitoringTask?.cancel()
        
        monitoringTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds interval
                guard let self = self, self.isLiveMonitoring else { break }
                await self.loadTrafficData()
            }
        }
    }
    
    public func stopLiveMonitoring() {
        isLiveMonitoring = false
        monitoringTask?.cancel()
        monitoringTask = nil
    }
    
    deinit {
        monitoringTask?.cancel()
    }
    
    private func loadMockDataIfEmpty() {
        if trafficSummary.connections.isEmpty {
            trafficSummary = TrafficSummary(
                totalConnections: 12,
                outboundConnections: 4,
                inboundConnections: 5,
                localConnections: 3,
                currentOutboundSpeed: 1_450_000, // ~1.45 MB/s
                currentInboundSpeed: 3_820_000,  // ~3.82 MB/s
                topCountries: [
                    CountryTrafficSummary(countryCode: "VN", countryName: "Vietnam", flagEmoji: "🇻🇳", activeConnections: 6, outboundBytes: 25_000_000, inboundBytes: 85_000_000),
                    CountryTrafficSummary(countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", activeConnections: 3, outboundBytes: 12_000_000, inboundBytes: 40_000_000),
                    CountryTrafficSummary(countryCode: "SG", countryName: "Singapore", flagEmoji: "🇸🇬", activeConnections: 2, outboundBytes: 8_000_000, inboundBytes: 15_000_000),
                    CountryTrafficSummary(countryCode: "DE", countryName: "Germany", flagEmoji: "🇩🇪", activeConnections: 1, outboundBytes: 1_200_000, inboundBytes: 2_400_000)
                ],
                connections: [
                    NetworkConnectionItem(
                        id: "conn_1",
                        direction: "inbound",
                        localAddress: "192.168.1.10",
                        localPort: 5001,
                        remoteAddress: "14.161.45.10",
                        remotePort: 52140,
                        protocolType: "TCP",
                        state: "ESTABLISHED",
                        processName: "nginx",
                        geo: IpGeoInfo(ip: "14.161.45.10", countryCode: "VN", countryName: "Vietnam", flagEmoji: "🇻🇳", isp: "VNPT Corporation", isPrivate: false),
                        rxSpeedBytes: 2_150_000,
                        txSpeedBytes: 840_000
                    ),
                    NetworkConnectionItem(
                        id: "conn_2",
                        direction: "inbound",
                        localAddress: "192.168.1.10",
                        localPort: 445,
                        remoteAddress: "192.168.1.45",
                        remotePort: 49152,
                        protocolType: "TCP",
                        state: "ESTABLISHED",
                        processName: "smbd",
                        geo: IpGeoInfo(ip: "192.168.1.45", countryCode: "LOCAL", countryName: "Local LAN", flagEmoji: "🏠", isp: "Apple Mac Client", isPrivate: true),
                        rxSpeedBytes: 1_200_000,
                        txSpeedBytes: 320_000
                    ),
                    NetworkConnectionItem(
                        id: "conn_3",
                        direction: "outbound",
                        localAddress: "192.168.1.10",
                        localPort: 48920,
                        remoteAddress: "142.250.190.46",
                        remotePort: 443,
                        protocolType: "TCP",
                        state: "ESTABLISHED",
                        processName: "dockerd",
                        geo: IpGeoInfo(ip: "142.250.190.46", countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", isp: "Google LLC", isPrivate: false),
                        rxSpeedBytes: 420_000,
                        txSpeedBytes: 180_000
                    ),
                    NetworkConnectionItem(
                        id: "conn_4",
                        direction: "inbound",
                        localAddress: "192.168.1.10",
                        localPort: 22,
                        remoteAddress: "192.168.1.20",
                        remotePort: 60234,
                        protocolType: "TCP",
                        state: "ESTABLISHED",
                        processName: "sshd",
                        geo: IpGeoInfo(ip: "192.168.1.20", countryCode: "LOCAL", countryName: "Local LAN", flagEmoji: "🏠", isp: "Admin PC", isPrivate: true),
                        rxSpeedBytes: 15_000,
                        txSpeedBytes: 45_000
                    ),
                    NetworkConnectionItem(
                        id: "conn_5",
                        direction: "outbound",
                        localAddress: "192.168.1.10",
                        localPort: 39412,
                        remoteAddress: "1.1.1.1",
                        remotePort: 53,
                        protocolType: "UDP",
                        state: "ACTIVE",
                        processName: "AdGuardHome",
                        geo: IpGeoInfo(ip: "1.1.1.1", countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", isp: "Cloudflare DNS", isPrivate: false),
                        rxSpeedBytes: 35_000,
                        txSpeedBytes: 65_000
                    )
                ],
                interfaces: [
                    NetworkInterfaceInfo(
                        id: "eth0",
                        name: "LAN 1 (eth0)",
                        ip: "192.168.1.10",
                        mask: "255.255.255.0",
                        mac: "00:11:32:AF:89:12",
                        status: "up",
                        speedMbps: 1000,
                        rxBytes: 45_291_829_102,
                        txBytes: 82_941_201_938
                    ),
                    NetworkInterfaceInfo(
                        id: "eth1",
                        name: "LAN 2 (eth1)",
                        ip: "10.0.0.10",
                        mask: "255.255.255.0",
                        mac: "00:11:32:AF:89:13",
                        status: "up",
                        speedMbps: 10000, // 10 Gbps SFP+
                        rxBytes: 12_829_192_801,
                        txBytes: 15_901_289_110
                    ),
                    NetworkInterfaceInfo(
                        id: "docker0",
                        name: "Docker Bridge (docker0)",
                        ip: "172.17.0.1",
                        mask: "255.255.0.0",
                        mac: "02:42:AC:11:00:01",
                        status: "up",
                        speedMbps: 10000,
                        rxBytes: 94_120_192_821,
                        txBytes: 91_401_292_100
                    )
                ]
            )
        }
    }
}
