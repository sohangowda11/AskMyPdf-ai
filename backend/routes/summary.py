from flask import Blueprint, request, jsonify
from services.ai_service import summarize
from store.memory_store import store

import logging

summary_bp = Blueprint('summary', __name__)
logger = logging.getLogger(__name__)


@summary_bp.route('/summary', methods=['POST'])
def get_summary():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    doc_id = data.get('doc_id')
    conv_id = data.get('conversation_id')

    logger.info(f"Summary request for doc_id: {doc_id}")

    if not doc_id:
        return jsonify({'error': 'Please upload a PDF first.'}), 400

    doc = store.get_document(doc_id)
    if not doc:
        logger.error(f"Document {doc_id} not found in store")
        return jsonify({'error': 'Session expired or document not found. Please re-upload your PDF.'}), 404

    try:
        full_text = "\n".join([p['text'] for p in doc.get('pages', [])])
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
            store.add_message(conv_id, 'user', '📝 Summarize this document')
            store.add_message(conv_id, 'assistant', clean_summary)

        return jsonify({
            'summary': clean_summary,
            'suggestions': suggestions
        }), 200
    except Exception as e:
        logger.error(f"AI Summarization failed: {str(e)}")
        return jsonify({'error': 'Unable to summarize the document right now.'}), 500
