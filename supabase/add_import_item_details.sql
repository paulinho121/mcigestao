-- Add expected_date and observation columns to import_items table
ALTER TABLE import_items 
ADD COLUMN IF NOT EXISTS expected_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observation TEXT;
