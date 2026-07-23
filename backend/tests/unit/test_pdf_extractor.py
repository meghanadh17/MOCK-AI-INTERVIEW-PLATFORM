import pytest
import io
import fitz
from app.domains.resume.parser.pdf_extractor import MultiStrategyPDFExtractor, ExtractionStrategy


def create_mock_two_column_pdf() -> bytes:
    """Generates a mock 2-column PDF in memory using PyMuPDF (fitz)."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 standard

    # 1. Header (spanning top)
    page.insert_text(fitz.Point(50, 50), "Jane Doe", fontsize=24, fontname="helv", color=(0, 0, 0))
    page.insert_text(fitz.Point(50, 75), "jane.doe@example.com | (123) 456-7890", fontsize=10, fontname="helv", color=(0, 0, 0))

    # 2. Summary (spanning)
    page.insert_text(fitz.Point(50, 110), "SUMMARY", fontsize=12, fontname="hebo", color=(0, 0, 0))
    page.insert_text(fitz.Point(50, 125), "Highly motivated backend engineer with expertise in Python API development.", fontsize=10, fontname="helv", color=(0, 0, 0))

    # 3. Two-Column Layout (Experience on Left, Skills & Education on Right)
    # Left column starting at x=50, ending around x=280
    page.insert_text(fitz.Point(50, 160), "WORK EXPERIENCE", fontsize=12, fontname="hebo", color=(0, 0, 0))
    
    page.insert_text(fitz.Point(50, 180), "Software Developer at DevShop", fontsize=10, fontname="hebo", color=(0, 0, 0))
    page.insert_text(fitz.Point(50, 195), "- Designed high-performance async APIs using FastAPI.", fontsize=10, fontname="helv", color=(0, 0, 0))
    page.insert_text(fitz.Point(50, 210), "- Scaled relational databases under high concurrency workloads.", fontsize=10, fontname="helv", color=(0, 0, 0))

    page.insert_text(fitz.Point(50, 240), "Backend Intern at CloudCo", fontsize=10, fontname="hebo", color=(0, 0, 0))
    page.insert_text(fitz.Point(50, 255), "- Optimized indexing schemas on MySQL databases.", fontsize=10, fontname="helv", color=(0, 0, 0))

    # Right column starting at x=350, ending around x=550
    page.insert_text(fitz.Point(350, 160), "TECHNICAL SKILLS", fontsize=12, fontname="hebo", color=(0, 0, 0))
    page.insert_text(fitz.Point(350, 180), "Languages: Python, JavaScript, SQL", fontsize=10, fontname="helv", color=(0, 0, 0))
    page.insert_text(fitz.Point(350, 195), "Frameworks: FastAPI, Django, React", fontsize=10, fontname="helv", color=(0, 0, 0))
    page.insert_text(fitz.Point(350, 210), "Tools: Docker, Git, MySQL, Redis", fontsize=10, fontname="helv", color=(0, 0, 0))

    page.insert_text(fitz.Point(350, 240), "EDUCATION HISTORY", fontsize=12, fontname="hebo", color=(0, 0, 0))
    page.insert_text(fitz.Point(350, 260), "B.S. in Computer Science", fontsize=10, fontname="hebo", color=(0, 0, 0))
    page.insert_text(fitz.Point(350, 275), "State University (Graduated 2021)", fontsize=10, fontname="helv", color=(0, 0, 0))

    # Save to bytes
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
async def test_pdf_extractor_native_column_sorting():
    pdf_bytes = create_mock_two_column_pdf()
    extractor = MultiStrategyPDFExtractor()

    # Run native extraction directly
    result = await extractor._extract_native(pdf_bytes)

    assert result.strategy == ExtractionStrategy.NATIVE
    assert result.confidence > 0.80
    assert result.page_count == 1
    
    # Check that sections were correctly normalized and matched
    print("\nSECTIONS MAP IS:", result.sections)
    assert "SUMMARY" in result.sections
    assert "EXPERIENCE" in result.sections
    assert "SKILLS" in result.sections
    assert "EDUCATION" in result.sections

    # Check content in sections to ensure column text was not interleaved
    experience_text = result.sections["EXPERIENCE"]
    assert "FastAPI" in experience_text
    assert "relational databases" in experience_text
    # Experience column should NOT contain skills or education column text (e.g. State University)
    assert "State University" not in experience_text
    assert "Languages: Python" not in experience_text

    skills_text = result.sections["SKILLS"]
    assert "Languages: Python" in skills_text
    assert "DevShop" not in skills_text


def test_format_table_as_markdown():
    extractor = MultiStrategyPDFExtractor()
    table = [
        ["Company", "Role", "Years"],
        ["TechCorp", "Engineer", "2"],
        ["DevShop", "Intern", "1"]
    ]
    markdown = extractor._format_table_as_markdown(table)
    
    assert "| Company  | Role     | Years |" in markdown
    assert "| -------- | -------- | ----- |" in markdown
    assert "| TechCorp | Engineer | 2     |" in markdown
    assert "| DevShop  | Intern   | 1     |" in markdown


def test_xy_cut_sort_horizontal_vertical_gutters():
    extractor = MultiStrategyPDFExtractor()
    
    # Create mock blocks with bounding boxes: (x0, y0, x1, y1)
    # Simulation: Header block spanning, then left column block and right column block
    blocks = [
        {"bbox": (50, 200, 250, 300), "text": "Left Column Block"},
        {"bbox": (50, 50, 550, 100), "text": "Top Header Block"},
        {"bbox": (300, 200, 550, 300), "text": "Right Column Block"},
    ]
    
    sorted_blocks = extractor.xy_cut_sort(blocks, tolerance=5.0)
    
    # 1. Top Header Block should be first (separated by vertical split at y=100-200)
    assert sorted_blocks[0]["text"] == "Top Header Block"
    # 2. Left Column Block should be second (separated by horizontal split at x=250-300)
    assert sorted_blocks[1]["text"] == "Left Column Block"
    # 3. Right Column Block should be third
    assert sorted_blocks[2]["text"] == "Right Column Block"


@pytest.mark.asyncio
async def test_vision_llm_payload_generation(monkeypatch):
    pdf_bytes = create_mock_two_column_pdf()
    
    class MockMistralClient:
        async def chat_completion(self, messages, temperature):
            assert len(messages) == 1
            content = messages[0]["content"]
            # Prompt should be first element
            assert content[0]["type"] == "text"
            # 1 page in this PDF, so there should be 1 image element
            assert len(content) == 2
            assert content[1]["type"] == "image_url"
            assert content[1]["image_url"]["url"].startswith("data:image/png;base64,")
            return {
                "choices": [
                    {
                        "message": {
                            "content": "Extracted text from mock client."
                        }
                    }
                ]
            }

    extractor = MultiStrategyPDFExtractor(mistral_client=MockMistralClient())
    result = await extractor._extract_vision_llm(pdf_bytes)
    
    assert result.strategy == ExtractionStrategy.VISION_LLM
    assert result.text == "Extracted text from mock client."
    assert result.confidence == 0.95
