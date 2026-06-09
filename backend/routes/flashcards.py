from flask import Blueprint, request, jsonify, g
from services.ai_service import generate_flashcards
from store import store
from utils.auth import require_auth

flashcards_bp = Blueprint('flashcards', __name__)

@flashcards_bp.route('/flashcards', methods=['POST'])
@require_auth
def get_flashcards():
    user_id = g.user.id
    data = request.json
    doc_id = data.get('doc_id')
    
    if not doc_id:
        return jsonify({"error": "Missing doc_id"}), 400
        
    doc = store.get_document(doc_id, user_id=user_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
        
    try:
        flashcards = generate_flashcards(doc.get('extracted_text', ''))
        return jsonify({"flashcards": flashcards})
    except Exception as e:
        print(f"Flashcard generation failed: {e}")
        return jsonify({"error": "Failed to generate flashcards"}), 500
