package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class DockerPortBinding(
    val hostPort: String,
    val containerPort: String,
    val protocol: String = "tcp"
)

@Serializable
data class DockerVolumeMount(
    val hostPath: String,
    val containerPath: String,
    val mode: String = "rw"
)

@Serializable
data class DockerEnvVar(
    val key: String,
    val value: String
)

@Serializable
data class DockerContainer(
    val id: String,
    val name: String,
    val image: String,
    val status: String,
    val created: String = "",
    val ports: List<String> = emptyList(),
    val cpuUsage: Double = 0.0,
    val memoryUsage: String = "",
    val uptime: String? = null,
    val restartPolicy: String? = null
)

@Serializable
data class DockerContainerDetails(
    val id: String,
    val name: String,
    val image: String,
    val status: String,
    val created: String = "",
    val ports: List<String> = emptyList(),
    val cpuUsage: Double = 0.0,
    val memoryUsage: String = "",
    val uptime: String? = null,
    val restartPolicy: String? = null,
    val fullId: String? = null,
    val autoRestart: Boolean? = null,
    val privileged: Boolean? = null,
    val envVars: List<DockerEnvVar> = emptyList(),
    val volumeMounts: List<DockerVolumeMount> = emptyList(),
    val portBindings: List<DockerPortBinding> = emptyList()
)

@Serializable
data class DockerProjectService(
    val name: String,
    val image: String,
    val status: String = "running",
    val ports: List<String> = emptyList()
)

@Serializable
data class DockerProject(
    val id: String,
    val name: String,
    val status: String = "running",
    val path: String = "",
    val yamlContent: String = "",
    val services: List<DockerProjectService> = emptyList(),
    val created: String = "",
    val isPackage: Boolean = false
)

@Serializable
data class DockerImage(
    val id: String,
    val repository: String,
    val tag: String = "latest",
    val sizeMB: Long = 0L,
    val sizeFormatted: String = "",
    val created: String = "",
    val containersCount: Int = 0,
    val isUsed: Boolean = false
)
