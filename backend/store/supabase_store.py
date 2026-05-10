import uuid
import os
import shutil
from datetime import datetime
from supabase import create_client, Client
from config import Config

class SupabaseStore:
    def __init__(self):
        self.url = Config.SUPABASE_URL
        self.key = Config.SUPABASE_SERVICE_ROLE_KEY
        if self.url and self.key:
            self.supabase: Client = create_client(self.url, self.key)
            print("   [DB] Supabase PostgreSQL Store Initialized.")
        else:
            self.supabase = None
            print("   [DB] WARNING: Supabase credentials missing. Persistence disabled.")

    def save_data(self):
        pass

    def add_document(self, filename, filepath, pages, chunks, doc_id=None):
        if not doc_id:
            doc_id = str(uuid.uuid4())
            
        full_text = ""
        if pages:
            full_text = "\n".join([str(p.get('text', '')) for p in pages])
        
        data = {
            'id': doc_id,
            'filename': filename,
            'filepath': filepath,
            'extracted_text': full_text,
            'page_count': len(pages),
            'chunks': chunks 
        }
        if self.supabase:
            # Use upsert to handle both initial creation and background updates
            self.supabase.table('pdf_documents').upsert(data).execute()
        return doc_id

    def get_document(self, doc_id):
        if not self.supabase: return None
        res = self.supabase.table('pdf_documents').select('*').eq('id', doc_id).execute()
        if res.data:
            doc = res.data[0]
            return {**doc, 'doc_id': doc['id']}
        return None

    def update_document_summary(self, doc_id, summary):
        if self.supabase:
            self.supabase.table('pdf_documents').update({'summary': summary}).eq('id', doc_id).execute()

    def add_chat_message(self, doc_id, question, answer, sources=None):
        data = {
            'document_id': doc_id,
            'question': question,
            'answer': answer,
            'sources': sources or []
        }
        if self.supabase:
            res = self.supabase.table('chat_history').insert(data).execute()
            return res.data[0] if res.data else None
        return None

    def get_chat_history(self, doc_id):
        if not self.supabase: return []
        res = self.supabase.table('chat_history').select('*').eq('document_id', doc_id).order('timestamp').execute()
        return res.data if res.data else []

    def delete_conversation(self, doc_id):
        """In our schema, doc_id IS the conversation root."""
        if not self.supabase: return False
        try:
            self.supabase.table('pdf_documents').delete().eq('id', doc_id).execute()
            return True
        except:
            return False

    def clear_all(self):
        if not self.supabase: return False
        try:
            # Delete all documents (cascades to chat_history)
            self.supabase.table('pdf_documents').delete().neq('filename', '').execute()
            # Also clear local uploads
            if os.path.exists(Config.UPLOAD_FOLDER):
                shutil.rmtree(Config.UPLOAD_FOLDER)
                os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
            return True
        except:
            return False

    def update_conversation_title(self, doc_id, title):
        if not self.supabase: return False
        try:
            # For simplicity, we store the 'title' as a renamed filename in this schema
            self.supabase.table('pdf_documents').update({'filename': title}).eq('id', doc_id).execute()
            return True
        except:
            return False

    def toggle_pin(self, doc_id):
        # We can add a 'pinned' column to pdf_documents if needed
        return False

    # --- COMPATIBILITY SHIMS ---
    
    def create_conversation(self, doc_ids, title=None):
        # doc_ids can be a list or a single ID
        if isinstance(doc_ids, list):
            return doc_ids[0]
        return doc_ids

    def add_message(self, doc_id, role, content, sources=None):
        pass

    def get_conversation(self, doc_id):
        doc = self.get_document(doc_id)
        if not doc: return None
        
        history = self.get_chat_history(doc_id)
        messages = []
        for h in history:
            messages.append({'role': 'user', 'content': h['question'], 'timestamp': h['timestamp']})
            messages.append({'role': 'assistant', 'content': h['answer'], 'sources': h['sources'], 'timestamp': h['timestamp']})
            
        return {
            'conversation_id': doc_id,
            'doc_id': doc_id,
            'title': doc['filename'],
            'messages': messages,
            'summary': doc.get('summary'),
            'created_at': doc['created_at']
        }

    def get_all_conversations(self):
        if not self.supabase: return []
        res = self.supabase.table('pdf_documents').select('id, filename, created_at').order('created_at', desc=True).execute()
        
        formatted = []
        for doc in res.data:
            formatted.append({
                'conversation_id': doc['id'],
                'doc_ids': [doc['id']],
                'filenames': [doc['filename']],
                'title': doc['filename'],
                'created_at': doc['created_at']
            })
        return formatted
