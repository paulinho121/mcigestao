-- Create seasonal_backgrounds table
CREATE TABLE IF NOT EXISTS seasonal_backgrounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  background_url TEXT NOT NULL,
  opacity DECIMAL(3,2) DEFAULT 0.15 CHECK (opacity >= 0 AND opacity <= 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries on active backgrounds
CREATE INDEX idx_seasonal_backgrounds_dates ON seasonal_backgrounds(start_date, end_date, is_active);

-- Create storage bucket for seasonal background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('seasonal-backgrounds', 'seasonal-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload seasonal backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seasonal-backgrounds');

-- Create storage policy to allow public read access
CREATE POLICY "Allow public read access to seasonal backgrounds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'seasonal-backgrounds');

-- Create storage policy to allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete seasonal backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seasonal-backgrounds');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_seasonal_backgrounds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_seasonal_backgrounds_updated_at
BEFORE UPDATE ON seasonal_backgrounds
FOR EACH ROW
EXECUTE FUNCTION update_seasonal_backgrounds_updated_at();

-- Grant permissions
GRANT ALL ON seasonal_backgrounds TO authenticated;
GRANT SELECT ON seasonal_backgrounds TO anon;
