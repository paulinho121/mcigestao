-- Assinatura digital de contratos de locação (PDF assinado com certificado A3)
-- Rodar uma vez no SQL Editor do Supabase.

-- 1) Onde fica o PDF assinado de cada contrato
alter table public.contratos_locacao add column if not exists pdf_assinado_path text;
alter table public.contratos_locacao add column if not exists assinado_em timestamptz;
alter table public.contratos_locacao add column if not exists assinado_por text;

-- 2) Bucket privado para os PDFs assinados
insert into storage.buckets (id, name, public)
values ('contratos-assinados', 'contratos-assinados', false)
on conflict (id) do nothing;

-- 3) Só usuários logados leem e gravam; ninguém sobrescreve nem apaga um PDF assinado
drop policy if exists "contratos_assinados_select" on storage.objects;
create policy "contratos_assinados_select" on storage.objects
    for select to authenticated using (bucket_id = 'contratos-assinados');

drop policy if exists "contratos_assinados_insert" on storage.objects;
create policy "contratos_assinados_insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'contratos-assinados');
