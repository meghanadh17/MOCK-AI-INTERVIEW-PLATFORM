import pytest
from app.ai.rag.chunker import HierarchicalChunker
from app.ai.rag.retriever import HybridRetriever
from app.ai.rag.reranker import CrossEncoderReranker
from app.ai.rag.pipeline import RAGPipeline

SAMPLE_RESUME = """
John Doe
Software Engineer

SUMMARY
Highly motivated engineer with 5 years of experience in Python, FastAPI, and docker databases.

EXPERIENCE
Software Developer at TechCorp.
- Designed database schemas to support scaling to millions of daily users.
- Built async Python backend APIs using FastAPI and SQLAlchemy.
- Implemented real-time caching using Redis.

EDUCATION
Bachelor of Science in Computer Science, University of Technology.
"""


def test_hierarchical_chunking():
    parent_chunks, child_chunks = HierarchicalChunker.chunk(SAMPLE_RESUME)
    assert len(parent_chunks) >= 3
    assert len(child_chunks) > 5


def test_hybrid_retriever():
    documents = [
        {"id": 1, "parent_id": 1, "text": "Designed database schemas to support scaling to millions of daily users."},
        {"id": 2, "parent_id": 1, "text": "Built async Python backend APIs using FastAPI and SQLAlchemy."},
        {"id": 3, "parent_id": 2, "text": "Implemented real-time caching using Redis."}
    ]
    
    # Search sparse/dense match combined
    results = HybridRetriever.retrieve("FastAPI backend", documents)
    assert len(results) > 0
    # Top chunk should be document 2 (index 1 in the raw corpus)
    assert results[0][0]["id"] == 2


def test_cross_encoder_reranker():
    candidates_with_scores = [
        ({"id": 1, "text": "Designed database schemas to support scaling to millions of daily users."}, 0.0325),
        ({"id": 2, "text": "Built async Python backend APIs using FastAPI and SQLAlchemy."}, 0.0325),
        ({"id": 3, "text": "Implemented real-time caching using Redis."}, 0.0317)
    ]
    
    top_chunks = CrossEncoderReranker.rerank("Redis caching", candidates_with_scores, top_k=2)
    assert len(top_k_chunks := top_chunks) == 2
    assert top_k_chunks[0]["id"] == 3  # Matches "Redis caching" terms


def test_full_rag_pipeline():
    result = RAGPipeline.ingest_document(SAMPLE_RESUME)
    parent_chunks = result["parent_chunks"]
    child_chunks = result["child_chunks"]
    
    context = RAGPipeline.get_context("database scaling", child_chunks, parent_chunks, top_k=2)
    assert "database" in context.lower() or "scaling" in context.lower()


@pytest.mark.asyncio
async def test_database_cold_start(db):
    from app.domains.resume.models import Resume
    from app.ai.rag.retriever import HybridRetriever
    
    # 1. Create a dummy user resume in test DB
    dummy_user_id = "test_cold_user"
    resume = Resume(
        user_id=dummy_user_id,
        file_name="cv.pdf",
        file_path="/tmp/cv.pdf",
        parsed_text="Experienced developer working with FastAPI backend microservices and Redis.",
        parse_status="success"
    )
    db.add(resume)
    await db.commit()
    
    # 2. Instantiate hybrid retriever and verify BM25 cache is cold (empty)
    retriever = HybridRetriever()
    assert dummy_user_id not in retriever._bm25_index
    
    # 3. Perform search (which triggers async database-integrated rebuild)
    chunks = await retriever.retrieve(dummy_user_id, "FastAPI backend", {"type": "child"})
    
    # 4. Verify results are retrieved and index is populated
    assert len(chunks) > 0
    assert "FastAPI" in chunks[0].text or "backend" in chunks[0].text
    assert dummy_user_id in retriever._bm25_index


@pytest.mark.asyncio
async def test_resume_soft_delete_and_vector_purge(db):
    from app.domains.resume.models import Resume
    from app.domains.resume.service import ResumeService
    from app.ai.rag.pipeline import RAGPipeline
    from app.ai.rag.chroma_store import ChromaStore
    from app.ai.rag.retriever import HybridRetriever
    
    user_id = "test_purge_user"
    
    # 1. Create a dummy user resume in test DB
    resume = Resume(
        user_id=user_id,
        file_name="cv_purge.pdf",
        file_path="/tmp/cv_purge.pdf",
        parsed_text="Specialized machine learning engineer with experience in TensorFlow and Kubernetes.",
        parse_status="success"
    )
    db.add(resume)
    await db.commit()
    
    # 2. Ingest document into RAG Pipeline
    RAGPipeline.ingest_document(resume.parsed_text, user_id=user_id, resume_id=resume.id)
    
    # 3. Verify chunks exist in ChromaStore fallback DB
    child_store = ChromaStore(collection_name=f"resume_child_{user_id}")
    assert len(child_store._fallback_db) > 0
    
    # 4. Delete the resume (triggers soft delete & vector DB purge)
    deleted = await ResumeService.delete_resume(db, resume.id, user_id)
    assert deleted is True
    
    # 5. Verify the chunks have been purged from the vector DB
    assert len(child_store._fallback_db) == 0
    
    # 6. Verify retriever query returns no results (since index is empty and SQL record is soft-deleted)
    retriever = HybridRetriever()
    chunks = await retriever.retrieve(user_id, "TensorFlow")
    assert len(chunks) == 0

