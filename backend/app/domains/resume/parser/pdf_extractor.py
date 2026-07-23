import os
import logging
import base64
import io
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Try optional imports for PDF and OCR processing
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    fitz = None
    PYMUPDF_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    pdfplumber = None
    PDFPLUMBER_AVAILABLE = False

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    pytesseract = None
    PYTESSERACT_AVAILABLE = False

try:
    from easyocr import Reader
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    np = None
    NUMPY_AVAILABLE = False


class ExtractionStrategy(Enum):
    NATIVE     = 'native'
    VISUAL     = 'visual'
    LAYOUT_AI  = 'layout_ai'
    OCR        = 'ocr'
    VISION_LLM = 'vision_llm'


@dataclass
class ExtractionResult:
    text: str
    strategy: ExtractionStrategy
    confidence: float
    page_count: int
    sections: dict[str, str] = field(default_factory=dict)
    tables: list[list[list[str]]] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class MultiStrategyPDFExtractor:
    """
    Production-grade PDF extractor using the same multi-strategy approach
    used by Google Document AI and Anthropic Claude document processing.
    Automatically selects or ensembles the best extraction strategy.
    """

    CONFIDENCE_THRESHOLD = 0.80
    HEADING_SIZE_RATIO   = 1.15   # font > body_avg * 1.15 → heading

    def __init__(self, mistral_client=None):
        self.ocr_reader = None
        if EASYOCR_AVAILABLE:
            try:
                # Initialize reader silently in CPU-only mode by default for server reliability
                self.ocr_reader = Reader(['en'], gpu=False)
            except Exception as e:
                logger.warning(f"Could not initialize EasyOCR Reader: {str(e)}")
        self.mistral_client = mistral_client

    async def extract(self, pdf_bytes: bytes) -> ExtractionResult:
        """Orchestrates multi-strategy extraction with confidence-based selection."""
        import time
        start_time = time.time()
        results = []

        # Strategy 1: Native digital text (fastest, most accurate for digital PDFs)
        native = await self._extract_native(pdf_bytes)
        results.append(native)
        if native.confidence >= 0.92:
            logger.info(f"Native strategy succeeded with high confidence ({native.confidence:.2f}) in {int((time.time() - start_time) * 1000)}ms")
            return native

        # Strategy 2: Visual layout extraction for complex multi-column PDFs
        visual = await self._extract_visual(pdf_bytes)
        results.append(visual)
        if visual.confidence >= 0.90:
            logger.info(f"Visual layout strategy succeeded with high confidence ({visual.confidence:.2f}) in {int((time.time() - start_time) * 1000)}ms")
            return visual

        # Strategy 3: OCR fallback for scanned documents
        if native.confidence < 0.60 or visual.confidence < 0.60:  # Likely a scanned doc
            ocr = await self._extract_ocr(pdf_bytes)
            results.append(ocr)
            if ocr.confidence >= self.CONFIDENCE_THRESHOLD:
                logger.info(f"OCR strategy succeeded with acceptable confidence ({ocr.confidence:.2f}) in {int((time.time() - start_time) * 1000)}ms")
                return ocr

        # Strategy 4: Vision LLM for low-confidence/complex multi-page documents
        best = max(results, key=lambda r: r.confidence)
        if best.confidence < self.CONFIDENCE_THRESHOLD and self.mistral_client:
            vision = await self._extract_vision_llm(pdf_bytes)
            results.append(vision)

        final_result = max(results, key=lambda r: r.confidence)
        logger.info(f"Multi-strategy extraction resolved strategy '{final_result.strategy.value}' in {int((time.time() - start_time) * 1000)}ms total.")
        return final_result

    def xy_cut_sort(self, blocks: List[Dict[str, Any]], tolerance: float = 3.0) -> List[Dict[str, Any]]:
        """
        Recursive XY-Cut algorithm to sort PDF text blocks by visual reading order.
        Guarantees that left-to-right columns and top-to-bottom flows are read correctly.
        """
        if len(blocks) <= 1:
            return blocks

        # Try horizontal split (find vertical columns/gutters) first to segment columns
        blocks_sorted_x = sorted(blocks, key=lambda b: b['bbox'][0])
        split_x = None
        max_gap = 0.0
        
        running_x1 = blocks_sorted_x[0]['bbox'][2]
        for i in range(1, len(blocks_sorted_x)):
            curr_x0 = blocks_sorted_x[i]['bbox'][0]
            gap = curr_x0 - running_x1
            if gap >= tolerance:
                if gap > max_gap:
                    max_gap = gap
                    split_x = running_x1 + gap / 2.0
            running_x1 = max(running_x1, blocks_sorted_x[i]['bbox'][2])
            
        if split_x is not None:
            left_blocks = [b for b in blocks if b['bbox'][2] <= split_x]
            right_blocks = [b for b in blocks if b['bbox'][0] >= split_x]
            # Ensure split is clean and covers all blocks to avoid loops
            if left_blocks and right_blocks and (len(left_blocks) + len(right_blocks) == len(blocks)):
                return self.xy_cut_sort(left_blocks, tolerance) + self.xy_cut_sort(right_blocks, tolerance)

        # Try vertical split (find horizontal blank spaces between blocks) second
        blocks_sorted_y = sorted(blocks, key=lambda b: b['bbox'][1])
        split_y = None
        max_gap = 0.0
        
        running_y1 = blocks_sorted_y[0]['bbox'][3]
        for i in range(1, len(blocks_sorted_y)):
            curr_y0 = blocks_sorted_y[i]['bbox'][1]
            gap = curr_y0 - running_y1
            if gap >= tolerance:
                if gap > max_gap:
                    max_gap = gap
                    split_y = running_y1 + gap / 2.0
            running_y1 = max(running_y1, blocks_sorted_y[i]['bbox'][3])
            
        if split_y is not None:
            top_blocks = [b for b in blocks if b['bbox'][3] <= split_y]
            bottom_blocks = [b for b in blocks if b['bbox'][1] >= split_y]
            # Ensure split is clean and covers all blocks to avoid loops
            if top_blocks and bottom_blocks and (len(top_blocks) + len(bottom_blocks) == len(blocks)):
                return self.xy_cut_sort(top_blocks, tolerance) + self.xy_cut_sort(bottom_blocks, tolerance)

        # Fallback sorting: top-to-bottom, left-to-right (grouping lines within 5px tolerance)
        return sorted(blocks, key=lambda b: (round(b['bbox'][1] / 5.0) * 5.0, b['bbox'][0]))

    def _normalize_section(self, header_text: str) -> str:
        """Map extracted raw headings to standardized upper-case section keys."""
        text = header_text.strip().lower()
        # Clean leading/trailing punctuation and numbers
        text = re.sub(r'[:\-\s\d\.\#]+$', '', text)
        text = re.sub(r'^[:\-\s\d\.\#]+', '', text).strip()
        
        section_map = {
            'SUMMARY': ['summary', 'profile', 'objective', 'about me', 'professional summary', 'career objective', 'synopsis', 'intro', 'introduction'],
            'EXPERIENCE': ['experience', 'work experience', 'employment history', 'professional experience', 'work history', 'career history', 'experience history', 'employment', 'background', 'professional background'],
            'EDUCATION': ['education', 'academic background', 'education background', 'academic history', 'education history', 'studies', 'qualifications', 'academic credentials', 'educational history'],
            'SKILLS': ['skills', 'technical skills', 'skills & expertise', 'core technologies', 'technologies', 'expertise', 'specialties', 'skills summary', 'core competencies', 'key skills', 'competencies', 'skills and tools', 'skills & tools'],
            'PROJECTS': ['projects', 'personal projects', 'key projects', 'academic projects', 'featured projects', 'accomplishments', 'selected projects'],
            'CERTIFICATIONS': ['certifications', 'licenses', 'certificates', 'certifications & licenses', 'accreditations'],
            'LANGUAGES': ['languages', 'languages spoken', 'language proficiency'],
        }
        
        for std_key, aliases in section_map.items():
            if text in aliases:
                return std_key
            for alias in aliases:
                if alias in text and len(text) < len(alias) + 10:
                    return std_key
        
        return header_text.upper()

    async def _extract_native(self, pdf_bytes: bytes) -> ExtractionResult:
        """PyMuPDF native extraction with visual column-sorting and heading classification."""
        if not PYMUPDF_AVAILABLE:
            logger.error("PyMuPDF not available. Native strategy returning empty.")
            return ExtractionResult(text="", strategy=ExtractionStrategy.NATIVE, confidence=0.0, page_count=0)

        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        try:
            full_text = ''
            sections = {}
            current_section = 'HEADER'
            all_font_sizes = []
            metadata = {}

            # Harvest metadata safely
            if doc.metadata:
                metadata = {
                    "author": doc.metadata.get("author") or "",
                    "title": doc.metadata.get("title") or "",
                    "creator": doc.metadata.get("creator") or "",
                    "producer": doc.metadata.get("producer") or "",
                    "creationDate": doc.metadata.get("creationDate") or "",
                    "modDate": doc.metadata.get("modDate") or "",
                }

            # 1. First pass: scan font sizes to detect body text size dynamically
            for page in doc:
                try:
                    blocks = page.get_text('dict')['blocks']
                    for block in blocks:
                        if block.get('type') != 0:
                            continue
                        for line in block.get('lines', []):
                            for span in line.get('spans', []):
                                if span.get('text', '').strip():
                                    all_font_sizes.append(span.get('size', 10.0))
                except Exception as e:
                    logger.error(f"Error parsing font sizes from page: {str(e)}")

            # Use the most frequent font size as body font size (falls back to median or 10.0)
            if all_font_sizes:
                body_size = max(set(all_font_sizes), key=all_font_sizes.count)
            else:
                body_size = 10.0

            # 2. Second pass: extract text utilizing column sorting and section categorization
            for page in doc:
                try:
                    blocks = page.get_text('dict', flags=fitz.TEXT_PRESERVE_WHITESPACE)['blocks']
                    text_blocks = [b for b in blocks if b.get('type') == 0]
                    
                    # Sort blocks using visual XY-Cut to preserve multi-column reading order
                    sorted_blocks = self.xy_cut_sort(text_blocks)
                    
                    for block in sorted_blocks:
                        for line in block.get('lines', []):
                            line_text = ''
                            is_heading = False
                            for span in line.get('spans', []):
                                size = span.get('size', 10.0)
                                bold = 'bold' in span.get('font', '').lower()
                                text = span.get('text', '').strip()
                                if text:
                                    if size > body_size * self.HEADING_SIZE_RATIO or (bold and size >= body_size):
                                        is_heading = True
                                    line_text += text + ' '
                                    
                            line_text = line_text.strip()
                            if not line_text:
                                continue
                                
                            normalized = self._normalize_section(line_text)
                            is_standard = normalized in ['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS', 'PROJECTS', 'CERTIFICATIONS', 'LANGUAGES', 'AWARDS', 'ORGANIZATIONS', 'PUBLICATIONS', 'INTERESTS', 'VOLUNTEERING']
                            
                            if is_standard:
                                current_section = normalized
                                sections[current_section] = sections.get(current_section, '')
                                full_text += f"\n{current_section}\n"
                            else:
                                sections.setdefault(current_section, '')
                                sections[current_section] += line_text + '\n'
                                full_text += line_text + '\n'
                except Exception as e:
                    logger.error(f"Error parsing text blocks from page: {str(e)}")

            # Calculate extraction confidence
            words = len(full_text.split())
            confidence = 0.0
            if words > 30:
                # Digital document check: ratio of letters to total chars
                letters_ratio = sum(1 for c in full_text if c.isalpha()) / len(full_text) if len(full_text) > 0 else 0.0
                confidence = min(0.75 + (len(sections) / 20.0) + (words / 2500.0), 0.99)
                if letters_ratio < 0.60:  # Signs of corrupt character sets
                    confidence *= 0.70

            return ExtractionResult(
                text=full_text,
                strategy=ExtractionStrategy.NATIVE,
                confidence=confidence,
                page_count=len(doc),
                sections=sections,
                metadata=metadata
            )
        finally:
            doc.close()

    def _format_table_as_markdown(self, table: List[List[str]]) -> str:
        """Formats a 2D matrix representing a PDF table into Markdown table syntax."""
        if not table or not any(table):
            return ""
        clean_table = [[str(cell or "").strip().replace("\n", " ") for cell in row] for row in table]
        clean_table = [row for row in clean_table if any(cell for cell in row)]
        if not clean_table:
            return ""
            
        col_widths = [max(len(cell) for cell in col) for col in zip(*clean_table)]
        markdown = []
        
        # Header
        headers = clean_table[0]
        header_line = "| " + " | ".join(f"{h:<{col_widths[i]}}" for i, h in enumerate(headers)) + " |"
        markdown.append(header_line)
        
        # Separator
        separator_line = "| " + " | ".join("-" * col_widths[i] for i in range(len(col_widths))) + " |"
        markdown.append(separator_line)
        
        # Data rows
        for row in clean_table[1:]:
            if len(row) < len(headers):
                row += [""] * (len(headers) - len(row))
            elif len(row) > len(headers):
                row = row[:len(headers)]
            row_line = "| " + " | ".join(f"{cell:<{col_widths[i]}}" for i, cell in enumerate(row)) + " |"
            markdown.append(row_line)
            
        return "\n" + "\n".join(markdown) + "\n"

    async def _extract_visual(self, pdf_bytes: bytes) -> ExtractionResult:
        """Visual layout extraction via pdfplumber to handle columns and format tables as Markdown."""
        if not PDFPLUMBER_AVAILABLE:
            logger.error("pdfplumber not available. Visual strategy returning empty.")
            return ExtractionResult(text="", strategy=ExtractionStrategy.VISUAL, confidence=0.0, page_count=0)

        full_text = ""
        page_count = 0
        tables = []
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                page_count = len(pdf.pages)
                for page in pdf.pages:
                    # Extract page layout preserving text flow
                    page_text = page.extract_text(layout=True)
                    if page_text:
                        full_text += page_text + "\n"
                    
                    # Extract tabular matrices with multiple strategies
                    try:
                        page_tables = page.extract_tables()
                        for table in page_tables:
                            if table:
                                formatted_table = self._format_table_as_markdown(table)
                                if formatted_table:
                                    full_text += formatted_table + "\n"
                                tables.append(table)
                    except Exception as table_err:
                        logger.warning(f"Visual table extraction skipped on page: {str(table_err)}")
        except Exception as e:
            logger.error(f"pdfplumber visual extract failed: {str(e)}")

        words = len(full_text.split())
        confidence = min(0.65 + words / 3000.0, 0.93) if words > 50 else 0.0

        return ExtractionResult(
            text=full_text,
            strategy=ExtractionStrategy.VISUAL,
            confidence=confidence,
            page_count=page_count,
            tables=tables
        )

    def _deskew_image(self, gray):
        """Detect text skew angle and rotate to align vertically."""
        if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
            return gray
        try:
            # Threshold the image: text becomes white, background black
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
            
            # Find all coordinates where pixel is text (white)
            coords = np.column_stack(np.where(thresh > 0))
            if len(coords) < 10:
                return gray
                
            # Get the minimum bounding rect of all text pixels
            rect = cv2.minAreaRect(coords)
            angle = rect[-1]
            
            # minAreaRect returns angle in range [-90, 0) in older opencv or [0, 90] in newer ones
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle
                
            # Only rotate if skew is significant but realistic
            if 0.5 <= abs(angle) <= 15:
                h, w = gray.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
                logger.info(f"Deskewed scanned page by {angle:.2f} degrees.")
                return rotated
        except Exception as deskew_err:
            logger.warning(f"Deskewing failed, proceeding with original grayscale image: {str(deskew_err)}")
        return gray

    async def _extract_ocr(self, pdf_bytes: bytes) -> ExtractionResult:
        """OCR fallback: render at 300 DPI, apply CLAHE + deskewing + binarization, then OCR ensemble."""
        if not PYMUPDF_AVAILABLE:
            logger.error("PyMuPDF not available. OCR fallback strategy returning empty.")
            return ExtractionResult(text="", strategy=ExtractionStrategy.OCR, confidence=0.0, page_count=0)

        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        try:
            page_count = len(doc)
            full_text = ''
            
            if CV2_AVAILABLE and NUMPY_AVAILABLE:
                mat = fitz.Matrix(300 / 72, 300 / 72)  # 300 DPI upscale matrix
                for page in doc:
                    try:
                        pix = page.get_pixmap(matrix=mat)
                        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                        
                        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to enhance text contrast
                        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                        gray = clahe.apply(gray)
                        
                        # Apply deskewing to align text lines horizontally
                        gray = self._deskew_image(gray)
                        
                        # Upscale slightly for text line sharpness
                        resized = cv2.resize(gray, None, fx=1.2, fy=1.2, interpolation=cv2.INTER_CUBIC)
                        
                        # Denoise using bilateral filter to preserve edges
                        denoised = cv2.bilateralFilter(resized, 9, 75, 75)
                        
                        # Apply adaptive binarization to highlight characters cleanly
                        binarized = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
                        
                        tess_text = ''
                        if PYTESSERACT_AVAILABLE:
                            try:
                                tess_text = pytesseract.image_to_string(binarized, config='--psm 6')
                            except Exception as e:
                                logger.error(f"Pytesseract OCR execution failed: {str(e)}")
                                
                        easy_text = ''
                        if self.ocr_reader:
                            try:
                                easy_results = self.ocr_reader.readtext(binarized, detail=0, paragraph=True)
                                easy_text = ' '.join(easy_results)
                            except Exception as e:
                                logger.error(f"EasyOCR OCR execution failed: {str(e)}")
                                
                        # Pick the more comprehensive text output
                        page_text = tess_text if len(tess_text) > len(easy_text) else easy_text
                        full_text += page_text + '\n'
                    except Exception as e:
                        logger.error(f"Failed to process page index {page.number} during OCR: {str(e)}")
            else:
                logger.warning("Numpy or OpenCV-python not available. OCR cannot run. Falling back to basic native text.")
                for page in doc:
                    full_text += page.get_text() + '\n'

            words = len(full_text.split())
            confidence = min(0.60 + words / 3000.0, 0.88)
            
            return ExtractionResult(
                text=full_text,
                strategy=ExtractionStrategy.OCR,
                confidence=confidence,
                page_count=page_count
            )
        finally:
            doc.close()

    async def _extract_vision_llm(self, pdf_bytes: bytes) -> ExtractionResult:
        """Vision LLM strategy: Render up to first 3 pages of PDF to image and extract content via Mistral."""
        if not PYMUPDF_AVAILABLE:
            logger.error("PyMuPDF not available. Vision LLM strategy returning empty.")
            return ExtractionResult(text="", strategy=ExtractionStrategy.VISION_LLM, confidence=0.0, page_count=0)

        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        try:
            page_count = len(doc)
            if page_count == 0:
                return ExtractionResult(text="", strategy=ExtractionStrategy.VISION_LLM, confidence=0.0, page_count=0)
                
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Extract all text content from the following resume images with formatting and headings preserved. "
                                "Integrate the content from all pages in logical reading order. "
                                "Do not add any preamble, greeting, or extra formatting. Output the raw text of the resume."
                            )
                        }
                    ]
                }
            ]
            
            # Process up to the first 3 pages
            for i in range(min(page_count, 3)):
                page = doc[i]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_bytes = pix.tobytes("png")
                base64_image = base64.b64encode(img_bytes).decode("utf-8")
                messages[0]["content"].append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{base64_image}"
                    }
                })
            
            text = ""
            confidence = 0.0
            try:
                response = await self.mistral_client.chat_completion(
                    messages=messages,
                    temperature=0.1
                )
                text = response["choices"][0]["message"]["content"]
                confidence = 0.95
                logger.info("Mistral Vision LLM API successfully extracted the resume images.")
            except Exception as e:
                logger.error(f"Mistral Vision LLM API call failed: {str(e)}")
                
            return ExtractionResult(
                text=text,
                strategy=ExtractionStrategy.VISION_LLM,
                confidence=confidence,
                page_count=page_count
            )
        finally:
            doc.close()
