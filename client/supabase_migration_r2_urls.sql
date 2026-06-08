<<<<<<< HEAD
-- Idempotent rewrite for historical Supabase-hosted product image URLs.
-- Safe to run multiple times; already-migrated R2 URLs are left untouched.

create or replace function public.nyvara_r2_image_url(source_url text)
returns text
language sql
immutable
as $$
  select case
    when source_url is null or source_url = '' then source_url
    when source_url like 'https://assets.nyvara.com/%' then source_url
    when source_url ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
      regexp_replace(
        source_url,
        '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?',
        'https://assets.nyvara.com/products/'
      )
    else source_url
  end
$$;

create or replace function public.nyvara_r2_color_options(input jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when input is null then null
    else coalesce((
      select jsonb_agg(
        case
          when jsonb_typeof(option) <> 'object' then option
          when (option->>'image_url') ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
            case
              when (option->>'image_url2') ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
                jsonb_set(
                  jsonb_set(
                    option,
                    '{image_url}',
                    to_jsonb(public.nyvara_r2_image_url(option->>'image_url')),
                    true
                  ),
                  '{image_url2}',
                  to_jsonb(public.nyvara_r2_image_url(option->>'image_url2')),
                  true
                )
              else
                jsonb_set(
                  option,
                  '{image_url}',
                  to_jsonb(public.nyvara_r2_image_url(option->>'image_url')),
                  true
                )
            end
          when (option->>'image_url2') ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?' then
            jsonb_set(
              option,
              '{image_url2}',
              to_jsonb(public.nyvara_r2_image_url(option->>'image_url2')),
              true
            )
          else option
        end
      )
      from jsonb_array_elements(coalesce(input, '[]'::jsonb)) as option
    ), '[]'::jsonb)
  end
$$;

update public.products
set image_url = public.nyvara_r2_image_url(image_url)
where image_url ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?';

update public.products
set color_options = public.nyvara_r2_color_options(color_options)
where color_options::text ~ '^\[.*https://[^/]+/storage/v1/object/public/Product/(?:images/)?';

update public.product_images
set image_url = public.nyvara_r2_image_url(image_url)
where image_url ~ '^https://[^/]+/storage/v1/object/public/Product/(?:images/)?';
=======
-- =============================================================================
-- Nyvara — Supabase → Cloudflare R2 URL Migration
-- =============================================================================
-- PURPOSE : Bulk-update all Supabase Storage URLs in the database to their
--           Cloudflare R2 equivalents after the file copy is complete.
--
-- USAGE:
--   1. Run scripts/migrate-supabase-images-to-r2.mjs successfully.
--   2. Paste this entire script into your Supabase SQL Editor.
--   3. Review the "1. PREVIEW" results.
--   4. If everything looks correct, run the "2. EXECUTE" blocks.
-- =============================================================================

-- =============================================================================
-- 1. PREVIEW (Diagnostic Queries)
-- Run these first to see what WILL be changed without actually changing it.
-- =============================================================================

-- Preview products table
SELECT 
    id, 
    title, 
    image_url AS old_url,
    REPLACE(
        image_url,
        'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/',
        'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/'
    ) AS new_url
FROM products
WHERE image_url LIKE '%vkrgfqjsixjsieqzykcx.supabase.co%'
LIMIT 5;

-- Preview product_images table (gallery)
SELECT 
    id, 
    product_id, 
    image_url AS old_url,
    REPLACE(
        image_url,
        'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/',
        'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/'
    ) AS new_url
FROM product_images
WHERE image_url LIKE '%vkrgfqjsixjsieqzykcx.supabase.co%'
LIMIT 5;

-- Preview color_options JSONB
SELECT 
    id, 
    title, 
    color_options::text AS old_json,
    REPLACE(
        color_options::text,
        'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/',
        'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/'
    )::jsonb AS new_json
FROM products
WHERE color_options IS NOT NULL 
  AND color_options::text LIKE '%vkrgfqjsixjsieqzykcx.supabase.co%'
LIMIT 5;


-- =============================================================================
-- 2. EXECUTE (The actual updates)
-- Select and run these blocks ONLY AFTER previewing the changes above.
-- =============================================================================

-- Update products.image_url
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE products
  SET image_url = REPLACE(
    image_url,
    'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/',
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/'
  )
  WHERE image_url LIKE '%vkrgfqjsixjsieqzykcx.supabase.co%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'products.image_url — % row(s) updated', updated_count;
END $$;


-- Update product_images.image_url
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE product_images
  SET image_url = REPLACE(
    image_url,
    'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/',
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/'
  )
  WHERE image_url LIKE '%vkrgfqjsixjsieqzykcx.supabase.co%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'product_images.image_url — % row(s) updated', updated_count;
END $$;


-- Update products.color_options
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE products
  SET color_options = REPLACE(
    color_options::text,
    'https://vkrgfqjsixjsieqzykcx.supabase.co/storage/v1/object/public/Product/images/',
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/'
  )::jsonb
  WHERE color_options IS NOT NULL
    AND color_options::text LIKE '%vkrgfqjsixjsieqzykcx.supabase.co%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'products.color_options — % row(s) updated', updated_count;
END $$;
>>>>>>> a87fb02a84b1924bceb700243511fa91618d07e0
