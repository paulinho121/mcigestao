CREATE OR REPLACE FUNCTION bulk_update_sc_stock(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item json;
  updated_count integer := 0;
  error_count integer := 0;
BEGIN
  -- Percorre o array JSON
  FOR item IN SELECT * FROM json_array_elements(payload)
  LOOP
    BEGIN
      -- Tenta atualizar o produto se ele existir
      UPDATE public.products
      SET 
        stock_sc = (item->>'quantity')::integer,
        updated_at = NOW()
      WHERE id = (item->>'id')::text;
      
      -- Se atualizou alguma linha (produto existe), incrementa contador
      IF FOUND THEN
        updated_count := updated_count + 1;
      END IF;
      
      -- Nota: Se o produto não existe, não fazemos nada (apenas ignoramos)
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'updated', updated_count,
    'errors', error_count
  );
END;
$$;
