-- Tabela de vendedores (usada no contrato de locação e demais telas)
-- Estrutura conforme services/vendedorService.ts
-- Script idempotente: pode rodar mais de uma vez sem duplicar nada.
create table if not exists vendedores (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    email text not null default '',
    telefone text not null default '',
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

-- RLS: permite leitura e escrita para usuários autenticados (mesmo padrão dos contratos)
alter table vendedores enable row level security;

drop policy if exists "Autenticados podem ler vendedores" on vendedores;
create policy "Autenticados podem ler vendedores"
    on vendedores for select
    to authenticated
    using (true);

drop policy if exists "Autenticados podem inserir vendedores" on vendedores;
create policy "Autenticados podem inserir vendedores"
    on vendedores for insert
    to authenticated
    with check (true);

drop policy if exists "Autenticados podem atualizar vendedores" on vendedores;
create policy "Autenticados podem atualizar vendedores"
    on vendedores for update
    to authenticated
    using (true);

drop policy if exists "Autenticados podem excluir vendedores" on vendedores;
create policy "Autenticados podem excluir vendedores"
    on vendedores for delete
    to authenticated
    using (true);

-- Cadastro dos vendedores (só insere quem ainda não existe)
insert into vendedores (nome)
select v.nome
from (values
    ('Wendel'),
    ('Vinicius'),
    ('João Sousa'),
    ('João Gomes'),
    ('Felipe'),
    ('Jhon'),
    ('Paulo Fernando'),
    ('Sarah'),
    ('Jonathan')
) as v(nome)
where not exists (
    select 1 from vendedores x where x.nome = v.nome
);
