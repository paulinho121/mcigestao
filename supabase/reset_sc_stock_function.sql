
CREATE OR REPLACE FUNCTION reset_sc_stock_for_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET 
    stock_sc = 0,
    total = stock_ce + stock_sp,
    updated_at = NOW();
END;
$$;
