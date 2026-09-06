package com.khoavo.kvsynology.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.khoavo.kvsynology.data.local.db.dao.NasProfileDao
import com.khoavo.kvsynology.data.local.db.entity.NasProfileEntity

@Database(
    entities = [NasProfileEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun nasProfileDao(): NasProfileDao
}
