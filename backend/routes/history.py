from flask import Blueprint, request, jsonify, g
from store import store
from utils.auth import require_auth

history_bp = Blueprint('history', __name__)


@history_bp.route('/conversation', methods=['POST'])
@require_auth
def create_conversation():
    user_id = g.user.id
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    doc_ids = data.get('doc_ids')
    title = data.get('title')
    
    if not doc_ids:
        return jsonify({'error': 'Missing doc_ids'}), 400
        
    conv_id = store.create_conversation(doc_ids, title, user_id=user_id)
    return jsonify({'conversation_id': conv_id}), 201


@history_bp.route('/history', methods=['GET'])
@require_auth
def get_all_history():
    user_id = g.user.id
    conversations = store.get_all_conversations(user_id=user_id)
    return jsonify({'conversations': conversations}), 200


@history_bp.route('/history/<conversation_id>', methods=['GET'])
@require_auth
def get_conversation_history(conversation_id):
    user_id = g.user.id
    # Pass user_id to ensure the user owns the conversation being retrieved
    conv = store.get_conversation(conversation_id, user_id=user_id)
    
    if not conv:
        return jsonify({'error': 'Conversation not found'}), 404
        
    # Extra check if RLS wasn't enough:
    # if conv.get('user_id') != user_id: return 404
    
    return jsonify(conv), 200


@history_bp.route('/history/<conversation_id>', methods=['DELETE'])
@require_auth
def delete_conversation(conversation_id):
    user_id = g.user.id
    success = store.delete_conversation(conversation_id, user_id=user_id)
    if success:
        return jsonify({'message': 'Conversation deleted'}), 200
    return jsonify({'error': 'Conversation not found'}), 404


@history_bp.route('/history/<conversation_id>/title', methods=['PUT'])
@require_auth
def update_title(conversation_id):
    user_id = g.user.id
    data = request.get_json()
    title = data.get('title')
    if not title:
        return jsonify({'error': 'Missing title'}), 400
    success = store.update_conversation_title(conversation_id, title, user_id=user_id)
    if success:
        return jsonify({'message': 'Title updated'}), 200
    return jsonify({'error': 'Conversation not found'}), 404


@history_bp.route('/history/<conversation_id>/pin', methods=['POST'])
@require_auth
def toggle_pin(conversation_id):
    user_id = g.user.id
    pinned = store.toggle_pin(conversation_id, user_id=user_id)
    if pinned is not None:
        return jsonify({'message': 'Pin toggled', 'pinned': pinned}), 200
    return jsonify({'error': 'Conversation not found'}), 404


@history_bp.route('/history/clear', methods=['DELETE'])
@require_auth
def clear_all_history():
    user_id = g.user.id
    success = store.clear_all(user_id=user_id)
    return jsonify({'message': 'All history and files cleared'}), 200
