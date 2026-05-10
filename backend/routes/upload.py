import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from services.pdf_service import extract_text, chunk_text, get_page_count
from store import store
from config import Config

import logging

upload_bp = Blueprint('upload', __name__)
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

logger = logging.getLogger(__name__)

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    logger.info(">>> START: /upload API REQUEST")
    
    if 'file' not in request.files:
        logger.warning("No file part in request")
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        logger.warning("No file selected")
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        logger.warning(f"Invalid file type: {file.filename}")
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)

    # Ensure directory exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Handle duplicate filenames
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(filepath):
        filename = f"{base}_{counter}{ext}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        counter += 1

    logger.info(f"Saving file to: {filepath}")
    file.save(filepath)

    try:
        logger.info("Extracting text from PDF...")
        pages = extract_text(filepath)
        
        logger.info("Chunking text...")
        chunks = chunk_text(pages)
        
        page_count = get_page_count(filepath)
        
        logger.info("Updating memory store...")
        doc_id = store.add_document(filename, filepath, pages, chunks)
        
        # Clean title: use filename without extension
        title = filename.rsplit('.', 1)[0].replace('_', ' ')
        conv_id = store.create_conversation(doc_id, title=title)

        logger.info(f"UPLOAD SUCCESS: {doc_id}")
        return jsonify({
            'doc_id': doc_id,
            'conversation_id': conv_id,
            'filename': filename,
            'page_count': page_count,
            'chunk_count': len(chunks)
        }), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"UPLOAD ERROR: {str(e)}\n{error_trace}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({
            'error': f'Failed to process PDF: {str(e)}',
            'details': error_trace
        }), 500
