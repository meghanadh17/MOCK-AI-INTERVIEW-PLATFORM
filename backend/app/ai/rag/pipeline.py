import logging
from typing import List, Dict, Any, Union, Optional
from app.ai.rag.chunker import HierarchicalChunker, Chunk
from app.ai.rag.retriever import HybridRetriever
from app.ai.rag.reranker import CrossEncoderReranker
from app.ai.prompt_compression import PromptCompressor

logger = logging.getLogger(__name__)


class RAGPipeline:
    """Orchestrates RAG ingestion, hybrid retrieval, cross-encoder re-ranking, and prompt compression."""
    
    @staticmethod
    def ingest_document(text: str, user_id: str = "default_user", resume_id: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Ingests raw text, parses sections, and splits into parent-child chunks."""
        logger.info(f"Ingesting document for user {user_id} into RAG pipeline...")
        parent_chunks, child_chunks = HierarchicalChunker.chunk(text, user_id=user_id, resume_id=resume_id)
        logger.info(f"Ingestion generated {len(parent_chunks)} parent chunks and {len(child_chunks)} child chunks.")
        
        # Connect to ChromaStore and write vectors
        from app.ai.rag.chroma_store import ChromaStore
        from app.ai.rag.embedder import SentenceEmbedder
        
        child_store = ChromaStore(collection_name=f"resume_child_{user_id}")
        parent_store = ChromaStore(collection_name=f"resume_parent_{user_id}")
        
        if child_chunks:
            child_ids = [c["id"] for c in child_chunks]
            child_texts = [c["text"] for c in child_chunks]
            child_embeddings = SentenceEmbedder.encode_batch(child_texts)
            child_metadatas = [c["metadata"] for c in child_chunks]
            child_store.add_documents(child_ids, child_texts, child_embeddings, child_metadatas)
            
        if parent_chunks:
            parent_ids = [p["id"] for p in parent_chunks]
            parent_texts = [p["text"] for p in parent_chunks]
            parent_embeddings = SentenceEmbedder.encode_batch(parent_texts)
            parent_metadatas = [p["metadata"] for p in parent_chunks]
            parent_store.add_documents(parent_ids, parent_texts, parent_embeddings, parent_metadatas)
            
        return {
            "parent_chunks": parent_chunks,
            "child_chunks": child_chunks
        }

    @classmethod
    def get_context(
        cls, 
        query: str, 
        child_chunks: List[Union[Dict[str, Any], Chunk]], 
        parent_chunks: List[Union[Dict[str, Any], Chunk]], 
        top_k: int = 5
    ) -> str:
        """Retrieves and compiles the compressed RAG context matching the query."""
        logger.info(f"Retrieving RAG context for query: '{query}'")
        
        # Normalize input chunks to dictionary format for safety
        normalized_children = []
        for c in child_chunks:
            if hasattr(c, "id"):
                normalized_children.append({
                    "id": c.id, "text": c.text, "section": c.section,
                    "chunk_index": c.chunk_index, "parent_id": c.parent_id, "metadata": c.metadata
                })
            elif isinstance(c, dict):
                normalized_children.append(c)
                
        normalized_parents = []
        for p in parent_chunks:
            if hasattr(p, "id"):
                normalized_parents.append({
                    "id": p.id, "text": p.text, "section": p.section,
                    "chunk_index": p.chunk_index, "parent_id": p.parent_id, "metadata": p.metadata
                })
            elif isinstance(p, dict):
                normalized_parents.append(p)

        if not normalized_children:
            logger.warning("No child chunks provided to retrieve context from.")
            return ""

        # Stage 1-4: Retrieve candidates using Hybrid Retrieval
        # - Stage 1 (Embed): Bi-Encoder SBERT embeddings generated for query & documents
        # - Stage 2 (Sparse Index): rank-bm25 or custom tokenized BM25 keyword matching
        # - Stage 3 (Dense Index): FAISS HNSW or ChromaDB Cosine vector similarity search
        # - Stage 4 (Hybrid Retrieve): Reciprocal Rank Fusion (RRF, k=60) fuser
        candidates = HybridRetriever.retrieve(query, normalized_children, top_n=15)
        
        # Stage 5 (Re-rank): Neural Cross-Encoder (ms-marco-MiniLM-L-6-v2) or keyword-weighted overlap re-scoring
        top_chunks = CrossEncoderReranker.rerank(query, candidates, top_k=top_k)
        
        # Stage 6 (Parent Expand): Parent Doc Retriever to map child chunks back to original parent documents
        enriched = []
        for chunk in top_chunks:
            parent = next((p for p in normalized_parents if p["id"] == chunk["parent_id"]), None)
            enriched.append({
                "text": chunk["text"],
                "parent_text": parent["text"] if parent else ""
            })
            
        # Stage 7 (Compress): Jaccard sentence de-duplication / prompt context compression
        compressed_context = PromptCompressor.compress_context(enriched)
        
        # Stage 8 (Generate): Done downstream via MistralAI Large grounding injection
        logger.info("8-Stage Context retrieval and compression completed successfully.")
        return compressed_context
