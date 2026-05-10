import os
import logging
from config import Config

logger = logging.getLogger(__name__)

# Decide which store to use
store = None

if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
    try:
        from .supabase_store import SupabaseStore
        store = SupabaseStore()
        print("   [SYSTEM] Using PERSISTENT Supabase Storage.")
    except Exception as e:
        print(f"   [CRITICAL] Supabase initialization failed: {str(e)}")
        print("   [SYSTEM] Falling back to TEMPORARY Memory Storage.")
        from .memory_store import store
else:
    from .memory_store import store
    print("   [SYSTEM] Using TEMPORARY Memory Storage (No credentials found).")
