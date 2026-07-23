package com.aiinterview.data.local.dao

import androidx.room.*
import com.aiinterview.data.local.entity.ResumeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ResumeDao {
    @Query("SELECT * FROM resumes ORDER BY created_at DESC") fun observeAll(): Flow<List<ResumeEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertAll(resumes: List<ResumeEntity>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun insert(resume: ResumeEntity)
    @Query("SELECT * FROM resumes WHERE id = :id") suspend fun getResumeById(id: String): ResumeEntity?
    @Query("DELETE FROM resumes") suspend fun clear()
}
