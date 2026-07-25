import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

type GenericTable = { Row: any; Insert: any; Update: any; };
type Database = {
  public: {
    Tables: {
      categories: GenericTable;
      orders: GenericTable;
      order_items: GenericTable;
      products: GenericTable;
      product_images: GenericTable;
      admin_users: GenericTable;
      [key: string]: GenericTable;
    }
  }
};

// Server-only client using the service role key.
// NEVER import this in client components — it bypasses RLS.
// ── Dev HMR-safe singleton ────────────────────────────────────────────────
const _ga = globalThis as typeof globalThis & { __nyvara_supabase_admin?: ReturnType<typeof createClient<Database>> };
if (!_ga.__nyvara_supabase_admin) {
  _ga.__nyvara_supabase_admin = createClient<Database>(supabaseUrl, supabaseServiceKey);
}
const supabaseAdmin = _ga.__nyvara_supabase_admin!;

export default supabaseAdmin;
