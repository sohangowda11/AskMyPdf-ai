from flask import Blueprint, request, jsonify
from store import store

history_bp = Blueprint('history', __name__)


@history_bp.route('/conversation', methods=['POST'])
def create_conversation():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    doc_ids = data.get('doc_ids')
    title = data.get('title')
    
    if not doc_ids:
        return jsonify({'error': 'Missing doc_ids'}), 400
        
    conv_id = store.create_conversation(doc_ids, title)
    return jsonify({'conversation_id': conv_id}), 201


@history_bp.route('/history', methods=['GET'])
def get_all_history():
    conversations = store.get_all_conversations()
    return jsonify({'conversations': conversations}), 200


@history_bp.route('/history/<conversation_id>', methods=['GET'])
def get_conversation_history(conversation_id):
    conv = store.get_conversation(conversation_id)
    if not conv:
        return jsonify({'error': 'Conversation not found'}), 404
    return jsonify(conv), 200


@history_bp.route('/history/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    success = store.delete_conversation(conversation_id)
    if success:
        return jsonify({'message': 'Conversation deleted'}), 200
    return jsonify({'error': 'Conversation not found'}), 404


@history_bp.route('/history/<conversation_id>/title', methods=['PUT'])
def update_title(conversation_id):
    data = request.get_json()
    title = data.get('title')
    if not title:
        return jsonify({'error': 'Missing title'}), 400
    success = store.update_conversation_title(conversation_id, title)
    if success:
        return jsonify({'message': 'Title updated'}), 200
    return jsonify({'error': 'Conversation not found'}), 404


@history_bp.route('/history/<conversation_id>/pin', methods=['POST'])
def toggle_pin(conversation_id):
    pinned = store.toggle_pin(conversation_id)
    if pinned is not None:
        return jsonify({'message': 'Pin toggled', 'pinned': pinned}), 200
    return jsonify({'error': 'Conversation not found'}), 404


@history_bp.route('/history/clear', methods=['DELETE'])
def clear_all_history():
    success = store.clear_all()
    return jsonify({'message': 'All history and files cleared'}), 200
