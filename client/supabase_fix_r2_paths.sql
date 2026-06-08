-- =============================================================================
-- FIX SCRIPT: Remove the '%20' space from the folder path
-- =============================================================================
-- The previous SQL script accidentally used 'nyvara%20store' instead of 
-- 'nyvarastore' because we updated your folder name midway through.
-- This script fixes the URLs currently in your database to remove that space.
-- =============================================================================

-- Update products.image_url
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE products
  SET image_url = REPLACE(
    image_url,
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/',
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvarastore/products/'
  )
  WHERE image_url LIKE '%nyvara%20store%';

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
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/',
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvarastore/products/'
  )
  WHERE image_url LIKE '%nyvara%20store%';

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
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvara%20store/products/',
    'https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev/nyvarastore/products/'
  )::jsonb
  WHERE color_options IS NOT NULL
    AND color_options::text LIKE '%nyvara%20store%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'products.color_options — % row(s) updated', updated_count;
END $$;
