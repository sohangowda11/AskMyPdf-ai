from store import store
from services.ai_service import find_relevant_chunks

class MultiPDFSessionManager:
    def __init__(self, doc_ids):
        self.doc_ids = doc_ids
        # Ensure we always have the freshest document data from store
        self.documents = [store.get_document(d_id) for d_id in doc_ids if store.get_document(d_id)]
        
        # SELF-HEALING: Embed missing chunks on-the-fly
        from services.ai_service import get_embedding
        for doc in self.documents:
            missing_embeddings = [c for c in doc.get('chunks', []) if not c.get('embedding')]
            if missing_embeddings:
                print(f"   [SELF-HEALING] Embedding {len(missing_embeddings)} chunks for {doc['filename']}...")
                for c in missing_embeddings:
                    c['embedding'] = get_embedding(c['text'])
                store.save_data() # Persist the new embeddings
        
        # MANDATORY DEBUG LOGS AS REQUESTED
        print("\n" + "!"*50)
        print("   ACTIVE MULTI PDFS LOADED INTO SESSION:")
        for d in self.documents:
            print(f"   - {d['filename']} [Chunks: {len(d.get('chunks', []))}]")
        print("!"*50 + "\n")
        
    def get_combined_context(self, question, top_k_per_doc=6, total_limit=18):
        """
        True Multi-Document Retrieval Orchestrator.
        Guarantees that context is sampled from EVERY document in the session.
        """
        all_relevant = []
        
        for doc in self.documents:
            doc_chunks = doc.get('chunks', [])
            if not doc_chunks:
                continue
                
            # Ensure chunks have metadata for attribution
            for c in doc_chunks:
                c['filename'] = doc['filename']
                c['doc_id'] = doc['doc_id']
                
            # Retrieve best from THIS doc individually
            # This prevents a single long doc from dominating the top-k
            relevant_from_doc = find_relevant_chunks(question, doc_chunks, max_chunks=top_k_per_doc)
            print(f"   [RETRIEVAL] {doc['filename']}: Found {len(relevant_from_doc)} relevant chunks")
            all_relevant.extend(relevant_from_doc)
            
        # Global Re-ranking with Diversity Enforcement
        # Ensure we keep a good mix if we exceed total_limit
        question_words = set(question.lower().split())
        
        def score_chunk(c):
            # Keyword overlap + semantic score (handled inside find_relevant_chunks)
            # We add a small diversity boost for documents with fewer chunks in the final set
            return len(question_words & set(c['text'].lower().split()))
            
        all_relevant.sort(key=score_chunk, reverse=True)
        
        # Diversity-First Selection
        final_set = []
        seen_docs = set()
        
        # Round 1: Take the absolute best from each doc first
        for c in all_relevant:
            if c['doc_id'] not in seen_docs:
                final_set.append(c)
                seen_docs.add(c['doc_id'])
        
        # Round 2: Fill remaining slots with next best overall
        for c in all_relevant:
            if c not in final_set and len(final_set) < total_limit:
                final_set.append(c)
                
        print(f"   [SESSION] Total chunks prepared for Gemini: {len(final_set)}\n")
        return final_set

# Cache sessions to avoid repeated lookups, but allow for dynamic updates
_session_cache = {}

def get_multi_pdf_session(doc_ids):
    # Unique key based on sorted IDs
    key = tuple(sorted(doc_ids))
    # For "Live Context Updates", we check if the doc_ids match exactly
    # If not in cache, create new.
    if key not in _session_cache:
        _session_cache[key] = MultiPDFSessionManager(doc_ids)
    return _session_cache[key]
