import re
import logging
from typing import List, Dict, Any, Set

logger = logging.getLogger(__name__)


class PromptCompressor:
    """Performs semantic sentence de-duplication and token pruning to optimize LLM context windows."""
    
    @staticmethod
    def compress_context(context_blocks: List[Dict[str, Any]], token_limit: int = 2000) -> str:
        """
        Compresses retrieved contexts by de-duplicating sentences and prioritizing
        most informative content. Token limit is estimated by character counts (1 token ≈ 4 chars).
        """
        if not context_blocks:
            return ""
            
        char_limit = token_limit * 4
        seen_sentence_norms: Set[str] = set()
        compressed_blocks: List[str] = []
        current_char_count = 0

        logger.info(f"Compressing {len(context_blocks)} context blocks. Character limit: {char_limit}")

        for block in context_blocks:
            if not isinstance(block, dict):
                continue
                
            child_text = str(block.get("text", "")).strip()
            parent_text = str(block.get("parent_text", "")).strip()
            
            # Prefer parent text as it has broader context, fallback to child text
            text_to_process = parent_text if parent_text else child_text
            if not text_to_process:
                continue

            # Split block text into sentences cleanly
            sentences = re.split(r"(?<=[.!?])\s+", text_to_process)
            cleaned_sentences = []
            
            for sentence in sentences:
                sentence_strip = sentence.strip()
                if not sentence_strip or len(sentence_strip) < 5:
                    continue
                
                # Standardize sentence for duplicate detection
                norm_sentence = re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", sentence_strip.lower())).strip()
                s_words = set(norm_sentence.split())
                if not s_words:
                    continue
                
                # Jaccard overlap check to drop highly-redundant sentences
                is_duplicate = False
                for seen in seen_sentence_norms:
                    seen_words = set(seen.split())
                    if not seen_words:
                        continue
                    overlap = len(s_words.intersection(seen_words))
                    union = len(s_words.union(seen_words))
                    if union > 0 and (overlap / union) > 0.75:
                        is_duplicate = True
                        break
                        
                if is_duplicate:
                    continue
                    
                seen_sentence_norms.add(norm_sentence)
                cleaned_sentences.append(sentence_strip)

            # Reconstruct block content
            block_content = " ".join(cleaned_sentences).strip()
            if not block_content:
                continue

            # Ensure we respect the context window limit
            if current_char_count + len(block_content) + 2 <= char_limit:
                compressed_blocks.append(block_content)
                current_char_count += len(block_content) + 2
            else:
                # Fill remaining space with sentence-level pieces if possible
                for sentence in cleaned_sentences:
                    if current_char_count + len(sentence) + 2 <= char_limit:
                        compressed_blocks.append(sentence)
                        current_char_count += len(sentence) + 2
                    else:
                        break
                break

        logger.info(f"Compressed context down to {current_char_count} characters (approx {current_char_count // 4} tokens).")
        return "\n\n".join(compressed_blocks)


# Module level export for direct import compatibility
compress_context = PromptCompressor.compress_context


