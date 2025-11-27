-- Create rentals table
CREATE TABLE IF NOT EXISTS rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    rental_period TEXT NOT NULL,
    rental_value NUMERIC NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'returned', 'overdue'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rentals_client_name ON rentals(client_name);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
