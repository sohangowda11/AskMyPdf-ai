import os
from supabase import create_client

url = os.environ.get('SUPABASE_URL', 'https://kyhteatixdunvkgvdvxu.supabase.co')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'unknown')
# We need to know if the table actually accepts user_id.
# We can't easily test without the key, but we know the issue is likely schema cache.
