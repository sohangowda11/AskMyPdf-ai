from flask import Blueprint, request, jsonify
from services.ai_service import generate_quiz
from store import store

quiz_bp = Blueprint('quiz', __name__)


@quiz_bp.route('/quiz', methods=['POST'])
def get_quiz():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    doc_id = data.get('doc_id')
    num_questions = data.get('num_questions', 5)

    if not doc_id:
        return jsonify({'error': 'Missing doc_id'}), 400

    doc = store.get_document(doc_id)
    if not doc:
        return jsonify({'error': 'Session expired. Please re-upload your PDF to generate a quiz.'}), 404

    try:
        full_text = "\n".join([p['text'] for p in doc['pages']])
        quiz = generate_quiz(full_text, num_questions)
        return jsonify({'quiz': quiz}), 200
    except Exception as e:
        return jsonify({'error': f'Quiz generation failed: {str(e)}'}), 500
