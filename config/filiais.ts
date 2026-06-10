/**
 * Mapeamento de filiais MCI → CNPJ Jamef
 *
 * Para adicionar uma nova filial ou alterar prefixos de NF:
 *  1. Edite apenas este arquivo.
 *  2. Toda a aplicação (Tracking, AppRouter, etc.) usará o novo mapeamento automaticamente.
 */

export interface FilialConfig {
    /** Sigla exibida na UI */
    label: string;
    /** CNPJ da filial (14 dígitos, sem formatação) */
    cnpj: string;
    /** Prefixos de número de NF que identificam esta filial */
    prefixos: string[];
}

export const FILIAIS: FilialConfig[] = [
    {
        label: 'SC',
        cnpj: '05502390000200',
        prefixos: ['562', '56'],
    },
    {
        label: 'SP',
        cnpj: '05502390000383',
        prefixos: ['22', '23'],   // ← adicione novos prefixos SP aqui
    },
    {
        label: 'CE',
        cnpj: '05502390000111',
        prefixos: ['10'],
    },
];

/**
 * Dado um número de NF (curto, ex: "562011" ou "23045"),
 * retorna a FilialConfig correspondente ou null se não reconhecido.
 *
 * A busca respeita a ordem do array: prefixos mais longos primeiro dentro de cada filial.
 * Para prefixos que compartilham início (ex: '56' e '562'), coloque o mais longo primeiro.
 */
export function detectFilialFromNF(nf: string): FilialConfig | null {
    for (const filial of FILIAIS) {
        // Ordena prefixos do mais longo para o mais curto para evitar match parcial
        const sorted = [...filial.prefixos].sort((a, b) => b.length - a.length);
        if (sorted.some(p => nf.startsWith(p))) {
            return filial;
        }
    }
    return null;
}
