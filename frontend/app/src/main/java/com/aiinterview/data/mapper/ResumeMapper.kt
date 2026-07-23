package com.aiinterview.data.mapper

import com.aiinterview.data.remote.dto.resume.*
import com.aiinterview.data.local.entity.ResumeEntity
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.model.ResumeAnalysis
import com.aiinterview.domain.model.ResumeSection
import com.aiinterview.domain.model.Skill
import com.aiinterview.domain.model.ImprovementSuggestion
import com.aiinterview.domain.model.EnhanceResponse

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

object ResumeMapper {
    fun ResumeSectionDto.toDomain() = ResumeSection(title = section_type, content = content)
    
    fun ParsedEntityDto.toDomain() = Skill(name = value, level = proficiency?.lowercase() ?: "intermediate")

    fun ResumeDto.toDomain(): Resume {
        val baseUrl = com.aiinterview.BuildConfig.API_BASE_URL.replace("api/v1/", "")
        val rawPath = filePath ?: ""
        val normalizedPath = rawPath.replace("\\", "/")
        val finalUrl = if (normalizedPath.isNotEmpty()) "$baseUrl$normalizedPath" else null
        
        val analysis = skillSummary?.atsAnalysis
        val strengths = analysis?.strengths?.map { it.formatTextOrObject() } ?: emptyList()
        val gaps = analysis?.gaps?.map { it.formatTextOrObject() } ?: emptyList()
        val suitableRoles = analysis?.suitableRoles ?: emptyList()
        val redFlags = analysis?.redFlags ?: emptyList()
        val improvementSuggestions = analysis?.improvementSuggestions?.map { it.toDomain() } ?: emptyList()
        
        return Resume(
            id = id,
            filename = file_name,
            fileUrl = finalUrl,
            isPrimary = is_primary,
            parseStatus = parse_status,
            createdAt = created_at,
            atsScore = atsScore,
            sections = sections?.map { it.toDomain() } ?: emptyList(),
            skills = entities?.filter { it.entity_type == "SKILL" }?.map { it.toDomain() } ?: emptyList(),
            suitableRoles = suitableRoles,
            strengths = strengths,
            gaps = gaps,
            quantificationScore = analysis?.quantificationScore,
            actionVerbScore = analysis?.actionVerbScore,
            seniorityLevel = analysis?.seniorityLevel,
            yearsOfExperience = analysis?.yearsOfExperience,
            redFlags = redFlags,
            improvementSuggestions = improvementSuggestions
        )
    }

    fun ResumeDto.toEntity(): ResumeEntity {
        val gson = Gson()
        val analysis = skillSummary?.atsAnalysis
        val strengthsJson = analysis?.strengths?.let { gson.toJson(it.map { x -> x.formatTextOrObject() }) }
        val gapsJson = analysis?.gaps?.let { gson.toJson(it.map { x -> x.formatTextOrObject() }) }
        val rolesJson = analysis?.suitableRoles?.let { gson.toJson(it) }
        val flagsJson = analysis?.redFlags?.let { gson.toJson(it) }
        val suggestionsJson = analysis?.improvementSuggestions?.let { gson.toJson(it) }
        
        return ResumeEntity(
            id = id,
            filename = file_name,
            file_path = filePath,
            is_primary = is_primary,
            parse_status = parse_status,
            created_at = created_at,
            ats_score = atsScore,
            suitable_roles = rolesJson,
            strengths = strengthsJson,
            gaps = gapsJson,
            quantification_score = analysis?.quantificationScore,
            action_verb_score = analysis?.actionVerbScore,
            seniority_level = analysis?.seniorityLevel,
            years_of_experience = analysis?.yearsOfExperience,
            red_flags = flagsJson,
            improvement_suggestions = suggestionsJson
        )
    }

    fun ResumeEntity.toDomain(): Resume {
        val baseUrl = com.aiinterview.BuildConfig.API_BASE_URL.replace("api/v1/", "")
        val rawPath = file_path ?: ""
        val normalizedPath = rawPath.replace("\\", "/")
        val finalUrl = if (normalizedPath.isNotEmpty()) "$baseUrl$normalizedPath" else null
        
        val gson = Gson()
        val listType = object : TypeToken<List<String>>() {}.type
        
        val roles: List<String> = try {
            if (!suitable_roles.isNullOrEmpty()) gson.fromJson(suitable_roles, listType) else emptyList()
        } catch (e: Exception) { emptyList() }
        
        val strengthsList: List<String> = try {
            if (!strengths.isNullOrEmpty()) gson.fromJson(strengths, listType) else emptyList()
        } catch (e: Exception) { emptyList() }
        
        val gapsList: List<String> = try {
            if (!gaps.isNullOrEmpty()) gson.fromJson(gaps, listType) else emptyList()
        } catch (e: Exception) { emptyList() }
        
        val flagsList: List<String> = try {
            if (!red_flags.isNullOrEmpty()) gson.fromJson(red_flags, listType) else emptyList()
        } catch (e: Exception) { emptyList() }
        
        val suggestionsList: List<ImprovementSuggestion> = try {
            if (!improvement_suggestions.isNullOrEmpty()) {
                val suggestionDtoType = object : TypeToken<List<ImprovementSuggestionDto>>() {}.type
                val dtos: List<ImprovementSuggestionDto> = gson.fromJson(improvement_suggestions, suggestionDtoType)
                dtos.map { it.toDomain() }
            } else emptyList()
        } catch (e: Exception) { emptyList() }
        
        return Resume(
            id = id,
            filename = filename,
            fileUrl = finalUrl,
            isPrimary = is_primary,
            parseStatus = parse_status,
            createdAt = created_at,
            atsScore = ats_score,
            suitableRoles = roles,
            strengths = strengthsList,
            gaps = gapsList,
            quantificationScore = quantification_score,
            actionVerbScore = action_verb_score,
            seniorityLevel = seniority_level,
            yearsOfExperience = years_of_experience,
            redFlags = flagsList,
            improvementSuggestions = suggestionsList
        )
    }

    fun ImprovementSuggestionDto.toDomain() = ImprovementSuggestion(
        section = section,
        current = current,
        suggested = suggested,
        impact = impact
    )

    fun ResumeAnalysisDto.toDomain() = ResumeAnalysis(
        resumeId = resumeId,
        atsScore = analysis?.ats_score ?: 0,
        strengths = analysis?.strengths?.map { it.formatTextOrObject() } ?: emptyList(),
        gaps = analysis?.gaps?.map { it.formatTextOrObject() } ?: emptyList(),
        improvementSuggestions = analysis?.improvementSuggestions?.map { it.toDomain() } ?: emptyList(),
        quantificationScore = analysis?.quantificationScore ?: 0,
        actionVerbScore = analysis?.actionVerbScore ?: 0,
        seniorityLevel = analysis?.seniorityLevel ?: "unknown",
        yearsOfExperience = analysis?.yearsOfExperience ?: 0,
        suitableRoles = analysis?.suitableRoles ?: emptyList(),
        redFlags = analysis?.redFlags ?: emptyList()
    )

    fun EnhanceResponseDto.toDomain() = EnhanceResponse(
        originalText = original_text,
        enhancedText = enhanced_text,
        suggestions = suggestions
    )
}

private fun com.google.gson.JsonElement.formatTextOrObject(): String {
    if (this.isJsonNull) return ""
    if (this.isJsonPrimitive) {
        return this.asString
    }
    if (this.isJsonObject) {
        val obj = this.asJsonObject
        if (obj.has("strength")) {
            val strengthObj = obj.get("strength")
            val strength = if (strengthObj.isJsonNull) "" else strengthObj.asString
            if (obj.has("evidence") && !obj.get("evidence").isJsonNull) {
                val evidence = obj.get("evidence").asString
                return "$strength (Evidence: $evidence)"
            }
            return strength
        }
        if (obj.has("gap")) {
            val gapObj = obj.get("gap")
            val gap = if (gapObj.isJsonNull) "" else gapObj.asString
            if (obj.has("recommendation") && !obj.get("recommendation").isJsonNull) {
                val rec = obj.get("recommendation").asString
                return "$gap (Recommendation: $rec)"
            }
            return gap
        }
        val strings = obj.entrySet().mapNotNull { entry ->
            if (entry.value.isJsonPrimitive && entry.value.asJsonPrimitive.isString) {
                entry.value.asString
            } else null
        }
        if (strings.isNotEmpty()) {
            return strings.joinToString(" — ")
        }
        return this.toString()
    }
    return this.toString()
}
