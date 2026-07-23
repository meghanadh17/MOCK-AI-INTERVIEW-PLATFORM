package com.aiinterview.data.local.dao

import androidx.room.*
import com.aiinterview.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users LIMIT 1") fun observeUser(): Flow<UserEntity?>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsert(user: UserEntity)
    @Query("DELETE FROM users") suspend fun clear()
}
