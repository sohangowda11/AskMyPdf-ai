import uuid
import json
import os
from datetime import datetime

DATA_FILE = 'store_data.json'

class MemoryStore:
    def __init__(self):
        self.documents = {}
        self.conversations = {}
        self.load_data()
        # Run cleanup in background to avoid blocking the first request
        import threading
        cleanup_thread = threading.Thread(target=self.auto_cleanup, daemon=True)
        cleanup_thread.start()

    def auto_cleanup(self, max_age_hours=24):
        """Removes physical files and metadata older than max_age_hours."""
        try:
            from config import Config
            import time
            
            now = time.time()
            upload_dir = os.path.abspath(Config.UPLOAD_FOLDER)
            
            if not os.path.exists(upload_dir):
                return

            # Clean physical files
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                if os.path.isfile(file_path):
                    file_age = now - os.path.getmtime(file_path)
                    if file_age > (max_age_hours * 3600):
                        try:
                            os.unlink(file_path)
                        except:
                            pass

            # Clean metadata (optional but good for long-term)
            # Find doc_ids whose files are missing or too old
            ids_to_remove = []
            for doc_id, doc in self.documents.items():
                created_at = datetime.fromisoformat(doc['created_at'])
                age = (datetime.now() - created_at).total_seconds()
                if age > (max_age_hours * 3600):
                    ids_to_remove.append(doc_id)
            
            for doc_id in ids_to_remove:
                del self.documents[doc_id]
            
            if ids_to_remove:
                self.save_data()
                
        except Exception as e:
            print(f"Auto-cleanup failed: {e}")

    def save_data(self):
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    'documents': self.documents,
                    'conversations': self.conversations
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Failed to save data: {e}")

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.documents = data.get('documents', {})
                    self.conversations = data.get('conversations', {})
            except Exception as e:
                print(f"Failed to load data: {e}")

    def add_document(self, filename, filepath, pages, chunks):
        doc_id = str(uuid.uuid4())
        self.documents[doc_id] = {
            'doc_id': doc_id,
            'filename': filename,
            'filepath': filepath,
            'pages': pages,
            'chunks': chunks,
            'page_count': len(pages),
            'created_at': datetime.now().isoformat()
        }
        self.save_data()
        return doc_id

    def get_document(self, doc_id):
        return self.documents.get(doc_id)

    def create_conversation(self, doc_ids, title=None):
        conv_id = str(uuid.uuid4())
        # doc_ids can be a single string or a list
        if isinstance(doc_ids, str):
            doc_ids = [doc_ids]
            
        docs = [self.documents.get(did) for did in doc_ids if did in self.documents]
        if not title and docs:
            if len(docs) == 1:
                title = f"Chat about {docs[0]['filename']}"
            else:
                title = f"Multi-PDF Chat ({len(docs)} documents)"
                
        self.conversations[conv_id] = {
            'conversation_id': conv_id,
            'doc_ids': doc_ids, # Store list of IDs
            'title': title or 'New Conversation',
            'messages': [],
            'pinned': False,
            'created_at': datetime.now().isoformat()
        }
        self.save_data()
        return conv_id

    def add_message(self, conv_id, role, content, sources=None):
        conv = self.conversations.get(conv_id)
        if conv:
            msg = {
                'id': str(uuid.uuid4()),
                'role': role,
                'content': content,
                'sources': sources or [],
                'timestamp': datetime.now().isoformat()
            }
            conv['messages'].append(msg)
            self.save_data()
            return msg
        return None

    def get_conversation(self, conv_id):
        conv = self.conversations.get(conv_id)
        if conv:
            doc_ids = conv.get('doc_ids', [conv.get('doc_id')])
            docs = [self.documents.get(did) for did in doc_ids if did in self.documents]
            filenames = [d['filename'] for d in docs if d]
            return {**conv, 'filenames': filenames, 'doc_ids': doc_ids}
        return None

    def get_all_conversations(self):
        result = []
        for conv_id, conv in self.conversations.items():
            doc_ids = conv.get('doc_ids', [conv.get('doc_id')])
            docs = [self.documents.get(did) for did in doc_ids if did in self.documents]
            filenames = [d['filename'] for d in docs if d]
            result.append({
                'conversation_id': conv['conversation_id'],
                'doc_ids': doc_ids,
                'filenames': filenames,
                'title': conv['title'],
                'pinned': conv.get('pinned', False),
                'message_count': len(conv['messages']),
                'created_at': conv['created_at']
            })
        # Sort: Pinned first, then by date descending
        return sorted(result, key=lambda x: (x['pinned'], x['created_at']), reverse=True)

    def delete_conversation(self, conv_id):
        if conv_id in self.conversations:
            del self.conversations[conv_id]
            self.save_data()
            return True
        return False

    def update_conversation_title(self, conv_id, title):
        conv = self.conversations.get(conv_id)
        if conv:
            conv['title'] = title
            self.save_data()
            return True
        return False

    def toggle_pin(self, conv_id):
        conv = self.conversations.get(conv_id)
        if conv:
            conv['pinned'] = not conv.get('pinned', False)
            self.save_data()
            return conv['pinned']
        return None

    def clear_all(self):
        """Wipes all documents, conversations and deletes files."""
        self.documents = {}
        self.conversations = {}
        
        from config import Config
        upload_dir = os.path.abspath(Config.UPLOAD_FOLDER)
        
        if os.path.exists(upload_dir):
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f"Failed to delete {file_path}: {e}")
        
        self.save_data()
        return True


# Singleton instance
store = MemoryStore()
