CREATE OR REPLACE FUNCTION bulk_update_sc_stock(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item json;
  updated_count integer := 0;
  inserted_count integer := 0;
  error_count integer := 0;
  inserted_names text[] := ARRAY[]::text[];
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
      ELSE
        -- Se não existe, faz o cadastro automático
        INSERT INTO public.products (id, name, brand, stock_sc, stock_ce, stock_sp)
        VALUES (
          (item->>'id')::text,
          COALESCE(item->>'name', 'Produto Novo (Sync)'),
          'SC API',
          (item->>'quantity')::integer,
          0,
          0
        );
        inserted_count := inserted_count + 1;
        inserted_names := array_append(inserted_names, COALESCE(item->>'name', item->>'id'));
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'updated', updated_count,
    'inserted', inserted_count,
    'inserted_names', inserted_names,
    'errors', error_count
  );
END;

$$;
