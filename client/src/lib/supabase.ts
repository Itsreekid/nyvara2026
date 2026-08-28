/**
 * src/lib/supabase.ts — STUB
 *
 * Supabase has been removed. This file exports stubs so any residual
 * imports compile without error while the migration is completed.
 * Do NOT add real Supabase credentials — they will not be used.
 */

export const isSupabaseConfigured = false;

// Minimal no-op stub — methods return empty data so the app degrades
// gracefully rather than crashing if a call path is somehow missed.
const noopQuery = () =>
  Promise.resolve({ data: null, error: new Error('Supabase removed — use pg API routes') });

export const supabase: any = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'from')    return () => supabase;
      if (prop === 'channel') return () => supabase;
      if (prop === 'on')      return () => supabase;
      if (prop === 'subscribe') return () => supabase;
      if (prop === 'removeChannel') return () => {};
      // select / insert / update / delete / upsert / single / eq / in / etc.
      return () => noopQuery();
    },
  }
);
