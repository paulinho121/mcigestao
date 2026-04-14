-- =====================================================
-- NFE AUTOMATION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.nfe_automation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_key TEXT UNIQUE NOT NULL, -- NFe Access Key
    nfe_number TEXT NOT NULL,
    series TEXT NOT NULL,
    cnpj_monitored TEXT NOT NULL,
    branch TEXT NOT NULL, -- CE, SP
    operation_type TEXT NOT NULL CHECK (operation_type IN ('entry', 'exit')),
    raw_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'processed', -- processed, skipped, error
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unique access key and branch
CREATE INDEX IF NOT EXISTS idx_nfe_history_access_key ON public.nfe_automation_history(access_key);
CREATE INDEX IF NOT EXISTS idx_nfe_history_branch ON public.nfe_automation_history(branch);

-- Enable RLS
ALTER TABLE public.nfe_automation_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.nfe_automation_history
    FOR SELECT TO authenticated USING (true);

-- Functions for automatic stock update could be here, but we'll handle in TS for more flexibility with product mapping
