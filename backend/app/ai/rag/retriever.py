import re
import math
import logging
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter
from dataclasses import dataclass

from app.ai.rag.embedder import SentenceEmbedder
from app.ai.rag.chroma_store import ChromaStore, CHROMA_AVAILABLE
from app.ai.rag.faiss_store import FAISSStore
from app.ai.rag.reranker import get_cross_encoder_model

logger = logging.getLogger(__name__)


class AwaitableList(list):
    """A list subclass that can be awaited to bridge legacy sync and new async retrievers."""
    def __await__(self):
        async def _async_val():
            return self
        return _async_val().__await__()


class AwaitableRetrieval:
    """An awaitable class to execute the async retrieval pipeline when awaited."""
    def __init__(self, retriever: Any, user_id: str, query: str, filters: dict | None = None, db: Any = None):
        self.retriever = retriever
        self.user_id = user_id
        self.query = query
        self.filters = filters
        self.db = db

    def __await__(self):
        return self.retriever._retrieve_instance_async(self.user_id, self.query, self.filters, self.db).__await__()



@dataclass
class RetrievedChunk:
    id: str
    text: str
    section: str
    dense_score: float
    sparse_score: float
    rrf_score: float
    rerank_score: float
    parent_text: str | None = None   # Expanded context


STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd",
    "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their",
    "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they're", "they've", "this", 
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", 
    "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", 
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", 
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "using", "designed", "implemented", 
    "developed", "built", "at", "for", "to", "in", "on", "with", "by", "of"
}


def clean_tokenize(text: str) -> List[str]:
    """Tokenizes text, filters out punctuation, common stop-words, and short terms."""
    words = re.findall(r"\b\w+\b", text.lower())
    return [w for w in words if len(w) > 1 and w not in STOP_WORDS]


class BM25Retriever:
    """Pure Python implementation of the BM25 sparse search algorithm with stop word pruning."""
    def __init__(self, documents: List[Dict[str, Any]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents = documents
        self.corpus_size = len(documents)
        
        self.tokenized_corpus = [clean_tokenize(doc.get("text", "")) for doc in documents]
        self.doc_lens = [len(doc) for doc in self.tokenized_corpus]
        self.avg_dl = sum(self.doc_lens) / self.corpus_size if self.corpus_size > 0 else 1.0
        
        self.doc_freqs = [Counter(doc) for doc in self.tokenized_corpus]
        df = Counter()
        for doc in self.tokenized_corpus:
            for term in set(doc):
                df[term] += 1
                
        self.idf = {}
        for term, freq in df.items():
            self.idf[term] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)

    def get_scores(self, query: str) -> List[Tuple[int, float]]:
        query_tokens = clean_tokenize(query)
        scores = []
        for idx in range(self.corpus_size):
            score = 0.0
            doc_freq = self.doc_freqs[idx]
            doc_len = self.doc_lens[idx]
            
            for token in query_tokens:
                if token not in doc_freq:
                    continue
                tf = doc_freq[token]
                idf = self.idf.get(token, 0.0)
                numerator = idf * tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / self.avg_dl))
                score += numerator / denominator
            scores.append((idx, score))
        return scores


class SparseBM25Retriever:
    """Production BM25 sparse retriever. Uses rank-bm25 BM25Okapi if available, otherwise falls back to custom BM25."""
    def __init__(self, documents: List[Dict[str, Any]]):
        self.documents = documents
        from app.ai.rag.retriever import RANK_BM25_AVAILABLE
        self.bm25 = None
        
        self.tokenized_corpus = [clean_tokenize(doc.get("text", "")) for doc in documents]
        
        # Import rank_bm25 on demand
        if RANK_BM25_AVAILABLE:
            try:
                from rank_bm25 import BM25Okapi
                self.bm25 = BM25Okapi(self.tokenized_corpus)
                logger.info("SparseBM25Retriever: Initialized rank-bm25 BM25Okapi successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize BM25Okapi: {e}. Falling back to custom BM25.")
                
        if self.bm25 is None:
            self.fallback = BM25Retriever(documents)
            
    def get_scores(self, query: str) -> List[Tuple[int, float]]:
        from app.ai.rag.retriever import RANK_BM25_AVAILABLE
        if RANK_BM25_AVAILABLE and self.bm25 is not None:
            try:
                query_tokens = clean_tokenize(query)
                scores = self.bm25.get_scores(query_tokens)
                return [(idx, float(score)) for idx, score in enumerate(scores)]
            except Exception as e:
                logger.error(f"Error computing BM25Okapi scores: {e}. Falling back to custom BM25.")
                
        return self.fallback.get_scores(query)


class DenseSimilarityRetriever:
    """Pure Python vector similarity implementation using cosine similarity over TF-IDF vectors."""
    def __init__(self, documents: List[Dict[str, Any]]):
        self.documents = documents
        self.corpus_size = len(documents)
        self.tokenized_corpus = [clean_tokenize(doc.get("text", "")) for doc in documents]
        
        self.doc_vectors = []
        df = Counter()
        for doc in self.tokenized_corpus:
            for term in set(doc):
                df[term] += 1
                
        self.idf = {term: math.log(self.corpus_size / (freq + 1.0) + 1.0) for term, freq in df.items()}
        
        for doc in self.tokenized_corpus:
            tf = Counter(doc)
            vector = {}
            norm_sum = 0.0
            for term, count in tf.items():
                w = count * self.idf.get(term, 0.0)
                vector[term] = w
                norm_sum += w * w
            
            norm = math.sqrt(norm_sum)
            if norm > 0:
                vector = {k: v / norm for k, v in vector.items()}
            self.doc_vectors.append(vector)

    def get_scores(self, query: str) -> List[Tuple[int, float]]:
        query_tokens = clean_tokenize(query)
        query_tf = Counter(query_tokens)
        query_vector = {}
        norm_sum = 0.0
        
        for term, count in query_tf.items():
            w = count * self.idf.get(term, 0.0)
            query_vector[term] = w
            norm_sum += w * w
            
        query_norm = math.sqrt(norm_sum)
        if query_norm > 0:
            query_vector = {k: v / query_norm for k, v in query_vector.items()}
            
        scores = []
        for idx, doc_vector in enumerate(self.doc_vectors):
            similarity = 0.0
            for term, val in query_vector.items():
                if term in doc_vector:
                    similarity += val * doc_vector[term]
            scores.append((idx, similarity))
        return scores


class NeuralDenseRetriever:
    """Production Dense retriever utilizing SentenceEmbedder and FAISSStore, with TF-IDF fallback."""
    def __init__(self, documents: List[Dict[str, Any]]):
        self.documents = documents
        self.fallback = None
        
        # Only build FAISS/SBERT index if SBERT is actually available
        from app.ai.rag.embedder import SBERT_AVAILABLE
        if SBERT_AVAILABLE:
            try:
                self.faiss_store = FAISSStore()
                texts = [doc.get("text", "") for doc in documents]
                embeddings = SentenceEmbedder.encode_batch(texts)
                self.faiss_store.build_index(embeddings)
                return
            except Exception as e:
                logger.error(f"Failed to initialize NeuralDenseRetriever SBERT index: {e}")
                
        # Otherwise, fall back to pure-Python TF-IDF Cosine similarity
        self.fallback = DenseSimilarityRetriever(documents)
                
    def get_scores(self, query: str) -> List[Tuple[int, float]]:
        if self.fallback is not None:
            return self.fallback.get_scores(query)
            
        try:
            query_vector = SentenceEmbedder.encode_text(query)
            hits = self.faiss_store.search(query_vector, top_k=len(self.documents))
            
            scores_dict = {idx: score for idx, score in hits}
            scores = []
            for idx in range(len(self.documents)):
                scores.append((idx, scores_dict.get(idx, 0.0)))
            return scores
        except Exception as e:
            logger.error(f"FAISS search failed: {e}. Using TF-IDF fallback.")
            fallback = DenseSimilarityRetriever(self.documents)
            return fallback.get_scores(query)


# Define availability variables for on-demand imports
try:
    from sentence_transformers import SentenceTransformer
    SBERT_AVAILABLE = True
except ImportError:
    SBERT_AVAILABLE = False

try:
    from rank_bm25 import BM25Okapi
    RANK_BM25_AVAILABLE = True
except ImportError:
    RANK_BM25_AVAILABLE = False


class HybridRetriever:
    """
    Production RAG retriever using Reciprocal Rank Fusion (RRF) to combine
    dense vector search with sparse BM25. Used by Anthropic, Cohere, and
    enterprise LlamaIndex deployments.
    """

    RRF_K = 60      # RRF smoothing constant (60 is canonical value)
    TOP_K_DENSE  = 20
    TOP_K_SPARSE = 20
    TOP_K_RERANK = 5    # Final top-k after re-ranking

    def __init__(self):
        # Expose references for API compatibility
        self.bi_encoder = SentenceTransformer('sentence-transformers/all-mpnet-base-v2') if SBERT_AVAILABLE else None
        self.cross_encoder = get_cross_encoder_model()
        
        if CHROMA_AVAILABLE:
            try:
                import chromadb
                self.chroma_client = chromadb.PersistentClient(path='./data/chroma')
            except Exception:
                self.chroma_client = None
        else:
            self.chroma_client = None

        self._bm25_index: dict[str, Any] = {}
        self._corpus: dict[str, list[str]] = {}
        self._child_stores: dict[str, ChromaStore] = {}
        self._parent_stores: dict[str, ChromaStore] = {}

    def build_bm25_index(self, user_id: str, chunks: list[str]) -> None:
        """Build a per-user BM25 index over child chunks."""
        self._corpus[user_id] = chunks
        if RANK_BM25_AVAILABLE:
            try:
                from rank_bm25 import BM25Okapi
                tokenized = [c.lower().split() for c in chunks]
                self._bm25_index[user_id] = BM25Okapi(tokenized)
                logger.info(f"Successfully built rank-bm25 BM25Okapi index for user {user_id}.")
                return
            except Exception as e:
                logger.error(f"Failed to build BM25Okapi: {e}. Falling back to custom BM25.")
        
        # Pure Python BM25Retriever fallback
        documents = [{"id": f"bm25_{i}", "text": text} for i, text in enumerate(chunks)]
        self._bm25_index[user_id] = BM25Retriever(documents)

    def retrieve(self, *args, **kwargs) -> Any:
        """
        Full hybrid retrieval pipeline supporting:
        - Legacy sync classmethod call: retrieve(query, child_chunks, top_n)
        - Instance method call (sync/async compatible via AwaitableList): retrieve(user_id, query, filters)
        """
        # Check if called as class method or static method
        if not isinstance(self, HybridRetriever):
            query = self
            child_chunks = args[0] if len(args) > 0 else kwargs.get("child_chunks")
            top_n = args[1] if len(args) > 1 else kwargs.get("top_n", 15)
            return HybridRetriever._retrieve_legacy(query, child_chunks, top_n)
            
        # Instance call
        user_id = args[0] if len(args) > 0 else kwargs.get("user_id")
        query = args[1] if len(args) > 1 else kwargs.get("query")
        filters = args[2] if len(args) > 2 else kwargs.get("filters")
        db = kwargs.get("db")
        
        return AwaitableRetrieval(self, user_id, query, filters, db)

    async def _retrieve_instance_async(self, user_id: str, query: str, filters: dict | None = None, db: Any = None) -> list[RetrievedChunk]:
        # Connect to ChromaStore
        if user_id not in self._child_stores:
            self._child_stores[user_id] = ChromaStore(collection_name=f'resume_child_{user_id}')
        if user_id not in self._parent_stores:
            self._parent_stores[user_id] = ChromaStore(collection_name=f'resume_parent_{user_id}')
            
        child_store = self._child_stores[user_id]
        parent_store = self._parent_stores[user_id]

        # --- 1. Dense retrieval ---
        dense_ids, dense_texts, dense_scores = [], [], []
        
        # Encode query using SentenceEmbedder
        query_emb = SentenceEmbedder.encode_text(query)
        
        # Query child collection
        dense_results = child_store.query(
            query_embeddings=[query_emb],
            limit=self.TOP_K_DENSE,
            where=filters
        )
        
        dense_ids   = dense_results['ids'][0]
        dense_texts = dense_results['documents'][0]
        dense_scores = [1.0 - float(d) for d in dense_results['distances'][0]]

        # --- 2. Sparse retrieval (BM25) & Database Cold Start Rebuilding ---
        bm25  = self._bm25_index.get(user_id)
        if not bm25:
            # First, check if ChromaStore already has documents in the collection
            logger.info(f"BM25 index not found for user {user_id}. Querying ChromaDB to rebuild index...")
            try:
                all_docs = child_store.collection.get() if child_store.collection is not None else {"documents": [], "metadatas": []}
                doc_texts = all_docs.get("documents", [])
                if not doc_texts and child_store._fallback_db:
                    doc_texts = [d["document"] for d in child_store._fallback_db.values()]
                if doc_texts:
                    self.build_bm25_index(user_id, doc_texts)
                    bm25 = self._bm25_index.get(user_id)
                    logger.info(f"RAG: Successfully rebuilt BM25 index for user {user_id} from ChromaDB with {len(doc_texts)} chunks.")
            except Exception as e:
                logger.error(f"Failed to dynamically rebuild BM25 index from ChromaDB: {e}")

            # If still not found (ChromaDB is empty/cold), query the SQL database
            if not bm25:
                logger.info(f"RAG: ChromaDB is empty for user {user_id}. Querying SQL database to rebuild...")
                try:
                    from sqlalchemy.future import select
                    from sqlalchemy.orm import selectinload
                    from app.database.base import async_session_maker
                    from app.domains.resume.models import Resume
                    from app.ai.rag.chunker import HierarchicalChunker
                    
                    if db is not None:
                        stmt = (
                            select(Resume)
                            .options(selectinload(Resume.sections))
                            .where(Resume.user_id == user_id, Resume.deleted_at.is_(None))
                        )
                        db_res = await db.execute(stmt)
                        resumes = db_res.scalars().all()
                    else:
                        from app.database.base import async_session_maker
                        async with async_session_maker() as session:
                            stmt = (
                                select(Resume)
                                .options(selectinload(Resume.sections))
                                .where(Resume.user_id == user_id, Resume.deleted_at.is_(None))
                            )
                            db_res = await session.execute(stmt)
                            resumes = db_res.scalars().all()
                            await session.commit()
                        
                    all_child_texts = []
                    all_child_ids = []
                    all_child_embeddings = []
                    all_child_metadatas = []
                    
                    all_parent_texts = []
                    all_parent_ids = []
                    all_parent_embeddings = []
                    all_parent_metadatas = []
                    
                    for resume in resumes:
                        if resume.parsed_text:
                            parent_chunks, child_chunks = HierarchicalChunker.chunk(
                                resume.parsed_text, user_id=user_id, resume_id=resume.id
                            )
                            
                            if child_chunks:
                                child_texts = [cc["text"] for cc in child_chunks]
                                all_child_texts.extend(child_texts)
                                all_child_ids.extend([cc["id"] for cc in child_chunks])
                                all_child_metadatas.extend([cc["metadata"] for cc in child_chunks])
                                embeddings = SentenceEmbedder.encode_batch(child_texts)
                                all_child_embeddings.extend(embeddings)
                                
                            if parent_chunks:
                                parent_texts = [pc["text"] for pc in parent_chunks]
                                all_parent_texts.extend(parent_texts)
                                all_parent_ids.extend([pc["id"] for pc in parent_chunks])
                                all_parent_metadatas.extend([pc["metadata"] for pc in parent_chunks])
                                p_embeddings = SentenceEmbedder.encode_batch(parent_texts)
                                all_parent_embeddings.extend(p_embeddings)
                    
                    if all_child_texts:
                        child_store.add_documents(
                            all_child_ids, all_child_texts, all_child_embeddings, all_child_metadatas
                        )
                        parent_store.add_documents(
                            all_parent_ids, all_parent_texts, all_parent_embeddings, all_parent_metadatas
                        )
                        self.build_bm25_index(user_id, all_child_texts)
                        bm25 = self._bm25_index.get(user_id)
                        logger.info(f"RAG: Successfully rebuilt cold cache for user {user_id} from SQL database with {len(all_child_texts)} chunks.")
                except Exception as db_err:
                    logger.error(f"RAG: Failed to dynamically rebuild cache from SQL: {db_err}")

        sparse_ids, sparse_texts, sparse_scores = [], [], []
        if bm25:
            if isinstance(bm25, BM25Retriever):
                scores = bm25.get_scores(query)
                sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)[:self.TOP_K_SPARSE]
                corpus = self._corpus.get(user_id, [])
                sparse_ids   = [f'bm25_{idx}' for idx, _ in sorted_scores]
                sparse_texts = [corpus[idx] for idx, _ in sorted_scores]
                sparse_scores = [float(score) for _, score in sorted_scores]
            else:
                bm25_scores = bm25.get_scores(query.lower().split())
                import numpy as np
                top_sparse  = np.argsort(bm25_scores)[::-1][:self.TOP_K_SPARSE]
                corpus = self._corpus.get(user_id, [])
                sparse_ids   = [f'bm25_{i}' for i in top_sparse]
                sparse_texts = [corpus[i] for i in top_sparse]
                sparse_scores = [float(bm25_scores[i]) for i in top_sparse]

        # --- 3. Reciprocal Rank Fusion ---
        rrf_scores: dict[str, float] = {}
        rrf_text_map: dict[str, str] = {}
        for rank, (id_, text) in enumerate(zip(dense_ids, dense_texts)):
            rrf_scores[id_] = rrf_scores.get(id_, 0) + 1 / (self.RRF_K + rank + 1)
            rrf_text_map[id_] = text
        for rank, (id_, text) in enumerate(zip(sparse_ids, sparse_texts)):
            rrf_scores[id_] = rrf_scores.get(id_, 0) + 1 / (self.RRF_K + rank + 1)
            rrf_text_map[id_] = text

        top_rrf = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:15]
        candidate_texts = [rrf_text_map[id_] for id_, _ in top_rrf]

        # --- 4. Cross-encoder re-ranking ---
        pairs  = [(query, text) for text in candidate_texts]
        cross_encoder = get_cross_encoder_model()
        if cross_encoder is not None:
            try:
                rerank_scores = cross_encoder.predict(pairs, show_progress_bar=False)
            except Exception as e:
                logger.error(f"Neural CrossEncoder predict failed: {e}. Using fallback keyword-overlap scores.")
                rerank_scores = self._fallback_rerank_scores(query, candidate_texts)
        else:
            rerank_scores = self._fallback_rerank_scores(query, candidate_texts)

        ranked = sorted(zip(top_rrf, candidate_texts, rerank_scores),
                        key=lambda x: x[2], reverse=True)[:self.TOP_K_RERANK]

        # --- 5. Build final results with parent expansion ---
        results = []
        for (id_, rrf_score), text, rerank_score in ranked:
            parent_text = None
            
            # Lookup metadata and parent document in child_store and parent_store
            meta_res = child_store.get(ids=[id_])
            meta = meta_res['metadatas'][0] if meta_res.get('metadatas') else None
            
            if meta and meta.get('parent_id'):
                parent_res = parent_store.get(ids=[meta['parent_id']])
                if parent_res.get('documents'):
                    parent_text = parent_res['documents'][0]
                    
            section_val = meta.get('section', '') if meta else ''
            
            results.append(RetrievedChunk(
                id=id_, text=text,
                section=section_val,
                dense_score=dense_scores[dense_ids.index(id_)] if id_ in dense_ids else 0.0,
                sparse_score=sparse_scores[sparse_ids.index(id_)] if id_ in sparse_ids else 0.0,
                rrf_score=float(rrf_score),
                rerank_score=float(rerank_score),
                parent_text=parent_text
            ))
        return results

    def _fallback_dense_search(self, user_id: str, query: str) -> Tuple[List[str], List[str], List[float]]:
        corpus = self._corpus.get(user_id, [])
        if not corpus:
            return [], [], []
        documents = [{"id": f"fallback_{i}", "text": text} for i, text in enumerate(corpus)]
        dense_retriever = DenseSimilarityRetriever(documents)
        scores = dense_retriever.get_scores(query)
        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)[:self.TOP_K_DENSE]
        dense_ids = [f"fallback_{idx}" for idx, _ in sorted_scores]
        dense_texts = [corpus[idx] for idx, _ in sorted_scores]
        dense_scores = [score for _, score in sorted_scores]
        return dense_ids, dense_texts, dense_scores

    def _fallback_rerank_scores(self, query: str, candidate_texts: List[str]) -> List[float]:
        from app.ai.rag.reranker import TECH_BOOST_KEYWORDS
        q_words = set(re.findall(r"\w+", query.lower()))
        scores = []
        for text in candidate_texts:
            c_words = set(re.findall(r"\w+", text.lower()))
            total_weight = 0.0
            overlap_weight = 0.0
            for q_word in q_words:
                weight = 3.0 if q_word in TECH_BOOST_KEYWORDS else 1.0
                total_weight += weight
                if q_word in c_words:
                    overlap_weight += weight
            overlap_ratio = overlap_weight / total_weight if total_weight > 0 else 0.0
            scores.append(overlap_ratio)
        return scores

    @staticmethod
    def rrf(dense_ranks: List[int], sparse_ranks: List[int], k: int = 60) -> Dict[int, float]:
        scores = {}
        for rank_idx, doc_idx in enumerate(dense_ranks):
            scores[doc_idx] = scores.get(doc_idx, 0.0) + 1.0 / (k + rank_idx + 1)
        for rank_idx, doc_idx in enumerate(sparse_ranks):
            scores[doc_idx] = scores.get(doc_idx, 0.0) + 1.0 / (k + rank_idx + 1)
        return scores

    @classmethod
    def _retrieve_legacy(
        cls, 
        query: str, 
        child_chunks: List[Dict[str, Any]], 
        top_n: int = 15
    ) -> List[Tuple[Dict[str, Any], float]]:
        if not child_chunks:
            return []
            
        sparse = SparseBM25Retriever(child_chunks)
        sparse_scores = sparse.get_scores(query)
        sparse_ranks = [idx for idx, _ in sorted(sparse_scores, key=lambda x: x[1], reverse=True)]
        
        dense = NeuralDenseRetriever(child_chunks)
        dense_scores = dense.get_scores(query)
        dense_ranks = [idx for idx, _ in sorted(dense_scores, key=lambda x: x[1], reverse=True)]
        
        rrf_scores = cls.rrf(dense_ranks, sparse_ranks, k=60)
        sorted_rrf = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        
        return [(child_chunks[doc_idx], score) for doc_idx, score in sorted_rrf]
