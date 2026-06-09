import os
import uuid
import threading
import logging
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from services.pdf_service import extract_text, chunk_text, get_page_count
from store import store
from config import Config
from utils.auth import require_auth

upload_bp = Blueprint('upload', __name__)
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

logger = logging.getLogger(__name__)

def background_process_pdf(filepath, filename, doc_id, user_id):
    """Heavy lifting happens here with explicit pipeline logging."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"!!! [PIPELINE_BG_PROCESS] STARTING: DocID {doc_id} for User {user_id}")
        pages = extract_text(filepath)
        chunks = chunk_text(pages)
        
        logger.info(f"!!! [PIPELINE_BG_PROCESS] Saving {len(pages)} pages and {len(chunks)} chunks to DB")
        # Update the existing document record with the extracted text and chunks
        store.add_document(filename, filepath, pages, chunks, doc_id=doc_id, user_id=user_id) 
        
        logger.info(f"!!! [PIPELINE_BG_PROCESS] COMPLETE: DocID {doc_id} is now AI-ready")
    except Exception as e:
        logger.error(f"!!! [PIPELINE_BG_PROCESS] FAILED: {doc_id} -> {str(e)}")

@upload_bp.route('/upload', methods=['POST'])
@require_auth
def upload_file():
    logger.info("!!! [PIPELINE_UPLOAD] 1. New Upload Request Received")
    
    # Extract user_id from the authenticated request
    try:
        from flask import g
        user_id = g.user.id
    except Exception as e:
        user_id = None
        
    if not user_id:
        logger.error("!!! [PIPELINE_UPLOAD] Unauthorized: No UserID")
        return jsonify({'error': 'Unauthorized - No valid user ID found'}), 401
    
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

    logger.info(f"!!! [PIPELINE_UPLOAD] 2. Saving file to disk: {filepath}")
    file.save(filepath)

    try:
        # QUICK PATH: Get metadata and return immediately
        page_count = get_page_count(filepath)
        logger.info(f"!!! [PIPELINE_UPLOAD] 3. Metadata extracted: {page_count} pages")
        
        # Create an 'Empty' document entry first
        doc_id = store.add_document(filename, filepath, [], [], user_id=user_id)
        logger.info(f"!!! [PIPELINE_UPLOAD] 4. DB record initialized: {doc_id}")
        
        title = filename.rsplit('.', 1)[0].replace('_', ' ')
        conv_id = store.create_conversation(doc_id, title=title)

        # FIRE AND FORGET: Start background processing
        thread = threading.Thread(target=background_process_pdf, args=(filepath, filename, doc_id, user_id))
        thread.daemon = True
        thread.start()

        logger.info(f"!!! [PIPELINE_UPLOAD] 5. Background thread started. Returning response.")

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
