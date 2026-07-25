import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Server-only client using the service role key.
// NEVER import this in client components — it bypasses RLS.
// ── Dev HMR-safe singleton ────────────────────────────────────────────────
const _ga = globalThis as typeof globalThis & { __nyvara_supabase_admin?: ReturnType<typeof createClient> };
if (!_ga.__nyvara_supabase_admin) {
  _ga.__nyvara_supabase_admin = createClient(supabaseUrl, supabaseServiceKey);
}
const supabaseAdmin = _ga.__nyvara_supabase_admin;

export default supabaseAdmin;
