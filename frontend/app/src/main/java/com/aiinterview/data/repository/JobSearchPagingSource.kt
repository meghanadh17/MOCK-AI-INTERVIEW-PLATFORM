package com.aiinterview.data.repository

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Job
import com.aiinterview.domain.repository.JobsRepository

class JobSearchPagingSource(
    private val repo: JobsRepository,
    private val query: String?,
    private val location: String?,
    private val experienceLevel: String?
) : PagingSource<Int, Job>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Job> {
        val position = params.key ?: 0
        val limit = params.loadSize
        
        return when (val result = repo.searchJobs(query, location, experienceLevel, position, limit)) {
            is Result.Success -> {
                val list = result.data
                LoadResult.Page(
                    data = list,
                    prevKey = if (position == 0) null else position - limit,
                    nextKey = if (list.isEmpty()) null else position + limit
                )
            }
            is Result.Error -> {
                LoadResult.Error(Exception(result.exception.userMessage))
            }
            else -> {
                LoadResult.Error(Exception("Unknown error occurred"))
            }
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Job>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(state.config.pageSize)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(state.config.pageSize)
        }
    }
}
