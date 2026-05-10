import uuid
from datetime import datetime
from supabase import create_client, Client
from config import Config

class SupabaseStore:
    def __init__(self):
        self.url = Config.SUPABASE_URL
        self.key = Config.SUPABASE_SERVICE_ROLE_KEY
        if self.url and self.key:
            self.supabase: Client = create_client(self.url, self.key)
            print("   [DB] Supabase Persistent Store Initialized.")
        else:
            self.supabase = None
            print("   [DB] WARNING: Supabase credentials missing. Persistence disabled.")

    def save_data(self):
        """Dummy method for compatibility with memory_store interface."""
        pass

    def add_document(self, filename, filepath, pages, chunks):
        doc_id = str(uuid.uuid4())
        data = {
            'id': doc_id,
            'filename': filename,
            'filepath': filepath,
            'pages': pages,
            'chunks': chunks,
            'page_count': len(pages)
        }
        if self.supabase:
            self.supabase.table('documents').insert(data).execute()
        return doc_id

    def get_document(self, doc_id):
        if not self.supabase: return None
        res = self.supabase.table('documents').select('*').eq('id', doc_id).execute()
        if res.data:
            doc = res.data[0]
            # Match internal naming convention
            return {**doc, 'doc_id': doc['id']}
        return None

    def create_conversation(self, doc_ids, title=None):
        conv_id = str(uuid.uuid4())
        if isinstance(doc_ids, str):
            doc_ids = [doc_ids]
            
        if not title:
            docs = [self.get_document(did) for did in doc_ids]
            valid_docs = [d for d in docs if d]
            if len(valid_docs) == 1:
                title = f"Chat about {valid_docs[0]['filename']}"
            else:
                title = f"Multi-PDF Chat ({len(valid_docs)} documents)"

        data = {
            'id': conv_id,
            'doc_ids': doc_ids,
            'title': title or 'New Conversation',
            'pinned': False
        }
        if self.supabase:
            self.supabase.table('conversations').insert(data).execute()
        return conv_id

    def add_message(self, conv_id, role, content, sources=None):
        data = {
            'conversation_id': conv_id,
            'role': role,
            'content': content,
            'sources': sources or []
        }
        if self.supabase:
            res = self.supabase.table('messages').insert(data).execute()
            if res.data:
                msg = res.data[0]
                return {**msg, 'timestamp': msg['timestamp']}
        return None

    def get_conversation(self, conv_id):
        if not self.supabase: return None
        # Get conversation
        c_res = self.supabase.table('conversations').select('*').eq('id', conv_id).execute()
        if not c_res.data: return None
        conv = c_res.data[0]
        
        # Get messages
        m_res = self.supabase.table('messages').select('*').eq('conversation_id', conv_id).order('timestamp').execute()
        
        doc_ids = conv.get('doc_ids', [])
        docs = [self.get_document(did) for did in doc_ids]
        filenames = [d['filename'] for d in docs if d]
        
        return {
            'conversation_id': conv['id'],
            'doc_ids': doc_ids,
            'filenames': filenames,
            'title': conv['title'],
            'pinned': conv['pinned'],
            'messages': m_res.data,
            'created_at': conv['created_at']
        }

    def get_all_conversations(self):
        if not self.supabase: return []
        # Get conversations with message counts (simplified)
        res = self.supabase.table('conversations').select('*, messages(count)').execute()
        
        formatted = []
        for conv in res.data:
            doc_ids = conv.get('doc_ids', [])
            # For simplicity in list view, we don't fetch all filenames here 
            # unless needed by frontend immediately. 
            # But the frontend expects 'filenames' list.
            # We can optimize this later with a join or separate fetch.
            formatted.append({
                'conversation_id': conv['id'],
                'doc_ids': doc_ids,
                'filenames': [], # Placeholder or fetch if critical
                'title': conv['title'],
                'pinned': conv['pinned'],
                'message_count': conv.get('messages', [{}])[0].get('count', 0),
                'created_at': conv['created_at']
            })
        
        return sorted(formatted, key=lambda x: (x['pinned'], x['created_at']), reverse=True)

    def delete_conversation(self, conv_id):
        if self.supabase:
            self.supabase.table('conversations').delete().eq('id', conv_id).execute()
            return True
        return False

    def update_conversation_title(self, conv_id, title):
        if self.supabase:
            self.supabase.table('conversations').update({'title': title}).eq('id', conv_id).execute()
            return True
        return False

    def toggle_pin(self, conv_id):
        if not self.supabase: return None
        conv = self.get_conversation(conv_id)
        if conv:
            new_val = not conv['pinned']
            self.supabase.table('conversations').update({'pinned': new_val}).eq('id', conv_id).execute()
            return new_val
        return None

    def clear_all(self):
        if self.supabase:
            # Dangerous! Only if really needed.
            self.supabase.table('messages').delete().neq('role', 'system').execute()
            self.supabase.table('conversations').delete().neq('title', '').execute()
            self.supabase.table('documents').delete().neq('filename', '').execute()
            return True
        return False

# Singleton instance setup handled in __init__.py or app.py
