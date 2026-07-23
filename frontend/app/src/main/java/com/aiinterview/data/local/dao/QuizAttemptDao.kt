package com.aiinterview.data.local.dao

import androidx.room.*
import com.aiinterview.data.local.entity.QuizAttemptEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface QuizAttemptDao {
    @Query("SELECT * FROM quiz_attempts ORDER BY created_at DESC") fun observeAll(): Flow<List<QuizAttemptEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertAll(attempts: List<QuizAttemptEntity>)
    @Query("DELETE FROM quiz_attempts") suspend fun clear()
}
