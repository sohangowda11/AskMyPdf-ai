from flask import Blueprint, request, jsonify, g
from services.ai_service import rewrite_text, explain_document
from store import store
from utils.auth import require_auth
import logging

tools_bp = Blueprint('tools', __name__)
logger = logging.getLogger(__name__)

@tools_bp.route('/explain', methods=['POST'])
@require_auth
def explain():
    user_id = g.user.id
    logger.info(">>> START: /explain API REQUEST")
    try:
        data = request.get_json()
        doc_id = data.get('doc_id')
        conv_id = data.get('conversation_id')

        logger.info(f"Context: doc_id={doc_id}, conv_id={conv_id}")

        if not doc_id:
            logger.warning("No doc_id provided")
            return jsonify({'success': False, 'error': 'Please upload a PDF first.'}), 400

        doc = store.get_document(doc_id, user_id=user_id)
        if not doc:
            logger.error(f"Document {doc_id} not found in store")
            return jsonify({'success': False, 'error': 'PDF document session expired. Please re-upload.'}), 404

        # STEP: FULL TEXT EXTRACTION (As requested: Explain ENTIRE PDF)
        logger.info(f"Extracting text from PDF: {doc['filepath']}")
        full_text = ""
        try:
            full_text = doc.get('extracted_text', '')
            
            # Clean text: remove extra whitespace and newlines
            full_text = " ".join(full_text.split())
            
            logger.info(f"Extraction successful. Text length: {len(full_text)} characters")
        except Exception as ext_err:
            logger.error(f"Text extraction failed: {str(ext_err)}")
            return jsonify({'success': False, 'error': 'Failed to read PDF content.'}), 500

        # VALIDATION
        if len(full_text) < 50:
            logger.warning("Extracted text is too short (< 50 chars)")
            return jsonify({'success': False, 'error': 'No readable text found in PDF.'}), 400

        # STEP: AI CALL
        logger.info("Calling AI service (explain_document)...")
        explanation = explain_document(full_text)
        logger.info("AI response received successfully")

        # PERSIST TO CHAT
        if conv_id:
            store.add_message(conv_id, 'user', "🔍 Explain this document")
            store.add_message(conv_id, 'assistant', explanation)

        # FINAL RESPONSE
        return jsonify({
            'success': True,
            'response': explanation
        }), 200

    except Exception as e:
        logger.error(f"CRITICAL ERROR in /explain: {str(e)}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': 'AI explanation failed. The document might be too large or the API quota was exceeded.'
        }), 500


@tools_bp.route('/rewrite', methods=['POST'])
@require_auth
def rewrite():
    user_id = g.user.id
    logger.info(">>> /rewrite endpoint called")
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        doc_id = data.get('doc_id')
        conv_id = data.get('conversation_id')

        if not text:
            return jsonify({'success': False, 'error': 'Please select text in the PDF to rewrite.'}), 400

        # Ownership check for rewrite
        doc = store.get_document(doc_id, user_id=user_id)
        if not doc:
            return jsonify({'success': False, 'error': 'Document context missing or access denied.'}), 403

        logger.info(f"Rewriting text (len: {len(text)})")
        rewritten = rewrite_text(text)

        if conv_id:
            store.add_message(conv_id, 'user', f"✍️ Rewrite: \"{text[:50]}...\"")
            store.add_message(conv_id, 'assistant', rewritten)

        return jsonify({
            'success': True,
            'rewritten': rewritten
        }), 200
    except Exception as e:
        logger.error(f"CRITICAL ERROR in /rewrite: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': 'Rewriting failed.'}), 500
