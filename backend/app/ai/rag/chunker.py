import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Resilient LangChain imports with pure-Python fallback splitters
try:
    from langchain_textsplitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        RecursiveCharacterTextSplitter = None


class FallbackRecursiveCharacterTextSplitter:
    """Pure-Python fallback implementation of RecursiveCharacterTextSplitter for environment resilience."""
    def __init__(self, chunk_size: int = 1024, chunk_overlap: int = 128, separators: List[str] = None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        return self._split(text, self.separators)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text.strip()] if text.strip() else []

        if not separators:
            # Hard cutoff split if no separators are left
            step = self.chunk_size - self.chunk_overlap
            if step <= 0:
                step = self.chunk_size
            return [text[i:i+self.chunk_size].strip() for i in range(0, len(text), step)]

        separator = separators[0]
        next_separators = separators[1:]

        if separator == "":
            splits = list(text)
        else:
            splits = text.split(separator)

        final_chunks = []
        current_chunk = []
        current_length = 0

        for split in splits:
            # Re-append separator to keep formatting context
            item = split + separator if separator != "" else split
            if len(item) > self.chunk_size:
                if current_chunk:
                    final_chunks.append("".join(current_chunk))
                    current_chunk = []
                    current_length = 0
                final_chunks.extend(self._split(split, next_separators))
            else:
                if current_length + len(item) <= self.chunk_size:
                    current_chunk.append(item)
                    current_length += len(item)
                else:
                    if current_chunk:
                        final_chunks.append("".join(current_chunk))
                    
                    # Overlap backtracking
                    overlap_chunk = []
                    overlap_len = 0
                    for prev_item in reversed(current_chunk):
                        if overlap_len + len(prev_item) <= self.chunk_overlap:
                            overlap_chunk.insert(0, prev_item)
                            overlap_len += len(prev_item)
                        else:
                            break
                    current_chunk = overlap_chunk + [item]
                    current_length = overlap_len + len(item)

        if current_chunk:
            final_chunks.append("".join(current_chunk))

        cleaned_chunks = []
        for chunk in final_chunks:
            chunk_str = chunk
            if separator != "" and chunk_str.endswith(separator):
                chunk_str = chunk_str[:-len(separator)]
            if chunk_str.strip():
                cleaned_chunks.append(chunk_str.strip())

        return cleaned_chunks


# Bind splitter based on availability
if RecursiveCharacterTextSplitter is None:
    logger.warning("Langchain text splitter not found. Using high-fidelity pure-Python fallback text splitter.")
    RecursiveCharacterTextSplitter = FallbackRecursiveCharacterTextSplitter


@dataclass
class Chunk:
    id: str
    text: str
    section: str
    chunk_index: int
    parent_id: str | None        # Parent chunk for hierarchical retrieval
    metadata: dict
    embedding: list[float] | None = None


class HierarchicalSemanticChunker:
    """
    Produces parent (large) + child (small) chunk pairs.
    Retrieval: search child chunks -> return parent context.
    This is the 'parent document retriever' pattern used in
    production RAG systems (LangChain, LlamaIndex, Anthropic).
    """

    PARENT_CHUNK_SIZE   = 1024   # characters: broader context
    PARENT_CHUNK_OVERLAP = 128
    CHILD_CHUNK_SIZE    = 256    # characters: precise retrieval target
    CHILD_CHUNK_OVERLAP = 32

    RESUME_SECTION_MARKERS = [
        'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT',
        'EDUCATION', 'ACADEMIC',
        'SKILLS', 'TECHNICAL SKILLS', 'TECHNOLOGIES',
        'PROJECTS', 'PERSONAL PROJECTS',
        'CERTIFICATIONS', 'ACHIEVEMENTS', 'AWARDS',
        'SUMMARY', 'PROFILE', 'OBJECTIVE',
        'PUBLICATIONS', 'RESEARCH',
    ]

    def __init__(self):
        self.parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.PARENT_CHUNK_SIZE,
            chunk_overlap=self.PARENT_CHUNK_OVERLAP,
            separators=['\n\n', '\n', '. ', ' ', '']
        )
        self.child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.CHILD_CHUNK_SIZE,
            chunk_overlap=self.CHILD_CHUNK_OVERLAP,
            separators=['\n\n', '\n', '. ', ' ', '']
        )

    def chunk_resume(self, sections: dict[str, str], user_id: str, resume_id: Optional[str] = None) -> list[Chunk]:
        chunks, chunk_idx = [], 0
        for section_name, content in sections.items():
            if not content.strip():
                continue
            # Split into parent chunks
            parent_texts = self.parent_splitter.split_text(content)
            for p_i, parent_text in enumerate(parent_texts):
                parent_id = f'{user_id}:{section_name}:parent:{p_i}'
                chunks.append(Chunk(
                    id=parent_id, text=parent_text,
                    section=section_name, chunk_index=chunk_idx,
                    parent_id=None,
                    metadata={'type': 'parent', 'user_id': user_id, 'section': section_name, 'resume_id': resume_id or ""}
                ))
                chunk_idx += 1
                
                # Split parent into child chunks
                child_texts = self.child_splitter.split_text(parent_text)
                
                # If child_texts count is low, apply sentence-boundary segmentation to ensure fine-grained child retrieval
                if len(child_texts) <= 1:
                    sentences = re.split(r"(?<=[.!?])\s+", parent_text)
                    child_texts = [s.strip() for s in sentences if len(s.strip()) > 5]

                for c_i, child_text in enumerate(child_texts):
                    child_id = f'{parent_id}:child:{c_i}'
                    chunks.append(Chunk(
                        id=child_id, text=child_text,
                        section=section_name, chunk_index=chunk_idx,
                        parent_id=parent_id,
                        metadata={
                            'type': 'child', 
                            'user_id': user_id,
                            'section': section_name, 
                            'parent_id': parent_id,
                            'resume_id': resume_id or ""
                        }
                    ))
                    chunk_idx += 1
        return chunks


class HierarchicalChunker:
    """Wrapper class to preserve backward compatibility with the legacy dict-based RAG interface."""

    @staticmethod
    def chunk(text: str, user_id: str = "default_user", resume_id: Optional[str] = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        # 1. Detect sections from the raw text
        from app.domains.resume.parser.section_chunker import SectionChunker
        parent_sects, _ = SectionChunker.chunk_document(text)
        
        # Build sections map
        sections = {}
        for sect in parent_sects:
            sections[sect["section_name"]] = sect["text"]
            
        # 2. Run the upgraded HierarchicalSemanticChunker
        semantic_chunker = HierarchicalSemanticChunker()
        chunks = semantic_chunker.chunk_resume(sections, user_id, resume_id)
        
        # 3. Format into legacy Tuple[List[dict], List[dict]] structure
        parent_chunks = []
        child_chunks = []
        for c in chunks:
            c_dict = {
                "id": c.id,
                "text": c.text,
                "section": c.section,
                "chunk_index": c.chunk_index,
                "parent_id": c.parent_id,
                "metadata": c.metadata
            }
            if c.parent_id is None:
                parent_chunks.append(c_dict)
            else:
                child_chunks.append(c_dict)
                
        return parent_chunks, child_chunks
