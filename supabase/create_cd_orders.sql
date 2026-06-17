-- Tabela de pedidos ao CD (Centro de Distribuição — Santa Catarina)
create table if not exists cd_orders (
    id                uuid primary key default gen_random_uuid(),
    numero_pedido     text not null unique,
    pedido_id_api     integer,                          -- NumeroOrdem retornado pelo WMS
    status            text not null default 'enviado',  -- enviado | confirmado | em_separacao | em_transito | entregue | cancelado
    status_wms        text,                             -- Texto do status no WMS ex: "Em execução"
    cliente_nome      text not null,
    cliente_cpf       text,
    produtos          jsonb not null default '[]',
    valor_total       numeric(12,2) not null default 0,
    observacao        text,
    vendedor_email    text,
    vendedor_nome     text,
    transportadora    text,
    carregamento      text,                             -- Data de carregamento dd/mm/yyyy
    volume            integer,
    nota_fiscal       text,
    valor_nota_fiscal numeric(12,2),
    numeros_serie     text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- Índices para buscas frequentes
create index if not exists cd_orders_status_idx       on cd_orders (status);
create index if not exists cd_orders_vendedor_idx     on cd_orders (vendedor_email);
create index if not exists cd_orders_created_at_idx   on cd_orders (created_at desc);

-- Atualiza updated_at automaticamente
create or replace function update_cd_orders_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_cd_orders_updated_at on cd_orders;
create trigger trg_cd_orders_updated_at
    before update on cd_orders
    for each row execute function update_cd_orders_updated_at();

-- RLS: leitura e escrita livres para usuários autenticados
alter table cd_orders enable row level security;

create policy "cd_orders_select" on cd_orders
    for select using (true);

create policy "cd_orders_insert" on cd_orders
    for insert with check (true);

create policy "cd_orders_update" on cd_orders
    for update using (true);

create policy "cd_orders_delete" on cd_orders
    for delete using (true);
