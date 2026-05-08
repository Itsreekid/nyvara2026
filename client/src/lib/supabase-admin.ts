import { createClient } from '@supabase/supabase-js';

// Server-only client using the service role key.
// NEVER import this in client components — it bypasses RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default supabaseAdmin;
