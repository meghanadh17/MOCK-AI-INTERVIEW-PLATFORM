import logging
from typing import List, Tuple, Any

logger = logging.getLogger(__name__)

# Try loading faiss
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False


class FAISSStore:
    """Manages in-memory fast similarity indexing using FAISS indices, with a robust numpy fallback."""
    
    def __init__(self):
        self.index = None
        self.embeddings_matrix = None
        logger.info("Initializing FAISS in-memory store.")

    def build_index(self, embeddings: List[List[float]]) -> None:
        """Builds a FAISS Index matrix. Normalizes embeddings for Cosine similarity equivalence."""
        if not embeddings:
            return
            
        import numpy as np
        self.embeddings_matrix = np.array(embeddings).astype("float32")
        
        # Normalize embeddings for Cosine similarity equivalent inner product search
        norms = np.linalg.norm(self.embeddings_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.embeddings_matrix = self.embeddings_matrix / norms
        
        if FAISS_AVAILABLE:
            try:
                dimension = self.embeddings_matrix.shape[1]
                # HNSW index for high performance approximate search
                self.index = faiss.IndexHNSWFlat(dimension, 32)
                self.index.add(self.embeddings_matrix)
                logger.info(f"FAISSStore: Successfully built HNSW index with {len(embeddings)} items.")
                return
            except Exception as e:
                logger.error(f"FAISSStore: Failed to build HNSW index: {e}. NumPy fallback enabled.")
                self.index = None
                
        logger.info(f"FAISSStore (Fallback): Built in-memory matrix with {len(embeddings)} items.")

    def search(self, query_vector: List[float], top_k: int = 5) -> List[Tuple[int, float]]:
        """Searches the index and returns list of Tuple[index, similarity_score]."""
        if self.embeddings_matrix is None or len(self.embeddings_matrix) == 0:
            return []
            
        import numpy as np
        query_np = np.array(query_vector).astype("float32")
        q_norm = np.linalg.norm(query_np)
        if q_norm > 0:
            query_np = query_np / q_norm
            
        if FAISS_AVAILABLE and self.index is not None:
            try:
                # FAISS expects 2D float32 array for query vectors
                D, I = self.index.search(np.expand_dims(query_np, axis=0), top_k)
                results = []
                for idx, dist in zip(I[0], D[0]):
                    if idx != -1:
                        results.append((int(idx), float(dist)))
                return results
            except Exception as e:
                logger.error(f"FAISSStore: Search failed: {e}. Using numpy fallback.")
                
        # Fallback numpy inner product matching (equivalent to Cosine similarity on normalized vectors)
        scores = np.dot(self.embeddings_matrix, query_np)
        # Sort by score descending
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(idx), float(scores[idx])) for idx in top_indices]
