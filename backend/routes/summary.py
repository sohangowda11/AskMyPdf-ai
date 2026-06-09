from flask import Blueprint, request, jsonify, g
from services.ai_service import summarize
from store import store
from utils.auth import require_auth

import logging

summary_bp = Blueprint('summary', __name__)
logger = logging.getLogger(__name__)


@summary_bp.route('/summary', methods=['POST'])
@require_auth
def get_summary():
    user_id = g.user.id
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    doc_id = data.get('doc_id')
    conv_id = data.get('conversation_id')

    logger.info(f"Summary request for doc_id: {doc_id}")

    if not doc_id:
        return jsonify({'error': 'Please upload a PDF first.'}), 400

    doc = store.get_document(doc_id, user_id=user_id)
    if not doc:
        logger.error(f"Document {doc_id} not found in store for user {user_id}")
        return jsonify({'error': 'Session expired or document not found. Please re-upload your PDF.'}), 404

    try:
        full_text = doc.get('extracted_text', '')
        if not full_text.strip():
            return jsonify({'error': 'No readable text found in the document.'}), 400
            
        summary = summarize(full_text)
        
        # Extract suggestions if present
        suggestions = []
        clean_summary = summary
        if "SUGGESTIONS:" in summary:
            parts = summary.split("SUGGESTIONS:")
            clean_summary = parts[0].strip()
            raw_suggs = parts[1].strip()
            suggestions = [s.strip().replace('[', '').replace(']', '') for s in raw_suggs.split("|") if s.strip()]

        if conv_id:
            store.update_document_summary(doc_id, clean_summary, user_id=user_id)
            # Add message to history manually if needed, but the UI usually handles this via summary display

        return jsonify({
            'summary': clean_summary,
            'suggestions': suggestions
        }), 200
    except Exception as e:
        error_msg = str(e)
        logger.error(f"!!! [SUMMARY_PIPELINE] AI Summarization failed: {error_msg}")
        return jsonify({'error': 'AI Summarization failed. The document might be too large or the API quota was exceeded.'}), 500
