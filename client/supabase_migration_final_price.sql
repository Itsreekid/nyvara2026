-- Add final_price column to products table
-- This stores the price after discount for easier retrieval
ALTER TABLE products 
ADD COLUMN final_price numeric(10, 3) DEFAULT NULL;

-- Add an index on final_price for faster queries
CREATE INDEX idx_products_final_price ON products(final_price);

-- Optional: Populate final_price for existing products with discounts
-- UPDATE products 
-- SET final_price = ROUND(price * (1 - discount / 100)::numeric, 3)
-- WHERE price IS NOT NULL AND discount IS NOT NULL AND discount > 0;
