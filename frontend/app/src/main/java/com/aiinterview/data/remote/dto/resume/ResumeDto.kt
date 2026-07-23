package com.aiinterview.data.remote.dto.resume

import com.google.gson.annotations.SerializedName

data class ResumeSectionDto(
    val section_type: String,
    val content: String,
    val order_index: Int
)

data class ParsedEntityDto(
    val entity_type: String,
    val value: String,
    val proficiency: String?
)

data class SkillSummaryDto(
    @SerializedName("ats_analysis") val atsAnalysis: AtsAnalysisDto? = null
)

data class ResumeDto(
    val id: String,
    val file_name: String,
    @SerializedName("file_path") val filePath: String?,
    val is_primary: Boolean,
    val parse_status: String,
    val created_at: String,
    @SerializedName("ats_score") val atsScore: Int? = null,
    val sections: List<ResumeSectionDto>? = null,
    val entities: List<ParsedEntityDto>? = null,
    @SerializedName("skill_summary") val skillSummary: SkillSummaryDto? = null
)
