package com.aiinterview.presentation.sessions

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiinterview.domain.model.InterviewSession
import com.aiinterview.domain.repository.SessionRepository

class SessionHistoryPagingSource(
    private val repository: SessionRepository
) : PagingSource<Int, InterviewSession>() {

    override fun getRefreshKey(state: PagingState<Int, InterviewSession>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(1)
        }
    }

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, InterviewSession> {
        val position = params.key ?: 0
        val limit = params.loadSize
        
        return try {
            val result = repository.getSessionHistory(skip = position, limit = limit)
            when (result) {
                is com.aiinterview.core.result.Result.Success -> {
                    val sessions = result.data
                    LoadResult.Page(
                        data = sessions,
                        prevKey = if (position == 0) null else position - limit,
                        nextKey = if (sessions.isEmpty()) null else position + limit
                    )
                }
                is com.aiinterview.core.result.Result.Error -> {
                    LoadResult.Error(Exception(result.exception.userMessage))
                }
                is com.aiinterview.core.result.Result.Loading -> {
                    LoadResult.Page(emptyList(), null, null)
                }
            }
        } catch (exception: Exception) {
            LoadResult.Error(exception)
        }
    }
}
