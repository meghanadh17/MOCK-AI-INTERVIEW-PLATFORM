package com.aiinterview.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "resumes")
data class ResumeEntity(
    @PrimaryKey val id: String,
    val filename: String,
    val file_path: String?,
    val is_primary: Boolean,
    val parse_status: String,
    val created_at: String,
    val ats_score: Int? = null,
    val suitable_roles: String? = null,
    val strengths: String? = null,
    val gaps: String? = null,
    val quantification_score: Int? = null,
    val action_verb_score: Int? = null,
    val seniority_level: String? = null,
    val years_of_experience: Int? = null,
    val red_flags: String? = null,
    val improvement_suggestions: String? = null
)
