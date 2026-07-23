import re
from typing import List, Dict, Any, Tuple


class SectionChunker:
    """Splits a document text into hierarchical parent sections and child sentences."""
    
    @staticmethod
    def chunk_document(text: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        sections = [
            "summary", "experience", "work history", "projects", 
            "education", "skills", "certifications", "languages"
        ]
        pattern = r"\b(" + "|".join(sections) + r")\b"
        
        matches = list(re.finditer(pattern, text, re.IGNORECASE))
        
        parent_chunks = []
        child_chunks = []
        
        if not matches:
            parent = {"id": 1, "section_name": "general", "text": text}
            parent_chunks.append(parent)
            sentences = re.split(r"(?<=[.!?])\s+", text)
            for s_idx, sentence in enumerate(sentences):
                if sentence.strip():
                    child_chunks.append({
                        "id": s_idx + 1,
                        "parent_id": 1,
                        "text": sentence.strip(),
                        "section_name": "general"
                    })
            return parent_chunks, child_chunks
            
        for i, match in enumerate(matches):
            section_name = match.group(0).lower()
            start_pos = match.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            
            section_text = text[start_pos:end_pos].strip()
            parent_id = i + 1
            
            parent_chunks.append({
                "id": parent_id,
                "section_name": section_name,
                "text": section_text
            })
            
            sentences = re.split(r"(?<=[.!?])\s+", section_text)
            for s_idx, sentence in enumerate(sentences):
                cleaned = sentence.strip()
                if cleaned and len(cleaned) > 5:
                    child_chunks.append({
                        "id": len(child_chunks) + 1,
                        "parent_id": parent_id,
                        "text": cleaned,
                        "section_name": section_name
                    })
                    
        return parent_chunks, child_chunks
