import re
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

# Try optional heavy ML imports for production-grade Cross-Encoder
try:
    from sentence_transformers import CrossEncoder
    CROSS_ENCODER_AVAILABLE = True
except ImportError:
    CROSS_ENCODER_AVAILABLE = False

_cross_encoder_model = None

def get_cross_encoder_model(model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
    """Lazily loads the Cross-Encoder model for query-document relevance scoring."""
    global _cross_encoder_model
    if not CROSS_ENCODER_AVAILABLE:
        return None
    if _cross_encoder_model is None:
        try:
            logger.info(f"Loading CrossEncoder model: {model_name}")
            _cross_encoder_model = CrossEncoder(model_name)
        except Exception as e:
            logger.warning(f"Failed to load CrossEncoder model {model_name}: {e}. Dynamic fallback enabled.")
    return _cross_encoder_model


# List of high-value technical keywords to boost during semantic re-ranking fallback
TECH_BOOST_KEYWORDS = {
    # Programming Languages
    "python", "javascript", "typescript", "golang", "rust", "java", "c++", "c#", "ruby", "php", "sql", "html", "css",
    # Frameworks & Libraries
    "fastapi", "django", "flask", "react", "vue", "angular", "nextjs", "express", "spring", "laravel", "pytorch", "tensorflow",
    # Databases, Cache & Message Brokers
    "mysql", "postgresql", "sqlite", "redis", "mongodb", "elasticsearch", "cassandra", "dynamodb", "mariadb", "kafka", "rabbitmq",
    # DevOps, Clouds & Infrastructures
    "docker", "kubernetes", "aws", "gcp", "azure", "jenkins", "terraform", "ansible", "nginx", "git", "github", "gitlab",
    # Backend Architectures & Core Concepts
    "api", "rest", "graphql", "grpc", "ci/cd", "microservices", "async", "caching", "scaling", "concurrency", "databases"
}


class CrossEncoderReranker:
    """Re-ranks retrieved candidates using SBERT CrossEncoder or keyword-weighted overlap."""
    
    @staticmethod
    def rerank(
        query: str, 
        candidates_with_scores: List[Tuple[Dict[str, Any], float]], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        if not candidates_with_scores:
            return []
            
        logger.info(f"Re-ranking {len(candidates_with_scores)} candidate chunks for query: '{query}'")
        
        # Try neural Cross-Encoder re-ranking
        model = get_cross_encoder_model()
        if model is not None:
            try:
                pairs = [(query, chunk.get("text", "")) for chunk, _ in candidates_with_scores]
                scores = model.predict(pairs, show_progress_bar=False)
                re_ranked = []
                for (chunk, rrf_score), cross_score in zip(candidates_with_scores, scores):
                    # Normalize / blend: we sort primarily by CrossEncoder output score
                    re_ranked.append((chunk, float(cross_score)))
                re_ranked = sorted(re_ranked, key=lambda x: x[1], reverse=True)
                logger.info("Successfully re-ranked candidates using Neural CrossEncoder.")
                return [item[0] for item in re_ranked[:top_k]]
            except Exception as e:
                logger.error(f"Error during neural cross-encoder re-ranking: {e}. Falling back to keyword-boosted reranker.")
        
        # Fallback keyword-boosted re-ranking logic
        re_ranked = []
        q_words = set(re.findall(r"\w+", query.lower()))
        if not q_words:
            return [c[0] for c in candidates_with_scores[:top_k]]

        for chunk, rrf_score in candidates_with_scores:
            c_words = set(re.findall(r"\w+", chunk.get("text", "").lower()))
            
            # Calculate weighted overlap
            total_weight = 0.0
            overlap_weight = 0.0
            for q_word in q_words:
                # Assign higher importance weight to technical keywords
                weight = 3.0 if q_word in TECH_BOOST_KEYWORDS else 1.0
                total_weight += weight
                if q_word in c_words:
                    overlap_weight += weight
            
            overlap_ratio = overlap_weight / total_weight if total_weight > 0 else 0.0
            
            # Combine hybrid RRF score (40% weight) and semantic term overlap score (60% weight)
            score = rrf_score * 0.4 + overlap_ratio * 0.6
            re_ranked.append((chunk, score))
            
        re_ranked = sorted(re_ranked, key=lambda x: x[1], reverse=True)
        return [item[0] for item in re_ranked[:top_k]]
