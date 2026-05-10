import os
from config import Config

# Decide which store to use
if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
    from .supabase_store import SupabaseStore
    store = SupabaseStore()
    print("   [SYSTEM] Using PERSISTENT Supabase Storage.")
else:
    from .memory_store import store
    print("   [SYSTEM] Using TEMPORARY Memory Storage (No credentials found).")
