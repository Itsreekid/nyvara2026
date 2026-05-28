-- Wishlist Items Table for Device-Based Wishlist
-- Run this in Supabase SQL Editor to enable device-based wishlist

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT wishlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_items_device_product_unique UNIQUE (device_id, product_id),
  CONSTRAINT wishlist_items_product_fkey FOREIGN KEY (product_id) 
    REFERENCES public.products (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_device_id ON public.wishlist_items (device_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist_items (product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON public.wishlist_items (created_at DESC);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access to wishlist_items" ON public.wishlist_items;
CREATE POLICY "Allow public read access to wishlist_items"
  ON public.wishlist_items
  FOR SELECT
  USING (true);

-- Allow insert
DROP POLICY IF EXISTS "Allow device to manage own wishlist" ON public.wishlist_items;
CREATE POLICY "Allow device to manage own wishlist"
  ON public.wishlist_items
  FOR INSERT
  WITH CHECK (true);

-- Allow delete
DROP POLICY IF EXISTS "Allow device to delete own wishlist items" ON public.wishlist_items;
CREATE POLICY "Allow device to delete own wishlist items"
  ON public.wishlist_items
  FOR DELETE
  USING (true);

-- Grant access to authenticated and anonymous users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated, anon;
