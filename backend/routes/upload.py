import os
import uuid
import threading
import logging
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from services.pdf_service import extract_text, chunk_text, get_page_count
from store import store
from config import Config

upload_bp = Blueprint('upload', __name__)
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

logger = logging.getLogger(__name__)

def background_process_pdf(filepath, filename, doc_id):
    """Heavy lifting happens here without blocking the user."""
    try:
        logger.info(f" [BG] Starting extraction for {doc_id}")
        pages = extract_text(filepath)
        chunks = chunk_text(pages)
        
        # Update the existing document record with the extracted text and chunks
        # This assumes SupabaseStore.add_document can handle updates or we add an update method
        # For simplicity, we'll just call add_document again if it handles upserts
        # but let's assume we want a specific 'update' for background completion
        store.add_document(filename, filepath, pages, chunks, doc_id=doc_id) 
        # Note: In our current SupabaseStore, add_document uses insert. 
        # I should add an 'upsert' or 'update' logic. 
        # Let's fix SupabaseStore to handle this.
        
        logger.info(f" [BG] Successfully processed {doc_id}")
    except Exception as e:
        logger.error(f" [BG] Processing failed for {doc_id}: {str(e)}")

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    logger.info(">>> START: /upload API REQUEST")
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Handle duplicate filenames
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(filepath):
        filename = f"{base}_{counter}{ext}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        counter += 1

    logger.info(f"Saving file: {filename}")
    file.save(filepath)

    try:
        # QUICK PATH: Get metadata and return immediately
        page_count = get_page_count(filepath)
        
        # Create an 'Empty' document entry first so it exists in the UI
        # We pass empty pages/chunks for now
        doc_id = store.add_document(filename, filepath, [], [])
        
        title = filename.rsplit('.', 1)[0].replace('_', ' ')
        conv_id = store.create_conversation(doc_id, title=title)

        # FIRE AND FORGET: Start background processing
        thread = threading.Thread(target=background_process_pdf, args=(filepath, filename, doc_id))
        thread.daemon = True
        thread.start()

        logger.info(f"UPLOAD QUICK SUCCESS: {doc_id}")
        return jsonify({
            'doc_id': doc_id,
            'conversation_id': conv_id,
            'filename': filename,
            'page_count': page_count,
            'status': 'processing'
        }), 200

    except Exception as e:
        logger.error(f"UPLOAD ERROR: {str(e)}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': f'Failed to initiate upload: {str(e)}'}), 500
