from flask import Blueprint, request, jsonify
from services.ai_service import generate_study_toolkit
from store import store
import logging

study_toolkit_bp = Blueprint('study_toolkit', __name__)
logger = logging.getLogger(__name__)

@study_toolkit_bp.route('/api/study-toolkit', methods=['POST'])
def get_toolkit():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conv_id = data.get('conversationId')
    pdf_text = data.get('pdfText')

    # If pdf_text is provided directly, use it
    if pdf_text and pdf_text.strip():
        full_text = pdf_text
    elif conv_id:
        # Fallback to stored document if text not provided but conv_id exists
        conv = store.get_conversation(conv_id)
        if not conv:
            return jsonify({'error': 'Conversation not found.'}), 404
        
        doc = store.get_document(conv['doc_id'])
        if not doc:
            return jsonify({'error': 'Document not found.'}), 404
            
        full_text = "\n".join([p['text'] for p in doc.get('pages', [])])
    else:
        return jsonify({'error': 'Missing conversationId or pdfText.'}), 400

    if not full_text.strip():
        return jsonify({'error': 'No readable text available.'}), 400

    try:
        toolkit_data = generate_study_toolkit(full_text)
        
        # Save to memory store associated with conversation
        if conv_id:
            store.add_message(conv_id, 'assistant', "System: Study Toolkit insights generated.")
            # We can store the data in the conversation object for persistence
            conv = store.get_conversation(conv_id)
            if conv:
                conv['study_toolkit'] = toolkit_data
                store.save_data()

        return jsonify(toolkit_data), 200
    except Exception as e:
        logger.error(f"Study toolkit generation failed: {str(e)}")
        return jsonify({'error': 'Study toolkit generation failed.'}), 500
