-- Modelos 3D / Realidade Aumentada dos produtos
-- Rodar uma vez no SQL Editor do Supabase.

-- 1) Endereço do modelo 3D (.glb) de cada produto
alter table public.products add column if not exists model_glb_url text;

-- 2) Bucket PÚBLICO (os clientes abrem o AR pelo link de compartilhamento, sem login)
insert into storage.buckets (id, name, public)
values ('modelos-3d', 'modelos-3d', true)
on conflict (id) do update set public = true;

-- 3) Qualquer um lê; só usuários logados enviam, trocam e apagam
drop policy if exists "modelos3d_select" on storage.objects;
create policy "modelos3d_select" on storage.objects
    for select to public using (bucket_id = 'modelos-3d');

drop policy if exists "modelos3d_insert" on storage.objects;
create policy "modelos3d_insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'modelos-3d');

drop policy if exists "modelos3d_update" on storage.objects;
create policy "modelos3d_update" on storage.objects
    for update to authenticated using (bucket_id = 'modelos-3d');

drop policy if exists "modelos3d_delete" on storage.objects;
create policy "modelos3d_delete" on storage.objects
    for delete to authenticated using (bucket_id = 'modelos-3d');
