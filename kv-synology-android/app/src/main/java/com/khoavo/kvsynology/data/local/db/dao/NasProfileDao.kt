package com.khoavo.kvsynology.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.khoavo.kvsynology.data.local.db.entity.NasProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NasProfileDao {
    @Query("SELECT * FROM nas_profiles ORDER BY lastConnectedAt DESC")
    fun getAllProfilesFlow(): Flow<List<NasProfileEntity>>

    @Query("SELECT * FROM nas_profiles ORDER BY lastConnectedAt DESC")
    suspend fun getAllProfiles(): List<NasProfileEntity>

    @Query("SELECT * FROM nas_profiles WHERE id = :id LIMIT 1")
    suspend fun getProfileById(id: String): NasProfileEntity?

    @Query("SELECT * FROM nas_profiles WHERE isCurrent = 1 LIMIT 1")
    suspend fun getCurrentProfile(): NasProfileEntity?

    @Query("SELECT * FROM nas_profiles WHERE isCurrent = 1 LIMIT 1")
    fun getCurrentProfileFlow(): Flow<NasProfileEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(profile: NasProfileEntity)

    @Update
    suspend fun update(profile: NasProfileEntity)

    @Query("UPDATE nas_profiles SET isCurrent = 0")
    suspend fun clearCurrentFlags()

    @Query("UPDATE nas_profiles SET isCurrent = 1, lastConnectedAt = :timestamp WHERE id = :id")
    suspend fun setCurrentProfile(id: String, timestamp: Long = System.currentTimeMillis())

    @Query("DELETE FROM nas_profiles WHERE id = :id")
    suspend fun deleteProfile(id: String)

    @Query("DELETE FROM nas_profiles")
    suspend fun deleteAllProfiles()
}
