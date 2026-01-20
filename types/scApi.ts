export interface SCStockItem {
    Filial: string;
    Cliente: string;
    Item: string; // Was 'Produto', API returns 'Item': "CODE - DESCRIPTION"
    UnidadeMedida: string;
    NumeroOrdem: number;
    NumeroPedido: string;
    NaturezaOperacao: string;
    ClienteFaturamento: string;
    Deposito: string;
    Endereco: string;
    Unitizacao: number;
    Volume: number;
    ClassificacaoEstoque: string;
    NumeroOcorrencia: number;
    NumeroDocumento: number;
    NumeroDescarga: number;
    Lote: string;
    Fabricacao: string;
    Validade: string;
    Conteiner: string;
    SaldoDisponivel: {
        Quantidade: number;
        PesoBruto: number;
        PesoLiquido: number;
        Valor: number;
        Volume: number;
    };
    SaldoReservado: {
        Quantidade: number;
        PesoBruto: number;
        PesoLiquido: number;
        Valor: number;
        Volume: number;
    };
    SaldoBloqueado: {
        Quantidade: number;
        PesoBruto: number;
        PesoLiquido: number;
        Valor: number;
        Volume: number;
    };
    SaldoAtual: {
        Quantidade: number;
        PesoBruto: number;
        PesoLiquido: number;
        Valor: number;
        Volume: number;
    };
}

export interface SCAPIResponse {
    EstoqueMercadoria: SCStockItem[];
}
