-- Function to search products ignoring punctuation and with better matching
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Excludes products with IDs ending in .0

CREATE OR REPLACE FUNCTION search_products_normalized(search_query text)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE
    -- Exclude products with IDs ending in .0
    id NOT LIKE '%.0'
    AND
    (
      -- Remove punctuation and special characters, compare case-insensitively
      regexp_replace(id, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(search_query, '[^a-zA-Z0-9]', '', 'g') || '%'
      OR
      regexp_replace(name, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(search_query, '[^a-zA-Z0-9]', '', 'g') || '%'
      OR
      regexp_replace(brand, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || regexp_replace(search_query, '[^a-zA-Z0-9]', '', 'g') || '%'
      OR
      -- Also search with original text (without normalization) for exact matches
      id ILIKE '%' || search_query || '%'
      OR
      name ILIKE '%' || search_query || '%'
      OR
      brand ILIKE '%' || search_query || '%'
    )
  ORDER BY
    -- Prioritize exact matches in ID
    CASE WHEN id ILIKE search_query || '%' THEN 1
         WHEN id ILIKE '%' || search_query || '%' THEN 2
         WHEN name ILIKE search_query || '%' THEN 3
         ELSE 4
    END,
    id;
END;
$$ LANGUAGE plpgsql;
