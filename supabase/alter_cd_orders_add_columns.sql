-- Adiciona colunas que faltam na tabela cd_orders existente
alter table cd_orders
    add column if not exists vendedor_email    text,
    add column if not exists vendedor_nome     text,
    add column if not exists transportadora    text,
    add column if not exists carregamento      text,
    add column if not exists volume            integer,
    add column if not exists nota_fiscal       text,
    add column if not exists valor_nota_fiscal numeric(12,2),
    add column if not exists numeros_serie     text,
    add column if not exists status_wms        text,
    add column if not exists pedido_id_api     integer,
    add column if not exists observacao        text,
    add column if not exists cliente_cpf       text,
    add column if not exists produtos          jsonb not null default '[]',
    add column if not exists valor_total       numeric(12,2) not null default 0;

-- Índices
create index if not exists cd_orders_status_idx     on cd_orders (status);
create index if not exists cd_orders_vendedor_idx   on cd_orders (vendedor_email);
create index if not exists cd_orders_created_at_idx on cd_orders (created_at desc);
