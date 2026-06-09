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

    def add_document(self, filename, filepath, pages, chunks, doc_id=None, user_id=None):
        import logging
        logger = logging.getLogger(__name__)
        
        if not doc_id:
            doc_id = str(uuid.uuid4())
            
        full_text = ""
        if pages:
            full_text = "\n".join([str(p.get('text', '')) for p in pages])
        
        logger.info(f"!!! [PIPELINE_DB_INSERT] Preparing payload for DocID: {doc_id}")
        logger.info(f"!!! [PIPELINE_DB_INSERT] Text Length: {len(full_text)} | Chunks: {len(chunks)} | User: {user_id}")
        
        data = {
            'id': doc_id,
            'filename': filename,
            'filepath': filepath,
            'extracted_text': full_text,
            'page_count': len(pages),
            'chunks': chunks 
        }
        
        if user_id:
            data['user_id'] = str(user_id)
            
        if self.supabase:
            try:
                self.supabase.table('pdf_documents').upsert(data).execute()
                logger.info(f"!!! [PIPELINE_DB_INSERT] SUCCESS: DocID {doc_id} persisted to Supabase")
            except Exception as e:
                logger.error(f"!!! [PIPELINE_DB_INSERT] FAILED: {str(e)}")
                raise e
        return doc_id

    def get_document(self, doc_id, user_id=None):
        if not self.supabase: return None
        query = self.supabase.table('pdf_documents').select('*').eq('id', doc_id)
        if user_id:
            query = query.eq('user_id', user_id)
            
        res = query.execute()
        if res.data:
            doc = res.data[0]
            return {**doc, 'doc_id': doc['id']}
        return None

    def update_document_summary(self, doc_id, summary, user_id=None):
        if self.supabase:
            query = self.supabase.table('pdf_documents').update({'summary': summary}).eq('id', doc_id)
            if user_id:
                query = query.eq('user_id', user_id)
            query.execute()

    def update_chunks(self, doc_id, chunks, user_id=None):
        import logging
        logger = logging.getLogger(__name__)
        if self.supabase:
            logger.info(f"!!! [PIPELINE_DB_UPDATE] Persisting {len(chunks)} chunks/embeddings for DocID: {doc_id}")
            query = self.supabase.table('pdf_documents').update({'chunks': chunks}).eq('id', doc_id)
            if user_id:
                query = query.eq('user_id', user_id)
            query.execute()
            logger.info(f"!!! [PIPELINE_DB_UPDATE] SUCCESS: Embeddings persisted")

    def add_chat_message(self, doc_id, question, answer, sources=None):
        # We don't need user_id here as it's linked via document_id, 
        # and RLS will handle the insert permission.
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

    def get_chat_history(self, doc_id, user_id=None):
        if not self.supabase: return []
        # Join with pdf_documents to verify ownership if user_id is provided
        if user_id:
            # We can rely on RLS or do an explicit check. 
            # In this schema, we'll fetch via the document link.
            res = self.supabase.table('chat_history')\
                .select('*, pdf_documents!inner(user_id)')\
                .eq('document_id', doc_id)\
                .eq('pdf_documents.user_id', user_id)\
                .order('timestamp')\
                .execute()
        else:
            res = self.supabase.table('chat_history').select('*').eq('document_id', doc_id).order('timestamp').execute()
            
        return res.data if res.data else []

    def delete_conversation(self, doc_id, user_id=None):
        if not self.supabase: return False
        try:
            query = self.supabase.table('pdf_documents').delete().eq('id', doc_id)
            if user_id:
                query = query.eq('user_id', user_id)
            query.execute()
            return True
        except:
            return False

    def clear_all(self, user_id=None):
        if not self.supabase: return False
        try:
            query = self.supabase.table('pdf_documents').delete()
            if user_id:
                query = query.eq('user_id', user_id)
            else:
                query = query.neq('filename', '')
            query.execute()
            return True
        except:
            return False

    def update_conversation_title(self, doc_id, title, user_id=None):
        if not self.supabase: return False
        try:
            query = self.supabase.table('pdf_documents').update({'filename': title}).eq('id', doc_id)
            if user_id:
                query = query.eq('user_id', user_id)
            query.execute()
            return True
        except:
            return False

    def toggle_pin(self, doc_id, user_id=None):
        return False

    # --- COMPATIBILITY SHIMS ---
    
    def create_conversation(self, doc_ids, title=None, user_id=None):
        if not self.supabase: return doc_ids[0] if doc_ids else None
        
        if not isinstance(doc_ids, list) or len(doc_ids) <= 1:
            return doc_ids[0] if isinstance(doc_ids, list) else doc_ids
            
        import uuid
        conv_id = str(uuid.uuid4())
        title = title or f"Multi-PDF Session ({len(doc_ids)} docs)"
        
        data = {
            'id': conv_id,
            'filename': title,
            'filepath': 'virtual_multi_pdf',
            'extracted_text': '',
            'page_count': 0,
            'chunks': [{'multi_pdf_refs': doc_ids}]
        }
        if user_id:
            data['user_id'] = str(user_id)
            
        try:
            self.supabase.table('pdf_documents').insert(data).execute()
            return conv_id
        except Exception as e:
            print(f"Failed to create multi-pdf session: {e}")
            return doc_ids[0]

    def add_message(self, doc_id, role, content, sources=None):
        pass

    def get_conversation(self, doc_id, user_id=None):
        doc = self.get_document(doc_id, user_id=user_id)
        if not doc: return None
        
        actual_doc_ids = [doc_id]
        if doc.get('filepath') == 'virtual_multi_pdf':
            chunks = doc.get('chunks', [])
            if chunks and isinstance(chunks, list) and len(chunks) > 0 and 'multi_pdf_refs' in chunks[0]:
                actual_doc_ids = chunks[0]['multi_pdf_refs']
        
        history = self.get_chat_history(doc_id, user_id=user_id)
        messages = []
        for h in history:
            messages.append({'role': 'user', 'content': h['question'], 'timestamp': h['timestamp']})
            messages.append({'role': 'assistant', 'content': h['answer'], 'sources': h['sources'], 'timestamp': h['timestamp']})
            
        return {
            'conversation_id': doc_id,
            'doc_id': doc_id,
            'doc_ids': actual_doc_ids,
            'title': doc['filename'],
            'messages': messages,
            'summary': doc.get('summary'),
            'created_at': doc['created_at']
        }

    def get_all_conversations(self, user_id=None):
        if not self.supabase: return []
        
        query = self.supabase.table('pdf_documents').select('id, filename, created_at')
        
        if user_id:
            query = query.eq('user_id', user_id)
            
        res = query.order('created_at', desc=True).execute()
        
        formatted = []
        for doc in res.data:
            doc_ids = [doc['id']]
            if doc.get('filepath') == 'virtual_multi_pdf':
                chunks = doc.get('chunks', [])
                if chunks and isinstance(chunks, list) and len(chunks) > 0 and 'multi_pdf_refs' in chunks[0]:
                    doc_ids = chunks[0]['multi_pdf_refs']
                    
            formatted.append({
                'conversation_id': doc['id'],
                'doc_ids': doc_ids,
                'filenames': [doc['filename']],
                'title': doc['filename'],
                'created_at': doc['created_at'],
                'is_multi': doc.get('filepath') == 'virtual_multi_pdf'
            })
        return formatted
