import os
from flask import Flask, send_from_directory, request, jsonify, send_file
import logging
import socket

# FORCE IPv4: Resolve connection timeouts on networks with broken IPv6 routing
orig_getaddrinfo = socket.getaddrinfo
def patched_getaddrinfo(*args, **kwargs):
    responses = orig_getaddrinfo(*args, **kwargs)
    return [r for r in responses if r[0] == socket.AF_INET]
socket.getaddrinfo = patched_getaddrinfo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
from flask_cors import CORS
from config import Config
from routes.upload import upload_bp
from routes.chat import chat_bp
from routes.summary import summary_bp
from routes.quiz import quiz_bp
from routes.history import history_bp
from routes.tools import tools_bp
from routes.flashcards import flashcards_bp
from routes.advanced import advanced_bp
from routes.study_toolkit import study_toolkit_bp

app = Flask(__name__)
# 1. LOAD FULL CONFIGURATION
app.config.from_object(Config)

# Ensure UPLOAD_FOLDER is explicitly in config if not already
if 'UPLOAD_FOLDER' not in app.config:
    app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER

# Configure CORS for production
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*').split(',')
CORS(app, resources={
    r"/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"]
    }
})

app.config['MAX_CONTENT_LENGTH'] = Config.MAX_FILE_SIZE

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Register blueprints
app.register_blueprint(upload_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(summary_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(history_bp)
app.register_blueprint(tools_bp)
app.register_blueprint(flashcards_bp)
app.register_blueprint(advanced_bp)
app.register_blueprint(study_toolkit_bp)


from utils.auth import require_auth

@app.route('/api/pdf/<doc_id>')
@require_auth
def get_pdf_by_id(doc_id):
    """Securely fetch a PDF file by its ID with ownership verification."""
    from flask import g
    from utils.db import store
    user_id = g.user.id
    logger.info(f"[PDF_FETCH] Fetching doc_id: {doc_id} for user: {user_id}")
    
    # Verify ownership: User must own it OR it must be an old "unowned" document (NULL user_id)
    try:
        # Check for owned OR unowned (transitionary)
        res = store.supabase.table('pdf_documents')\
            .select('filepath, filename, user_id')\
            .eq('id', doc_id)\
            .execute()
        
        if not res.data:
            logger.warning(f"[PDF_FETCH] No document found for doc_id: {doc_id}")
            return jsonify({"error": "Document not found."}), 404
            
        doc = res.data[0]
        db_user_id = doc.get('user_id')
        request_user_id = str(user_id)
        
        logger.info(f"!!! [BACKEND_PDF_ACCESS] User: {user_id} requesting DocID: {doc_id}")

        # SECURITY: If it has an owner, it MUST be the current user. 
        # If DB_OWNER is None, we allow it (Orphaned/Legacy doc).
        if db_user_id is not None and str(db_user_id) != str(user_id):
            logger.warning(f"!!! [BACKEND_PDF_ACCESS] 403: Ownership mismatch. DocOwner: {db_user_id} vs Requester: {user_id}")
            return jsonify({"error": "Access denied."}), 403
            
        filepath = doc['filepath']
        filename = doc['filename']
        upload_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
        
        # 1. Try absolute path from DB
        abs_path = os.path.abspath(filepath)
        if not os.path.exists(abs_path):
            # 2. Try relative to UPLOAD_FOLDER
            abs_path = os.path.join(upload_dir, os.path.basename(filepath))
            
        if not os.path.exists(abs_path):
            # 3. Last resort: Search entire UPLOAD_FOLDER for the filename
            logger.warning(f"[PDF_FETCH] File not found at {filepath}. Searching uploads folder for {filename}...")
            found = False
            for root, dirs, files in os.walk(upload_dir):
                if filename in files:
                    abs_path = os.path.join(root, filename)
                    found = True
                    break
            if not found:
                logger.error(f"!!! [BACKEND_PDF_ACCESS] 404: Physical file missing: {filename}")
                return jsonify({"error": "File not found on server."}), 404

        logger.info(f"!!! [BACKEND_PDF_ACCESS] 200: Serving file: {abs_path}")
        return send_file(abs_path, mimetype='application/pdf')
    except Exception as e:
        logger.error(f"!!! [BACKEND_PDF_ACCESS] 500: ERROR: {str(e)}")
        return jsonify({"error": "Internal server error retrieving PDF"}), 500

@app.route('/uploads/<filename>')
def serve_upload(filename):
    """Temporary unprotected route for stable PDF streaming."""
    return send_from_directory(
        os.path.abspath(app.config['UPLOAD_FOLDER']),
        filename,
        mimetype='application/pdf'
    )

# Legacy /api/pdf/<doc_id> remains but we will prefer direct paths for stability.


@app.route('/')
def home():
    return {
        'status': 'online',
        'message': 'AskMyPDF AI Intelligence Backend is running',
        'version': '1.0.0',
        'api_status': 'healthy'
    }, 200

@app.route('/health')
def health():
    return {'status': 'ok', 'message': 'AskMyPDF AI Backend is running'}

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    from flask import jsonify
    error_details = traceback.format_exc()
    # Log the full error to the server console
    print("\n" + "!"*60)
    print("   CRITICAL SERVER ERROR")
    print("!"*60)
    print(error_details)
    print("!"*60 + "\n")
    
    # Return a generic error message in production, but details in development
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({"error": "An internal server error occurred."}), 500
    return jsonify({"error": str(e), "traceback": error_details}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print("="*50)
    print("   ASKMYPDF AI BACKEND STARTING")
    print("="*50)
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Upload folder: {os.path.abspath(Config.UPLOAD_FOLDER)}")
    print("="*50 + "\n")
    
    app.run(debug=debug, host='0.0.0.0', port=port)
