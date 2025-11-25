-- Create import_projects table
CREATE TABLE IF NOT EXISTS import_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL,
    import_number TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create import_items table
CREATE TABLE IF NOT EXISTS import_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES import_projects(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, -- We don't enforce FK strictly if products table is managed loosely, but ideally REFERENCES products(id)
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_import_items_project_id ON import_items(project_id);
CREATE INDEX IF NOT EXISTS idx_import_items_product_id ON import_items(product_id);
