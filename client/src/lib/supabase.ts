import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True only when real Supabase credentials are present.
 * While the placeholder URL is active, hooks will skip all API calls
 * and return empty data immediately.
 */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey.length > 0 &&
  !supabaseAnonKey.includes('placeholder');

type GenericTable = { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; };
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

const _g = globalThis as typeof globalThis & { __nyvara_supabase?: ReturnType<typeof createClient<Database>> };
if (!_g.__nyvara_supabase) {
  _g.__nyvara_supabase = createClient<Database>(supabaseUrl || 'https://x.supabase.co', supabaseAnonKey || 'x');
}
export const supabase = _g.__nyvara_supabase!;

