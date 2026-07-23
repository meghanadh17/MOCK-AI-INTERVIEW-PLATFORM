package com.aiinterview.data.local.dao

import androidx.room.*
import com.aiinterview.data.local.entity.InterviewSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface InterviewSessionDao {
    @Query("SELECT * FROM interview_sessions ORDER BY created_at DESC") fun observeAll(): Flow<List<InterviewSessionEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertAll(sessions: List<InterviewSessionEntity>)
    @Query("DELETE FROM interview_sessions") suspend fun clear()
}
