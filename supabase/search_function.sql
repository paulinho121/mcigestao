-- Function to search products ignoring punctuation
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION search_products_normalized(search_query text)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE
    -- Remove punctuation ([:punct:]) and compare case-insensitively (ILIKE)
    regexp_replace(id, '[[:punct:]]', '', 'g') ILIKE '%' || regexp_replace(search_query, '[[:punct:]]', '', 'g') || '%'
    OR
    regexp_replace(name, '[[:punct:]]', '', 'g') ILIKE '%' || regexp_replace(search_query, '[[:punct:]]', '', 'g') || '%'
    OR
    regexp_replace(brand, '[[:punct:]]', '', 'g') ILIKE '%' || regexp_replace(search_query, '[[:punct:]]', '', 'g') || '%';
END;
$$ LANGUAGE plpgsql;
