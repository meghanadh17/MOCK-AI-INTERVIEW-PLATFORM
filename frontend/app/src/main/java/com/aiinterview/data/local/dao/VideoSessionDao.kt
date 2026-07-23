package com.aiinterview.data.local.dao

import androidx.room.*
import com.aiinterview.data.local.entity.FrameMetricEntity
import com.aiinterview.data.local.entity.VideoSessionEntity

@Dao
interface VideoSessionDao {
    @Query("SELECT * FROM video_sessions WHERE id = :sessionId")
    suspend fun getSession(sessionId: String): VideoSessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: VideoSessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFrameMetric(metric: FrameMetricEntity)

    @Query("SELECT * FROM frame_metrics WHERE sessionId = :sessionId ORDER BY timestamp ASC")
    suspend fun getFrameMetrics(sessionId: String): List<FrameMetricEntity>

    @Query("DELETE FROM frame_metrics WHERE sessionId = :sessionId")
    suspend fun deleteFrameMetricsForSession(sessionId: String)

    @Query("DELETE FROM video_sessions WHERE id = :sessionId")
    suspend fun deleteSession(sessionId: String)
}

