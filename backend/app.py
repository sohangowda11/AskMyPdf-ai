import os
from flask import Flask, send_from_directory, request, jsonify
import logging

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
# Configure CORS for production
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*').split(',')
CORS(app, resources={
    r"/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"]
    }
})

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

app.config['MAX_CONTENT_LENGTH'] = Config.MAX_FILE_SIZE

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

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


@app.route('/uploads/<filename>')
def serve_upload(filename):
    """Serve uploaded PDF files to the frontend."""
    return send_from_directory(
        os.path.abspath(Config.UPLOAD_FOLDER),
        filename,
        mimetype='application/pdf'
    )


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
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print("="*50)
    print("   ASKMYPDF AI BACKEND STARTING")
    print("="*50)
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Upload folder: {os.path.abspath(Config.UPLOAD_FOLDER)}")
    print("="*50 + "\n")
    
    app.run(debug=debug, host='0.0.0.0', port=port)
