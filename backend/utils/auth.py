from functools import wraps
from flask import request, jsonify
from supabase import create_client, Client
from config import Config
import logging

logger = logging.getLogger(__name__)

# Create a Supabase client just for auth verification
if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase = None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not supabase:
            logger.error("Auth middleware failed: Supabase client not initialized")
            return jsonify({"error": "Server misconfiguration"}), 500

        auth_header = request.headers.get("Authorization", None)
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        token = auth_header.split(" ")[1]
        try:
            # Verify the JWT using Supabase
            print(f">>> [AUTH_DEBUG] Verifying token: {token[:15]}...")
            user_response = supabase.auth.get_user(token)
            
            if not user_response or not user_response.user:
                print(">>> [AUTH_DEBUG] No user found in response")
                return jsonify({"error": "Invalid or expired token"}), 401
                
            # Attach the user object to Flask's thread-safe global 'g'
            from flask import g
            g.user = user_response.user
            print(f">>> [AUTH_DEBUG] Auth Success: {g.user.id}")
            
        except Exception as e:
            print(f">>> [AUTH_DEBUG] Auth verification FAILED: {str(e)}")
            logger.error(f"Auth verification failed: {str(e)}")
            return jsonify({"error": "Authentication failed", "details": str(e)}), 401
            
        return f(*args, **kwargs)
    return decorated
