// Fases (lifecycle) de um projeto de importação.
// Coluna `stage` em import_projects — ver supabase/add_import_project_stage.sql

export type ImportStage = 'negociacao' | 'embarcado' | 'transito' | 'concluido';

export const IMPORT_STAGES: {
    value: ImportStage;
    label: string;
    short: string;
    /** classes tailwind para o badge (claro/escuro) */
    badge: string;
    dot: string;
}[] = [
    { value: 'negociacao', label: 'Em negociação', short: 'Negociação', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
    { value: 'embarcado', label: 'Embarcado', short: 'Embarcado', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', dot: 'bg-blue-500' },
    { value: 'transito', label: 'Em trânsito', short: 'Trânsito', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/15 dark:text-amber-400', dot: 'bg-amber-500' },
    { value: 'concluido', label: 'Concluído', short: 'Concluído', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
];

// Fases em que a carga já está confirmada e a caminho — só essas contam como
// "em importação" na vitrine de Importações e na Sugestão de Compra.
export const IN_TRANSIT_STAGES: ImportStage[] = ['embarcado', 'transito'];

// Linha vazia/legado (rows criadas antes da coluna existir) = tratamos como embarcado,
// para não sumir com importações que já estavam contando antes dessa mudança.
export const DEFAULT_STAGE: ImportStage = 'embarcado';

export function normalizeStage(raw: unknown): ImportStage {
    const v = String(raw ?? '').trim().toLowerCase();
    return (IMPORT_STAGES.find((s) => s.value === v)?.value) ?? DEFAULT_STAGE;
}

export function importStageMeta(raw: unknown) {
    const v = normalizeStage(raw);
    return IMPORT_STAGES.find((s) => s.value === v)!;
}
