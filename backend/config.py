import os
from dotenv import load_dotenv

# Base directory of the project
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

class Config:
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    GEMINI_API_KEY_PRIMARY = os.getenv('GEMINI_API_KEY_PRIMARY') or os.getenv('OPENAI_API_KEY')
    GEMINI_API_KEY_SECONDARY = os.getenv('GEMINI_API_KEY_SECONDARY')
    
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # Use absolute path for uploads to avoid CWD issues
    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv('UPLOAD_FOLDER', 'uploads'))
    
    try:
        MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 16 * 1024 * 1024))
    except (ValueError, TypeError):
        MAX_FILE_SIZE = 16 * 1024 * 1024
