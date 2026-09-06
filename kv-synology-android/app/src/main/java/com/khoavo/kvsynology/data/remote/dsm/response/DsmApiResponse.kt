package com.khoavo.kvsynology.data.remote.dsm.response

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class DsmError(
    val code: Int = 0,
    val errors: JsonObject? = null
)

@Serializable
data class DsmApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: DsmError? = null
)
