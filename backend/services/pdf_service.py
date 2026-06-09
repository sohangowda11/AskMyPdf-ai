import fitz  # PyMuPDF


def extract_text(filepath):
    """Extract text from each page of a PDF with verbose logging."""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"!!! [PIPELINE_EXTRACTION] Opening PDF: {filepath}")
    doc = fitz.open(filepath)
    pages = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        text_len = len(text.strip())
        logger.info(f"!!! [PIPELINE_EXTRACTION] Page {page_num+1}: {text_len} characters found")
                
        if text.strip():
            pages.append({
                'page': page_num + 1,
                'text': text.strip()
            })
            
    doc.close()
    logger.info(f"!!! [PIPELINE_EXTRACTION] TOTAL: {len(pages)} readable pages extracted")
    return pages


def chunk_text(pages, chunk_size=1000, overlap=200):
    """Split pages into overlapping chunks with verbose logging."""
    import logging
    logger = logging.getLogger(__name__)
    
    chunks = []
    chunk_id = 0
    for page_data in pages:
        text = page_data['text']
        page_num = page_data['page']
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_content = text[start:end]
            if chunk_content.strip():
                chunks.append({
                    'chunk_id': chunk_id,
                    'page': page_num,
                    'text': chunk_content.strip()
                })
                chunk_id += 1
            start += chunk_size - overlap
            
    logger.info(f"!!! [PIPELINE_CHUNKING] Generated {len(chunks)} chunks from {len(pages)} pages")
    return chunks


def get_page_count(filepath):
    """Get total page count of a PDF."""
    doc = fitz.open(filepath)
    count = len(doc)
    doc.close()
    return count
