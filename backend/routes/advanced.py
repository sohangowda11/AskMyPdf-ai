from flask import Blueprint, request, jsonify
from services.ai_service import run_advanced_tool
from store import store
import logging

advanced_bp = Blueprint('advanced', __name__)
logger = logging.getLogger(__name__)

@advanced_bp.route('/explain-simply', methods=['POST'])
def explain_simply_route():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    conv_id = data.get('conversationId')
    doc_id = data.get('docId')
    user_question = data.get('userQuestion')

    if not doc_id:
        return jsonify({'error': 'Missing doc_id.'}), 400

    doc = store.get_document(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found.'}), 404

    try:
        from services.ai_service import explain_simply
        full_text = doc.get('extracted_text', '')
        
        result = explain_simply(full_text, user_question)

        if conv_id:
            title = "💡 Explain Simply"
            if user_question:
                title = f"💡 Explain Simply: {user_question[:30]}..."
            
            store.add_message(conv_id, 'user', title)
            store.add_message(conv_id, 'assistant', result)

        return jsonify({'result': result}), 200
    except Exception as e:
        logger.error(f"Explain Simply failed: {str(e)}")
        return jsonify({'error': 'Failed to generate simplified explanation.'}), 500

@advanced_bp.route('/advanced', methods=['POST'])
def run_tool():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    doc_id = data.get('doc_id')
    tool_name = data.get('tool_name')
    conv_id = data.get('conversation_id')

    if not doc_id or not tool_name:
        return jsonify({'error': 'Missing doc_id or tool_name.'}), 400

    doc = store.get_document(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found in session.'}), 404

    try:
        full_text = doc.get('extracted_text', '')
        if not full_text.strip():
            return jsonify({'error': 'No readable text.'}), 400

        result = run_advanced_tool(full_text, tool_name)

        if conv_id and tool_name in ['explain_simply', 'notes', 'exam_prep']:
            tool_display = {
                'explain_simply': 'Explain Simply',
                'notes': 'Generate Notes',
                'exam_prep': 'Exam Prep'
            }
            title = f"🚀 {tool_display.get(tool_name, tool_name)}"
            store.add_message(conv_id, 'user', title)
            store.add_message(conv_id, 'assistant', result)

        return jsonify({'result': result}), 200
    except Exception as e:
        logger.error(f"Advanced tool failed: {str(e)}")
        return jsonify({'error': 'Tool execution failed.'}), 500
