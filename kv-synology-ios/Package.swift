// swift-tools-version: 5.10
import PackageDescription

var packageTargets: [Target] = [
    .target(
        name: "KVSynologyCore",
        dependencies: [],
        path: "Sources/KVSynologyCore"
    ),
    .testTarget(
        name: "KVSynologyCoreTests",
        dependencies: ["KVSynologyCore"],
        path: "Tests/KVSynologyCoreTests"
    )
]

var packageProducts: [Product] = [
    .library(
        name: "KVSynologyCore",
        targets: ["KVSynologyCore"]
    )
]

#if !os(Linux)
packageTargets.append(
    .target(
        name: "KVSynologyApp",
        dependencies: ["KVSynologyCore"],
        path: "Sources/KVSynologyApp"
    )
)
packageProducts.append(
    .library(
        name: "KVSynologyApp",
        targets: ["KVSynologyApp"]
    )
)
#endif

let package = Package(
    name: "kv-synology-ios",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: packageProducts,
    dependencies: [],
    targets: packageTargets
)
