create table if not exists notas_fiscais_xml (
    id uuid primary key default gen_random_uuid(),
    chave text,
    numero text not null default '',
    tipo text not null default 'NFe',
    data_emissao date,
    cnpj_emitente text not null default '',
    razao_social_emitente text not null default '',
    cliente text not null default '',
    cnpj_cliente text not null default '',
    municipio text not null default '',
    uf text not null default '',
    cfop text not null default '',
    modalidade text not null default 'OUTROS',
    valor_faturamento numeric(15,2) not null default 0,
    frete numeric(15,2) not null default 0,
    difal numeric(15,2) not null default 0,
    impostos numeric(15,2) not null default 0,
    gasto_total numeric(15,2) not null default 0,
    forma_pagamento text not null default '',
    vendedor text not null default '',
    filial text not null default '',
    created_at timestamptz not null default now()
);

-- Índice único na chave para evitar duplicatas de NF-e
create unique index if not exists idx_notas_fiscais_xml_chave
    on notas_fiscais_xml (chave)
    where chave is not null and chave <> '';

create index if not exists idx_notas_fiscais_xml_data on notas_fiscais_xml (data_emissao desc);
create index if not exists idx_notas_fiscais_xml_filial on notas_fiscais_xml (filial);
create index if not exists idx_notas_fiscais_xml_modalidade on notas_fiscais_xml (modalidade);

alter table notas_fiscais_xml enable row level security;

create policy "Autenticados podem ler notas"
    on notas_fiscais_xml for select to authenticated using (true);

create policy "Autenticados podem inserir notas"
    on notas_fiscais_xml for insert to authenticated with check (true);

create policy "Autenticados podem excluir notas"
    on notas_fiscais_xml for delete to authenticated using (true);
