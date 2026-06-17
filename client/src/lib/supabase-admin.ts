import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Server-only client using the service role key.
// NEVER import this in client components — it bypasses RLS.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabaseAdmin;
