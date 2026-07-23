package com.aiinterview.data.mapper

import com.aiinterview.data.remote.dto.jobs.*
import com.aiinterview.domain.model.JobMatch

object JobsMapper {
    fun JobMatchDto.toDomain() = JobMatch(
        id = "",
        title = "",
        company = "",
        location = null,
        salaryRange = null,
        matchScore = matchScore,
        skillsOverlap = skillsOverlap,
        missingSkills = missingSkills,
        isSaved = false
    )
}
