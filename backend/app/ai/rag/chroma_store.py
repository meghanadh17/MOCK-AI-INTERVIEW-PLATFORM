import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Try loading chromadb
try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False


class ChromaStore:
    """Manages persistent collection storage inside ChromaDB, with a robust dictionary-based fallback."""
    
    # Class-level fallback database to persist state across instances
    _fallback_db_collections: Dict[str, Dict[str, Dict[str, Any]]] = {}
    
    def __init__(self, collection_name: str = "resumes"):
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        
        # Reference the class-level fallback cache for this collection
        if collection_name not in self._fallback_db_collections:
            self._fallback_db_collections[collection_name] = {}
        self._fallback_db = self._fallback_db_collections[collection_name]
        
        if CHROMA_AVAILABLE:
            try:
                # Persistent DB inside standard data directory
                self.client = chromadb.PersistentClient(path='./data/chroma')
                self.collection = self.client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info(f"ChromaStore: Connected to persistent collection '{collection_name}' successfully.")
            except Exception as e:
                logger.warning(f"ChromaStore: Failed to initialize persistent client: {e}. Falling back to in-memory store.")
                self.client = None
                self.collection = None

    def add_documents(
        self, 
        ids: List[str], 
        documents: List[str], 
        embeddings: List[List[float]], 
        metadatas: List[Dict[str, Any]]
    ) -> None:
        """Adds documents along with their embeddings and metadata to ChromaDB or in-memory fallback."""
        if not ids:
            return
            
        if self.collection is not None:
            try:
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    embeddings=embeddings,
                    metadatas=metadatas
                )
                logger.info(f"ChromaStore: Added {len(documents)} documents to ChromaDB.")
                return
            except Exception as e:
                logger.error(f"ChromaStore: Failed to add documents to ChromaDB: {e}. Writing to fallback database.")
                
        # Write to in-memory fallback database
        for doc_id, doc_text, doc_emb, doc_meta in zip(ids, documents, embeddings, metadatas):
            self._fallback_db[doc_id] = {
                "id": doc_id,
                "document": doc_text,
                "embedding": doc_emb,
                "metadata": doc_meta
            }
        logger.info(f"ChromaStore (Fallback): Added {len(documents)} documents to in-memory database.")

    def query(
        self, 
        query_embeddings: List[List[float]], 
        limit: int = 5, 
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[Any]]:
        """Queries the vector database using query embeddings."""
        if not query_embeddings:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
            
        if self.collection is not None:
            try:
                results = self.collection.query(
                    query_embeddings=query_embeddings,
                    n_results=limit,
                    where=where
                )
                # Ensure distance metrics are returned, mapping to cosine distance
                if "distances" not in results or results["distances"] is None:
                    results["distances"] = [[0.0] * len(ids) for ids in results.get("ids", [[]])]
                return results
            except Exception as e:
                logger.error(f"ChromaStore: Query failed: {e}. Falling back to in-memory search.")
                
        # Fallback in-memory Cosine similarity search using numpy
        import numpy as np
        query_emb = np.array(query_embeddings[0])
        q_norm = np.linalg.norm(query_emb)
        if q_norm == 0:
            q_norm = 1.0
            
        candidates = []
        for doc_id, doc in self._fallback_db.items():
            # Check filters (where)
            if where:
                match = True
                for k, v in where.items():
                    if doc["metadata"].get(k) != v:
                        match = False
                        break
                if not match:
                    continue
                    
            doc_emb = np.array(doc["embedding"])
            d_norm = np.linalg.norm(doc_emb)
            if d_norm == 0:
                d_norm = 1.0
                
            # Compute cosine similarity
            similarity = np.dot(query_emb, doc_emb) / (q_norm * d_norm)
            # Convert cosine similarity to cosine distance (distance = 1.0 - similarity)
            distance = 1.0 - similarity
            candidates.append((doc_id, doc["document"], doc["metadata"], distance))
            
        # Sort by distance ascending (closer matches first)
        candidates = sorted(candidates, key=lambda x: x[3])[:limit]
        
        ids = [c[0] for c in candidates]
        documents = [c[1] for c in candidates]
        metadatas = [c[2] for c in candidates]
        distances = [c[3] for c in candidates]
        
        return {
            "ids": [ids],
            "documents": [documents],
            "metadatas": [metadatas],
            "distances": [distances]
        }

    def get(self, ids: List[str]) -> Dict[str, List[Any]]:
        """Retrieves documents directly by their ID."""
        if self.collection is not None:
            try:
                return self.collection.get(ids=ids)
            except Exception as e:
                logger.error(f"ChromaStore: Direct get failed: {e}. Falling back to in-memory lookup.")
                
        # Fallback lookup
        documents = []
        metadatas = []
        found_ids = []
        for doc_id in ids:
            if doc_id in self._fallback_db:
                found_ids.append(doc_id)
                documents.append(self._fallback_db[doc_id]["document"])
                metadatas.append(self._fallback_db[doc_id]["metadata"])
        return {
            "ids": found_ids,
            "documents": documents,
            "metadatas": metadatas
        }

    def delete_by_resume(self, resume_id: str) -> None:
        """Deletes all documents associated with a specific resume_id."""
        if self.collection is not None:
            try:
                self.collection.delete(where={"resume_id": resume_id})
                logger.info(f"ChromaStore: Deleted documents for resume_id '{resume_id}' from collection '{self.collection_name}'.")
                return
            except Exception as e:
                logger.error(f"ChromaStore: Failed to delete documents for resume_id '{resume_id}': {e}.")
        
        # Fallback in-memory delete
        to_delete = [doc_id for doc_id, doc in self._fallback_db.items() if doc["metadata"].get("resume_id") == resume_id]
        for doc_id in to_delete:
            del self._fallback_db[doc_id]
        logger.info(f"ChromaStore (Fallback): Deleted {len(to_delete)} documents for resume_id '{resume_id}'.")

