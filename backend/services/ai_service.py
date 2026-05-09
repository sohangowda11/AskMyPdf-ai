import json
from openai import OpenAI
from config import Config

def get_client(key):
    if key and key.startswith("AIza"):
        return OpenAI(api_key=key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
    return OpenAI(api_key=key)

def get_primary_client():
    return get_client(Config.GEMINI_API_KEY_PRIMARY)

def get_secondary_client():
    return get_client(Config.GEMINI_API_KEY_SECONDARY)

def _run_completion(c, messages, temperature=0.3, max_tokens=1000):
    is_gemini = hasattr(c, 'base_url') and "generativelanguage" in str(c.base_url)
    model_name = "gemini-1.5-flash-latest" if is_gemini else "gpt-4o-mini"
    try:
        return c.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
    except Exception as e:
        print(f"API Error ({model_name}): {str(e)}")
        raise e

def get_embedding(text, client=None):
    """Generate embedding for a text chunk using Gemini."""
    if client is None:
        client = get_secondary_client()
    try:
        # Limit text for embedding safety
        clean_text = text[:1000].replace("\n", " ")
        is_gemini = hasattr(client, 'base_url') and "generativelanguage" in str(client.base_url)
        model = "text-embedding-004" if is_gemini else "text-embedding-3-small"
        
        response = client.embeddings.create(
            model=model,
            input=clean_text,
            encoding_format="float"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

def find_relevant_chunks(question, chunks, max_chunks=8):
    """Find most relevant chunks using Semantic + Keyword Hybrid search."""
    import numpy as np
    
    question_words = set(question.lower().split())
    query_embedding = get_embedding(question)
    
    scored = []
    for chunk in chunks:
        # 1. Keyword Score (Overlap)
        metadata_text = f"{chunk.get('filename', '')} {chunk['text']}".lower()
        chunk_words = set(metadata_text.split())
        keyword_score = len(question_words & chunk_words)
        
        # 2. Semantic Score (Cosine Similarity)
        semantic_score = 0
        if query_embedding and chunk.get('embedding'):
            try:
                # Simple cosine similarity
                q = np.array(query_embedding)
                c = np.array(chunk['embedding'])
                semantic_score = np.dot(q, c) / (np.linalg.norm(q) * np.linalg.norm(c))
            except:
                pass
        
        # Hybrid Rank: 30% Keyword, 70% Semantic
        # Normalizing keyword score roughly (assuming max overlap of 10)
        norm_keyword = min(keyword_score / 10.0, 1.0)
        total_score = (norm_keyword * 0.3) + (semantic_score * 0.7)
        
        scored.append((total_score, chunk))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:max_chunks]]


def ask_question(question, relevant, conversation_history=None):
    """Ask a question about documents with provided context chunks."""
    # Build context with clear document attribution
    context_parts = []
    for i, c in enumerate(relevant):
        doc_name = c.get('filename', 'Unknown Document')
        context_parts.append(f"### [DOCUMENT {i+1}]: {doc_name} (Page {c['page']})\n{c['text']}")
    
    context = "\n\n---\n\n".join(context_parts)

    messages = [
        {
            "role": "system",
            "content": (
                "You are an Elite Multi-PDF Document Intelligence System.\n\n"
                "CONTEXT OVERVIEW:\n"
                "You have been provided with chunks from MULTIPLE DIFFERENT PDF DOCUMENTS. "
                "Your primary mission is to synthesize, compare, and reason across ALL these documents simultaneously.\n\n"
                "STRICT OPERATING RULES:\n"
                "1. NEVER assume there is only one document. Always check the SOURCE attribution for every chunk.\n"
                "2. When answering, EXPLICITLY reference which PDF each piece of information came from (e.g., 'According to Resume.pdf...' or 'In contrast, OfferLetter.pdf states...').\n"
                "3. If the user asks for a comparison, create structured sections like 'COMMONALITIES' and 'DIFFERENCES'.\n"
                "4. If one document mentions something and another doesn't, point that out clearly.\n"
                "5. Your goal is to provide a unified, intelligent response that combines the knowledge of all provided PDFs.\n"
                "6. Use professional, clean formatting with bullet points. Avoid markdown symbols like ## or ** unless absolutely necessary for clarity.\n\n"
                "FOLLOW-UP GENERATION:\n"
                "At the very end of your response, you MUST provide exactly 2-3 smart follow-up questions.\n"
                "Before the suggestions, provide the exact text matches used with their document names.\n"
                "Format exactly like this (no other text after):\n\n"
                "SOURCES: [{\"text\": \"Exact text\", \"page\": 1, \"filename\": \"doc.pdf\"}]\n"
                "SUGGESTIONS: [Question 1] | [Question 2] | [Question 3]"
            )
        }
    ]

    if conversation_history:
        for msg in conversation_history[-8:]: # Increased history for better context
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })

    messages.append({
        "role": "user",
        "content": f"Multi-Document Context:\n{context}\n\nQuestion: {question}"
    })

    response = _run_completion(get_primary_client(), messages, temperature=0.3, max_tokens=1200)

    answer = response.choices[0].message.content
    # Include filename in sources
    sources = [{'page': c['page'], 'text': c['text'][:150] + '...', 'filename': c.get('filename')} for c in relevant[:4]]

    return answer, sources


def summarize(full_text):
    """Generate a concise summary of the document."""
    text = full_text[:8000] if len(full_text) > 8000 else full_text

    messages = [
        {
            "role": "system",
            "content": (
                "You are a premium AI assistant similar to ChatGPT.\n\n"
                "Your job is to summarize this document naturally and intelligently.\n\n"
                "Rules:\n"
                "- Start with a conversational intro (e.g., 'Here is a quick summary:').\n"
                "- Sound conversational and human-like\n"
                "- Explain clearly and confidently\n"
                "- Structure answers cleanly\n"
                "- Use bullet points when useful\n"
                "- Avoid robotic wording or raw PDF extraction dumps\n"
                "- Focus on meaning and understanding\n"
                "- Never output markdown symbols like ** or ##\n"
                "- DO NOT output large walls of text.\n\n"
                "FOLLOW-UP GENERATION:\n"
                "At the very end of your response, provide exactly 2-3 smart follow-up questions about the document.\n"
                "Format: SUGGESTIONS: [Question 1] | [Question 2] | [Question 3]\n\n"
                "Your responses should feel polished, intelligent, and natural."
            )
        },
        {
            "role": "user",
            "content": f"Document text:\n\n{text}"
        }
    ]

    response = _run_completion(get_primary_client(), messages, temperature=0.3, max_tokens=800)

    return response.choices[0].message.content


def generate_quiz(full_text, num_questions=5):
    """Generate MCQ quiz questions from the document."""
    text = full_text[:8000] if len(full_text) > 8000 else full_text

    messages = [
        {
            "role": "system",
            "content": (
                "You are a quiz generator. Generate multiple choice questions based on the document. "
                "Return ONLY valid JSON array. Each question object must have: "
                '"question" (string), "options" (array of 4 strings), "correct" (index 0-3), "explanation" (string). '
                "Do not include any text outside the JSON array."
            )
        },
        {
            "role": "user",
            "content": f"Generate {num_questions} MCQ questions from this document:\n\n{text}"
        }
    ]

    response = _run_completion(get_primary_client(), messages, temperature=0.5, max_tokens=2000)

    try:
        content = response.choices[0].message.content.strip()
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
        return json.loads(content)
    except (json.JSONDecodeError, IndexError):
        return [{
            "question": "Could not generate quiz. Please try again.",
            "options": ["N/A", "N/A", "N/A", "N/A"],
            "correct": 0,
            "explanation": "Quiz generation failed."
        }]


def explain_simply(full_text, user_question=None):
    """
    FEATURE 2: Explain Like I'm a Beginner
    Translates complex content into simple, conversational tutor-like explanations.
    Uses PRIMARY GEMINI KEY as requested.
    """
    text = full_text[:12000] if len(full_text) > 12000 else full_text
    
    system_prompt = (
        "You are an expert AI tutor.\n\n"
        "Your job is to explain difficult content in the simplest possible way.\n\n"
        "Rules:\n"
        "- explain like teaching a beginner\n"
        "- use conversational language\n"
        "- use short paragraphs\n"
        "- use bullet points (•)\n"
        "- use relatable examples\n"
        "- avoid jargon\n"
        "- avoid robotic wording\n"
        "- explain clearly like ChatGPT\n"
        "- make technical content easy to understand\n"
        "- Never output markdown symbols like ** or ##\n\n"
        "DO NOT:\n"
        "- dump raw OCR text\n"
        "- use academic wording unnecessarily\n"
        "- generate giant paragraphs\n\n"
        "FOLLOW-UP GENERATION:\n"
        "At the very end of your response, you MUST provide exactly 3 smart follow-up prompts for the user.\n"
        "Format exactly like this (no other text after): \n\n"
        "SUGGESTIONS: [Prompt 1] | [Prompt 2] | [Prompt 3]"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Document Content:\n{text}\n\n" + (f"Specific Topic to Explain: {user_question}" if user_question else "Explain the core concepts of this document simply.")}
    ]

    try:
        response = _run_completion(get_primary_client(), messages, temperature=0.5, max_tokens=1200)
        return response.choices[0].message.content
    except Exception as e:
        print(f"AI Service Error (explain_simply): {str(e)}")
        raise e

def explain_document(full_text):
    """Old alias for explain_simply for compatibility."""
    return explain_simply(full_text)

def rewrite_text(text):
    """Rewrite text in simpler language."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a writing assistant. Rewrite in clearer, simpler, pointwise language.\n"
                "RULES:\n"
                "1. BE CONCISE. Maximum 2-3 bullet points.\n"
                "2. DO NOT use markdown symbols like ** or ##.\n"
                "3. Use short sentences."
            )
        },
        {
            "role": "user",
            "content": f"Please rewrite this text simply:\n\n{text}"
        }
    ]

    response = _run_completion(get_primary_client(), messages, temperature=0.4, max_tokens=800)

    return response.choices[0].message.content


import re

def generate_study_toolkit(full_text):
    """
    Industrial-grade Study Toolkit pipeline with safe cleaning and retry logic.
    Follows user's exact prompt and response flow requirements.
    """
    text = full_text[:12000] if len(full_text) > 12000 else full_text
    
    # EXACT Gemini Prompt as requested
    prompt = (
        "You are an AI Study Toolkit assistant.\n\n"
        "Analyze the uploaded PDF and return ONLY STRICT VALID JSON.\n\n"
        "Generate:\n\n"
        "key concepts\n"
        "important definitions\n"
        "likely exam questions\n"
        "flashcards\n"
        "mini quiz\n"
        "revision notes\n\n"
        "Rules:\n\n"
        "concise explanations\n"
        "student-friendly wording\n"
        "no markdown\n"
        "no extra commentary\n"
        "no explanation outside JSON\n"
        "return ONLY valid JSON\n\n"
        "Required JSON structure:\n\n"
        "{\n"
        '  "keyConcepts": [],\n'
        '  "definitions": [{"term": "string", "definition": "string"}],\n'
        '  "examQuestions": [],\n'
        '  "flashcards": [{"front": "string", "back": "string"}],\n'
        '  "miniQuiz": [{"question": "string", "options": ["string"], "correct": 0, "explanation": "string"}],\n'
        '  "revisionNotes": []\n'
        "}"
    )

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Analyze this document content:\n\n{text}"}
    ]

    max_attempts = 2
    for attempt in range(max_attempts):
        try:
            # Use secondary client for attempt 1, fallback to primary for attempt 2 if needed
            client_to_use = get_secondary_client() if attempt == 0 else get_primary_client()
            print(f"Study Toolkit: Attempt {attempt + 1}...")
            
            response = _run_completion(client_to_use, messages, temperature=0.5, max_tokens=3000)
            raw_content = response.choices[0].message.content.strip()
            
            # SAFE CLEANING LOGIC (EXACTLY AS REQUESTED)
            # 1. Strip markdown wrappers
            cleaned = raw_content
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            # 2. Trim whitespace
            cleaned = cleaned.strip()
            
            # 3. Handle potential commentary before/after JSON using regex
            json_match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
            if json_match:
                cleaned = json_match.group(1)
            
            # 4. Validate JSON
            data = json.loads(cleaned)
            
            # 5. Guarantee structured response keys
            required = ["keyConcepts", "definitions", "examQuestions", "flashcards", "miniQuiz", "revisionNotes"]
            for key in required:
                if key not in data or not isinstance(data[key], list):
                    data[key] = []
            
            # Deep Sanitization for Mini Quiz (Match correct answers)
            if "miniQuiz" in data:
                for q in data["miniQuiz"]:
                    if not isinstance(q, dict): continue
                    val = q.get("correct")
                    if isinstance(val, str):
                        # Convert letter or string number
                        v = val.strip().upper()
                        if v in ["A", "B", "C", "D"]: q["correct"] = ord(v) - ord("A")
                        elif v.isdigit(): q["correct"] = int(v)
                        else:
                            # Search for match in options
                            q["correct"] = 0
                            for idx, opt in enumerate(q.get("options", [])):
                                if str(opt).lower() == v.lower():
                                    q["correct"] = idx
                                    break
            
            print("Study Toolkit: Generation Successful.")
            return data
            
        except Exception as e:
            print(f"Study Toolkit: Attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_attempts - 1:
                break
    
    # FAILSAFE FALLBACK (Only if all attempts fail)
    return {
        "keyConcepts": ["Analysis encountered a temporary snag."],
        "definitions": [{"term": "Status", "definition": "Please click 'Retry Analysis' to try again."}],
        "examQuestions": [],
        "flashcards": [],
        "miniQuiz": [],
        "revisionNotes": ["We couldn't generate detailed insights for this document right now."]
    }


def generate_flashcards(full_text):
    """Generate 5 key concept flashcards from the document."""
    text = full_text[:8000] if len(full_text) > 8000 else full_text

    response = _run_completion(get_secondary_client(), [
        {
            "role": "system",
            "content": (
                "You are a study assistant. Generate 5 high-quality flashcards from the document. "
                "Return ONLY a valid JSON array of objects. Each object must have: "
                "'front' (the question or concept) and 'back' (the answer or definition). "
                "Do not include any text outside the JSON array."
            )
        },
        {
            "role": "user",
            "content": f"Generate 5 flashcards from this document:\n\n{text}"
        }
    ], temperature=0.5, max_tokens=1500)
    
    try:
        content = response.choices[0].message.content.strip()
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
        return json.loads(content)
    except (json.JSONDecodeError, IndexError):
        return [
            {"front": "Error", "back": "Failed to generate flashcards. Please try again."},
            {"front": "Tip", "back": "Ensure the document contains readable text."}
        ]

def run_advanced_tool(full_text, tool_name):
    """Run specialized advanced document tools."""
    text = full_text[:12000] if len(full_text) > 12000 else full_text

    prompts = {
        'explain_simply': (
            "You are a teacher explaining this document to a beginner.\n"
            "1. Start with 'Here is a simple explanation:'\n"
            "2. Break down complex terms.\n"
            "3. Use real-world examples.\n"
            "4. Keep it concise, using bullet points.\n"
            "5. NO markdown symbols like ** or ##."
        ),
        'notes': (
            "You are an expert note-taker. Generate concise, revision-friendly notes from this document.\n"
            "1. Group by key topics.\n"
            "2. Use bullet points.\n"
            "3. Highlight main takeaways.\n"
            "4. Keep it brief and structured.\n"
            "5. NO markdown symbols like ** or ##."
        ),
        'exam_prep': (
            "You are an exam prep assistant. Generate a study guide from this document.\n"
            "1. List 3 Likely Exam Questions.\n"
            "2. List 3 Important Theory Topics to memorize.\n"
            "3. List 2 Viva/Oral questions.\n"
            "4. Format cleanly using spacing.\n"
            "5. NO markdown symbols like ** or ##."
        ),
        'study': (
            "You are a premium AI study assistant. Analyze this document and provide a comprehensive Study Mode output.\n"
            "Return exactly 4 sections in this format (using single empty lines between sections):\n\n"
            "Key Concepts:\n"
            "• [Concept 1]\n"
            "• [Concept 2]...\n\n"
            "Revision Notes:\n"
            "• [Point 1]\n"
            "• [Point 2]...\n\n"
            "Important Questions:\n"
            "• [Question 1]?\n"
            "• [Question 2]?...\n\n"
            "Quick Summary:\n"
            "• [Summary sentence 1]\n"
            "• [Summary sentence 2]...\n\n"
            "RULES:\n"
            "1. BE CONCISE and INTELLIGENT.\n"
            "2. DO NOT use markdown symbols like ** or ##.\n"
            "3. Use bullet points (•) for all items."
        )
    }

    if tool_name not in prompts:
        raise ValueError("Invalid tool name.")

    messages = [
        {
            "role": "system",
            "content": prompts[tool_name]
        },
        {
            "role": "user",
            "content": f"Document content:\n\n{text}"
        }
    ]

    response = _run_completion(get_secondary_client(), messages, temperature=0.4, max_tokens=1500)
    return response.choices[0].message.content
