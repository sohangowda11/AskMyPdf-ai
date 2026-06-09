import json
import logging
from openai import OpenAI
from config import Config

logger = logging.getLogger(__name__)

def get_client(key):
    if key and key.startswith("AIza"):
        return OpenAI(api_key=key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
    return OpenAI(api_key=key)

def get_primary_client():
    return get_client(Config.GEMINI_API_KEY_PRIMARY)

def get_secondary_client():
    return get_client(Config.GEMINI_API_KEY_SECONDARY)

def _run_gemini_native(key, messages, temperature=0.3, max_tokens=1000):
    """Direct REST call to Gemini v1beta for guaranteed reliability."""
    import requests
    
    # Try multiple verified model names from the user's available list
    models_to_try = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-pro-latest"]
    
    last_error = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        
        # Convert OpenAI message format to Gemini format
        contents = []
        for m in messages:
            role = "model" if m['role'] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": m['content']}]})
            
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        
        try:
            logger.info(f"!!! [AI_SERVICE] Attempting NATIVE Gemini call with: {model}")
            response = requests.post(url, json=payload, timeout=30)
            res_data = response.json()
            
            if 'candidates' in res_data:
                text = res_data['candidates'][0]['content']['parts'][0]['text']
                # Mock an OpenAI response object
                class MockResponse:
                    class Choice:
                        class Message:
                            def __init__(self, content): self.content = content
                        def __init__(self, content): self.message = self.Message(content)
                    def __init__(self, content): self.choices = [self.Choice(content)]
                
                return MockResponse(text)
            else:
                logger.warning(f"!!! [AI_SERVICE] Native model {model} failed: {res_data}")
                last_error = Exception(f"Gemini Native Error: {res_data}")
                continue
        except Exception as e:
            logger.warning(f"!!! [AI_SERVICE] Native model {model} request failed: {str(e)}")
            last_error = e
            continue
            
    logger.error(f"!!! [AI_SERVICE] ALL Native Gemini models failed.")
    raise last_error

def _run_completion(c, messages, temperature=0.3, max_tokens=1000):
    # Check if this is a Gemini client using our custom base_url
    is_gemini = hasattr(c, 'base_url') and "generativelanguage" in str(c.base_url)
    
    if is_gemini:
        # BYPASS the broken OpenAI compatibility layer and use REST directly
        return _run_gemini_native(c.api_key, messages, temperature, max_tokens)

    # Standard OpenAI path
    models_to_try = ["gpt-4o-mini", "gpt-3.5-turbo"]
    
    last_error = None
    for model_name in models_to_try:
        try:
            logger.info(f"!!! [AI_SERVICE] Attempting OpenAI completion with model: {model_name}")
            return c.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as e:
            last_error = e
            logger.warning(f"!!! [AI_SERVICE] OpenAI Model {model_name} failed: {str(e)}")
            continue
            
    logger.error(f"!!! [AI_SERVICE] ALL models failed for client. Last error: {str(last_error)}")
    raise last_error

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

def find_relevant_chunks(question, chunks, max_chunks=12):
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
        norm_keyword = min(keyword_score / 10.0, 1.0)
        total_score = (norm_keyword * 0.3) + (semantic_score * 0.7)
        
        scored.append((total_score, chunk))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:max_chunks]]


def ask_question(question, relevant, conversation_history=None):
    """Ask a high-fidelity question about documents with rich context."""
    # Build context with clear document attribution and page mapping
    context_parts = []
    for i, c in enumerate(relevant):
        doc_name = c.get('filename', 'Unknown Document')
        context_parts.append(f"### [SOURCE {i+1}]: {doc_name} (Page {c['page']})\n{c['text']}")
    
    context = "\n\n---\n\n".join(context_parts)

    system_prompt = (
        "You are an Elite Document Intelligence System.\n\n"
        "STRICT OPERATIONAL RULES:\n"
        "1. PROVIDE DEPTH. Do not be shallow. Use the provided context to give detailed, professional, and accurate answers.\n"
        "2. DOCUMENT ATTRIBUTION: Explicitly mention which source/PDF you are referencing. Use phrases like 'According to Source 1...' or 'The [filename] document states...'.\n"
        "3. FORMATTING: Use clean Markdown (bullet points, bold text, numbered lists). Avoid unnecessary fluff.\n"
        "4. TRUTH ONLY: If the answer is not in the context, state that clearly but offer to explain related concepts if possible.\n\n"
        "FOLLOW-UP GENERATION:\n"
        "At the very end, provide exactly 2-3 highly intelligent follow-up questions tailored to the user's specific query.\n"
        "Format exactly like this (no other text after):\n\n"
        "SOURCES: [{\"text\": \"Exact text fragment\", \"page\": 1, \"filename\": \"doc.pdf\"}]\n"
        "SUGGESTIONS: [Question 1] | [Question 2] | [Question 3]"
    )

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    if conversation_history:
        for msg in conversation_history[-10:]: # Include more history for better flow
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })

    messages.append({
        "role": "user",
        "content": f"Multi-Document Context:\n{context}\n\nUser Question: {question}"
    })

    logger.info(f"!!! [DEBUG_CHAT] Prompt context length: {len(context)} characters from {len(relevant)} chunks")
    try:
        response = _run_completion(get_primary_client(), messages, temperature=0.3, max_tokens=8192)
    except Exception as e:
        logger.warning(f"Primary AI failed, falling back to secondary: {str(e)}")
        response = _run_completion(get_secondary_client(), messages, temperature=0.3, max_tokens=8192)

    answer = response.choices[0].message.content
    logger.info(f"!!! [DEBUG_CHAT] Response received. Length: {len(answer)} characters")
    
    # Include filename in sources
    sources = [{'page': c['page'], 'text': c['text'][:200] + '...', 'filename': c.get('filename')} for c in relevant[:6]]

    return answer, sources


def summarize(full_text):
    """
    Generate a high-quality, multi-section summary of the document.
    Scales detail based on document length.
    """
    # Increase window for Gemini's large context
    text_limit = 30000 
    text = full_text[:text_limit] if len(full_text) > text_limit else full_text

    system_prompt = (
        "You are an Elite Document Intelligence System.\n\n"
        "GOAL: Generate a comprehensive, professional, and insightful summary of the provided text.\n\n"
        "STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS:\n\n"
        "1. OVERVIEW: A professional 2-3 sentence executive summary.\n"
        "2. KEY CONCEPTS: 3-5 core pillars or themes discussed.\n"
        "3. DETAILED INSIGHTS: A structured breakdown of the most important points, technical details, or data.\n"
        "4. TERMINOLOGY & DEFINITIONS: Important terms, formulas, or jargon defined (if applicable).\n"
        "5. CRITICAL TAKEAWAYS: Actionable conclusions or final summary thoughts.\n\n"
        "STYLE RULES:\n"
        "- Use clean Markdown (headings, bullet points, bolding).\n"
        "- Scale the detail level based on the document complexity. Do NOT write a short summary if the document is large. Provide a DEEP dive.\n"
        "- Be insightful, not just descriptive.\n\n"
        "FOLLOW-UP SUGGESTIONS:\n"
        "At the very end, provide exactly 3-4 smart, high-value follow-up questions for the user.\n"
        "Format exactly like this (no other text after):\n\n"
        "SUGGESTIONS: [Question 1] | [Question 2] | [Question 3] | [Question 4]"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Please analyze and summarize this document:\n\n{text}"}
    ]

    try:
        logger.info(f"!!! [DEBUG_SUMMARY] Requesting summary for text of length: {len(text)} characters")
        response = _run_completion(get_primary_client(), messages, temperature=0.3, max_tokens=8192)
    except Exception as e:
        logger.warning(f"Primary Summarization failed, falling back to secondary: {str(e)}")
        response = _run_completion(get_secondary_client(), messages, temperature=0.3, max_tokens=8192)

    answer = response.choices[0].message.content
    logger.info(f"!!! [DEBUG_SUMMARY] Summary generated. Length: {len(answer)} characters")
    return answer


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
    """
    text = full_text[:20000] if len(full_text) > 20000 else full_text
    
    system_prompt = (
        "You are an expert AI tutor specialized in simplification without losing essence.\n\n"
        "GOAL: Explain complex document concepts in a way that is easy to understand but still deep and accurate.\n\n"
        "GUIDELINES:\n"
        "- Use relatable analogies and real-world examples.\n"
        "- Break down technical jargon into plain language.\n"
        "- Use Markdown (bolding, lists, headings) for readability.\n"
        "- Be encouraging and tutor-like.\n\n"
        "FOLLOW-UP GENERATION:\n"
        "At the very end, provide exactly 3 smart follow-up prompts.\n"
        "Format: SUGGESTIONS: [Prompt 1] | [Prompt 2] | [Prompt 3]"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Document Content:\n{text}\n\n" + (f"Specific Topic to Explain: {user_question}" if user_question else "Explain the core concepts of this document simply.")}
    ]

    try:
        response = _run_completion(get_primary_client(), messages, temperature=0.5, max_tokens=1500)
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"Primary explanation failed, falling back: {e}")
        response = _run_completion(get_secondary_client(), messages, temperature=0.5, max_tokens=1500)
        return response.choices[0].message.content

def explain_document(full_text):
    """Old alias for explain_simply for compatibility."""
    return explain_simply(full_text)

def rewrite_text(text):
    """Rewrite text for maximum clarity and professional impact."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a Senior Editor and Writing Assistant.\n"
                "GOAL: Rewrite the provided text to be professional, clear, and high-impact while maintaining all core information.\n"
                "RULES:\n"
                "1. Use professional, clean formatting with Markdown.\n"
                "2. Improve sentence structure and flow.\n"
                "3. Ensure the tone is authoritative and polished."
            )
        },
        {
            "role": "user",
            "content": f"Please rewrite this text professionally:\n\n{text}"
        }
    ]

    response = _run_completion(get_primary_client(), messages, temperature=0.4, max_tokens=1500)
    return response.choices[0].message.content


import re

def generate_study_toolkit(full_text):
    """
    Industrial-grade Study Toolkit pipeline with rich, deep content generation.
    """
    text = full_text[:25000] if len(full_text) > 25000 else full_text
    
    prompt = (
        "You are an Elite AI Study Architect.\n\n"
        "Analyze the document and return ONLY STRICT VALID JSON.\n\n"
        "Generate deep, high-value study materials:\n"
        "1. keyConcepts: 5-8 major themes with detailed 2-sentence descriptions.\n"
        "2. definitions: 5-10 technical terms or jargon defined professionally.\n"
        "3. examQuestions: 5 likely high-difficulty exam questions.\n"
        "4. flashcards: 8 high-quality study cards (front/back).\n"
        "5. miniQuiz: 5 challenging MCQs with options, correct index, and detailed explanations.\n"
        "6. revisionNotes: Detailed, structured summary notes using bullet points.\n\n"
        "RULES:\n"
        "- NO MARKDOWN symbols inside the JSON strings.\n"
        "- Ensure the JSON is perfectly valid.\n\n"
        "Required JSON structure:\n"
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
            client_to_use = get_primary_client() if attempt == 0 else get_secondary_client()
            logger.info(f"!!! [DEBUG_TOOLKIT] Requesting toolkit generation (Attempt {attempt+1}) for text length: {len(text)}")
            response = _run_completion(client_to_use, messages, temperature=0.5, max_tokens=8192)
            raw_content = response.choices[0].message.content.strip()
            logger.info(f"!!! [DEBUG_TOOLKIT] Toolkit generated. Length: {len(raw_content)} characters")
            
            # Cleaning logic
            cleaned = raw_content
            if "```json" in cleaned: cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned: cleaned = cleaned.split("```")[1].split("```")[0]
            
            json_match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
            if json_match: cleaned = json_match.group(1)
            
            data = json.loads(cleaned.strip())
            
            # Sanitization for quiz
            if "miniQuiz" in data:
                for q in data["miniQuiz"]:
                    if not isinstance(q, dict): continue
                    val = q.get("correct")
                    if isinstance(val, str):
                        v = val.strip().upper()
                        if v in ["A", "B", "C", "D"]: q["correct"] = ord(v) - ord("A")
                        elif v.isdigit(): q["correct"] = int(v)
            
            return data
        except Exception as e:
            logger.warning(f"Study Toolkit attempt {attempt+1} failed: {e}")
            if attempt == max_attempts - 1: break
    
    return {
        "keyConcepts": ["Analysis encountered a temporary snag."],
        "definitions": [{"term": "Status", "definition": "Please click 'Retry Analysis' to try again."}],
        "examQuestions": [],
        "flashcards": [],
        "miniQuiz": [],
        "revisionNotes": ["We couldn't generate detailed insights for this document right now."]
    }

def generate_flashcards(full_text):
    """Generate 10 high-quality flashcards."""
    text = full_text[:15000] if len(full_text) > 15000 else full_text
    messages = [
        {"role": "system", "content": "Generate 10 high-quality study flashcards in JSON array: [{'front': '...', 'back': '...'}]"},
        {"role": "user", "content": text}
    ]
    try:
        response = _run_completion(get_primary_client(), messages, temperature=0.5, max_tokens=2000)
        content = response.choices[0].message.content.strip()
        if "```json" in content: content = content.split("```json")[1].split("```")[0]
        return json.loads(content)
    except:
        return [{"front": "Error", "back": "Failed to generate."}]

def run_advanced_tool(full_text, tool_name):
    """Run specialized advanced document tools with high-fidelity prompts."""
    text = full_text[:25000] if len(full_text) > 25000 else full_text

    prompts = {
        'explain_simply': (
            "You are an expert teacher. Explain this document like I'm a beginner but do not sacrifice detail.\n"
            "Break down complex systems and use analogies. Use rich Markdown for structure."
        ),
        'notes': (
            "You are a Master Note-Taker. Create comprehensive, structured revision notes from this document.\n"
            "Use clear headings, bold important terms, and organize by hierarchy of importance. Use full Markdown."
        ),
        'exam_prep': (
            "You are an Elite Exam Coach. Create a high-stakes study guide from this document.\n"
            "Identify likely exam questions, core theory topics to memorize, and Viva/oral exam questions.\n"
            "Provide brief model answers for each question using Markdown."
        ),
        'study': (
            "You are a Premium AI Study Architect. Provide a comprehensive, deep-dive Study Mode output.\n"
            "Sections: Key Concepts, Detailed Revision Notes, Predicted Exam Questions, and a High-Level Summary.\n"
            "Use clean, professional Markdown formatting (Headings, Bullets, Bolding)."
        )
    }

    if tool_name not in prompts:
        raise ValueError("Invalid tool name.")

    messages = [
        {"role": "system", "content": prompts[tool_name]},
        {"role": "user", "content": f"Analyze this content:\n\n{text}"}
    ]

    response = _run_completion(get_secondary_client(), messages, temperature=0.4, max_tokens=2500)
    return response.choices[0].message.content
