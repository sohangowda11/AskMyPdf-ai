from flask import Blueprint, request, jsonify
from services.ai_service import ask_question
from store import store

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Get conversation first to determine mode and documents
    conv_id = data.get('conversation_id')
    conv = store.get_conversation(conv_id)
    if not conv:
        return jsonify({'error': 'Conversation not found'}), 404

    # Resolve active doc_ids: PRIORITIZE THE MULTI-PDF SESSION ARRAY
    doc_ids = data.get('doc_ids')
    if not doc_ids:
        # Fallback to session store if request is missing it
        doc_ids = conv.get('doc_ids', [])
    
    # Defensive check: if it's still just one doc_id, wrap it in a list
    if not doc_ids and data.get('doc_id'):
        doc_ids = [data.get('doc_id')]
    
    # Final validation - ensure we have a valid list of non-empty IDs
    doc_ids = [str(d) for d in doc_ids if d]
    
    if not doc_ids:
        return jsonify({'error': 'No document context available for this chat session'}), 400

    message = data.get('message')
    if not message:
        return jsonify({'error': 'Message content is missing'}), 400

    # Initialize Multi-PDF Session Manager
    from services.context_manager import get_multi_pdf_session
    session = get_multi_pdf_session(doc_ids)
    
    if not session.documents:
        return jsonify({'error': 'Session expired or documents not found. Please re-upload your PDF(s) to continue.'}), 404
        
    all_relevant = session.get_combined_context(message)

    if not all_relevant:
        return jsonify({'error': 'No relevant information found across the selected PDFs. Try a different question.'}), 404

    conv = store.get_conversation(conv_id)
    if not conv:
        return jsonify({'error': 'Conversation not found'}), 404

    # History will be saved as a pair after AI response

    try:
        conversation_history = conv.get('messages', [])
        # We pass the pre-filtered balanced chunks directly to the AI service
        answer, sources = ask_question(message, all_relevant, conversation_history)

        # Extract suggestions if present
        suggestions = []
        clean_answer = answer
        extracted_sources = []
        
        if "SUGGESTIONS:" in answer:
            parts = answer.split("SUGGESTIONS:")
            clean_answer = parts[0].strip()
            raw_suggs = parts[1].strip()
            # Split by | and remove brackets or extra symbols
            suggestions = [s.strip().replace('[', '').replace(']', '') for s in raw_suggs.split("|") if s.strip()]

        if "SOURCES:" in clean_answer:
            parts = clean_answer.split("SOURCES:")
            clean_answer = parts[0].strip()
            raw_sources = parts[1].strip()
            if raw_sources.startswith("```json"):
                raw_sources = raw_sources[7:]
            elif raw_sources.startswith("```"):
                raw_sources = raw_sources[3:]
            if raw_sources.endswith("```"):
                raw_sources = raw_sources[:-3]
            raw_sources = raw_sources.strip()
            
            try:
                import json
                extracted_sources = json.loads(raw_sources)
                # Ensure each extracted source has the correct doc_id by matching filename
                for s in extracted_sources:
                    if 'filename' in s:
                        matching_doc = next((d_id for d_id in doc_ids if store.get_document(d_id) and store.get_document(d_id)['filename'] == s['filename']), None)
                        if matching_doc:
                            s['doc_id'] = matching_doc
            except Exception as e:
                print("Failed to parse SOURCES:", e, "Raw:", raw_sources)

        # Merge extracted sources with context sources
        final_sources = extracted_sources if extracted_sources else sources

        # Save Question & Answer Pair for Persistence
        # We pick the first doc_id for history tracking in this simplified model
        saved_msg = store.add_chat_message(doc_ids[0], message, clean_answer, final_sources)
        
        return jsonify({
            'answer': clean_answer,
            'sources': final_sources,
            'suggestions': suggestions,
            'message_id': saved_msg.get('id') if saved_msg else None,
            'timestamp': saved_msg.get('timestamp') if saved_msg else None
        }), 200
    except Exception as e:
        return jsonify({'error': f'AI processing failed: {str(e)}'}), 500
