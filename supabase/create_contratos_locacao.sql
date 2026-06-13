-- Tabela de contratos de locação
create table if not exists contratos_locacao (
    id uuid primary key default gen_random_uuid(),
    numero text not null,
    data text not null,
    vendedor text not null default '',
    filial text not null default '',

    -- Locadora
    locadora_nome text not null default '',
    locadora_cnpj text not null default '',
    locadora_endereco text not null default '',
    locadora_bairro text not null default '',
    locadora_cidade text not null default '',
    locadora_uf text not null default '',
    locadora_cep text not null default '',
    locadora_telefone text not null default '',
    locadora_email text not null default '',

    -- Locatária
    locataria_nome text not null default '',
    locataria_cnpj text not null default '',
    locataria_endereco text not null default '',
    locataria_bairro text not null default '',
    locataria_cidade text not null default '',
    locataria_uf text not null default '',
    locataria_cep text not null default '',
    locataria_telefone text not null default '',
    locataria_pessoa_contato text not null default '',
    locataria_email text not null default '',
    locataria_insc_estadual text not null default '',
    locataria_comp text not null default '',

    -- Período e valores
    data_inicio text not null default '',
    data_fim text not null default '',
    dias integer not null default 0,
    valor_venal numeric(15,2) not null default 0,
    forma_pagamento text not null default '',
    frete text not null default '',
    valor_frete numeric(15,2) not null default 0,
    desconto numeric(15,2) not null default 0,
    transportadora text not null default '',
    valor_total numeric(15,2) not null default 0,
    total_diaria numeric(15,2) not null default 0,

    -- Retirada
    responsavel_retirada text not null default '',
    cpf_responsavel text not null default '',
    data_retirada text not null default '',
    observacoes text not null default '',

    -- Itens (JSON array)
    itens jsonb not null default '[]',

    created_at timestamptz not null default now()
);

-- Índices para buscas comuns
create index if not exists idx_contratos_locacao_numero on contratos_locacao (numero);
create index if not exists idx_contratos_locacao_locataria on contratos_locacao (locataria_nome);
create index if not exists idx_contratos_locacao_created_at on contratos_locacao (created_at desc);

-- RLS: permite leitura e escrita para usuários autenticados
alter table contratos_locacao enable row level security;

create policy "Autenticados podem ler contratos"
    on contratos_locacao for select
    to authenticated
    using (true);

create policy "Autenticados podem inserir contratos"
    on contratos_locacao for insert
    to authenticated
    with check (true);

create policy "Autenticados podem atualizar contratos"
    on contratos_locacao for update
    to authenticated
    using (true);

create policy "Autenticados podem excluir contratos"
    on contratos_locacao for delete
    to authenticated
    using (true);
