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
            print("   [DB] Supabase PostgreSQL Store Initialized.")
        else:
            self.supabase = None
            print("   [DB] WARNING: Supabase credentials missing. Persistence disabled.")

    def save_data(self):
        """Dummy for compatibility."""
        pass

    def add_document(self, filename, filepath, pages, chunks):
        doc_id = str(uuid.uuid4())
        # Combine pages into full text for permanent storage
        full_text = "\n".join([p['text'] for p in pages])
        
        data = {
            'id': doc_id,
            'filename': filename,
            'filepath': filepath,
            'extracted_text': full_text, # Your requested field
            'page_count': len(pages),
            # 'chunks' are stored in the JSONB field for AI retrieval
            'chunks': chunks 
        }
        if self.supabase:
            self.supabase.table('pdf_documents').insert(data).execute()
        return doc_id

    def get_document(self, doc_id):
        if not self.supabase: return None
        res = self.supabase.table('pdf_documents').select('*').eq('id', doc_id).execute()
        if res.data:
            doc = res.data[0]
            # Convert back to app format (doc_id vs id)
            return {**doc, 'doc_id': doc['id']}
        return None

    def update_document_summary(self, doc_id, summary):
        if self.supabase:
            self.supabase.table('pdf_documents').update({'summary': summary}).eq('id', doc_id).execute()

    def add_chat_message(self, doc_id, question, answer, sources=None):
        """Maps to your ChatHistory table requirements."""
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

    # --- COMPATIBILITY SHIMS FOR EXISTING ROUTES ---
    # The existing routes use 'conversation' terminology. 
    # For now, we map 'conversation' to 'document_id' to keep everything working.
    
    def create_conversation(self, doc_id, title=None):
        # In our persistent schema, the PDFDocument IS the root of the conversation
        return doc_id 

    def add_message(self, doc_id, role, content, sources=None):
        # We handle this by updating the chat_history
        # If user asks, we store it. If assistant answers, we pair them.
        # This is a slightly different flow, so we'll adapt chat.py shortly.
        pass

    def get_conversation(self, doc_id):
        doc = self.get_document(doc_id)
        if not doc: return None
        
        history = self.get_chat_history(doc_id)
        # Transform history into message format for frontend
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
