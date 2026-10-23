import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, XCircle, CheckCircle, Clock, Copy, Check, RefreshCw, Search, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { scStockService } from '../services/scStockService';

interface SCProduct {
  id: string;
  name: string;
  brand: string;
  stock_sc: number;
  stock_ce: number;
  stock_sp: number;
  image_url?: string;
  price?: number;
  updated_at: string;
}

type Branch = 'SC' | 'CE' | 'SP';
const BRANCHES: Branch[] = ['SC', 'CE', 'SP'];
const STOCK_KEY: Record<Branch, 'stock_sc' | 'stock_ce' | 'stock_sp'> = { SC: 'stock_sc', CE: 'stock_ce', SP: 'stock_sp' };

// Estoque negativo não conta (não "abate" o saldo de outra filial)
const branchQty = (p: SCProduct, b: Branch) => Math.max(0, Number(p[STOCK_KEY[b]]) || 0);

// Produto + quantidade somada só das filiais selecionadas
type Row = SCProduct & { qty: number };

function BranchBreakdown({ product, selected }: { product: SCProduct; selected: Set<Branch> }) {
  return (
    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
      {BRANCHES.map((b, i) => (
        <span key={b} className={selected.has(b) ? '' : 'opacity-40'}>
          {i > 0 && ' · '}{b} {branchQty(product, b)}
        </span>
      ))}
    </p>
  );
}

// Um SKU é um código curto, sem espaços e com pelo menos um dígito (ex.: 5818, K3-65, M11-034).
// A sincronização com a API do SC cria produtos com o TEXTO INTEIRO da descrição no `id`
// quando o item vem sem código — esses não são SKU e não podem ir para a lista de códigos.
export function isSku(id: string): boolean {
  const v = (id || '').trim();
  return v.length > 0 && v.length <= 20 && !/\s/.test(v) && /\d/.test(v);
}

// O Supabase devolve no máximo 1000 linhas por consulta; busca página a página até acabar.
const PAGE_SIZE = 1000;
async function fetchAllPages(buildQuery: () => any): Promise<SCProduct[]> {
  const all: SCProduct[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as SCProduct[]));
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

function CopyButton({ ids, label = 'Copiar códigos' }: { ids: string[]; label?: string }) {
  const [copied, setCopied] = useState(false);
  const skus = ids.filter(isSku).map(id => id.trim());
  const ignorados = ids.length - skus.length;
  const handleCopy = () => {
    navigator.clipboard.writeText(skus.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      disabled={skus.length === 0}
      title={ignorados > 0 ? `Copia só o SKU de ${skus.length} itens. ${ignorados} item(ns) sem SKU (só descrição) ficam de fora.` : `Copia o SKU de ${skus.length} itens`}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap disabled:opacity-40"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? `Copiado! ${skus.length} SKUs` : label}
    </button>
  );
}

function ProductImage({ src, name }: { src?: string; name: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Package size={20} className="text-slate-300 dark:text-slate-600" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0"
    />
  );
}

function ProductRow({ product, selected, showQty = false, showZeroedAt = false }: { product: Row; selected: Set<Branch>; showQty?: boolean; showZeroedAt?: boolean }) {
  const zeroedAt = showZeroedAt && product.updated_at
    ? new Date(product.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <ProductImage src={product.image_url} name={product.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{product.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {isSku(product.id)
            ? <span className="font-mono">{product.id}</span>
            : <span className="text-amber-500 dark:text-amber-400" title="Item sem SKU: o ERP enviou só a descrição">sem SKU</span>}
          {product.brand && product.brand !== 'SC API' && <> · {product.brand}</>}
          {product.price ? <> · R$ {product.price.toFixed(2)}</> : null}
        </p>
        {showQty && <BranchBreakdown product={product} selected={selected} />}
      </div>
      {showQty && (
        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full shrink-0">
          {product.qty} un.
        </span>
      )}
      {zeroedAt && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{zeroedAt}</span>
      )}
    </div>
  );
}

export function MarketingSC() {
  const [products, setProducts] = useState<SCProduct[]>([]);
  // Filiais cujo estoque entra na conta (padrão: todas). Ao menos uma fica sempre marcada.
  const [selected, setSelected] = useState<Set<Branch>>(new Set(BRANCHES));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [searchIn, setSearchIn] = useState('');
  const [searchOut, setSearchOut] = useState('');
  const [searchLow, setSearchLow] = useState('');
  const [lastSync, setLastSync] = useState('');

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Uma única busca com o estoque das 3 filiais; a classificação (manter/remover/atenção)
      // é feita aqui, conforme as filiais selecionadas. Ordena por `id` (estável p/ paginação).
      const data = await fetchAllPages(() =>
        supabase!.from('products')
          .select('id, name, brand, stock_sc, stock_ce, stock_sp, image_url, price, updated_at')
          .not('id', 'like', '%.0')
          .order('id')
      );
      setProducts(data);
      setLastSync(new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await scStockService.syncStock();
      if (result.success) {
        setSyncMsg(`Sincronizado: ${result.updated} produtos atualizados${result.newItems?.length ? `, ${result.newItems.length} novos` : ''}.`);
        await fetchData();
      } else {
        setSyncMsg(result.message || 'Erro na sincronização.');
      }
    } catch {
      setSyncMsg('Erro ao conectar com a API.');
    } finally {
      setSyncing(false);
    }
  };

  const toggleBranch = (b: Branch) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(b)) { if (next.size > 1) next.delete(b); } else next.add(b);
      return next;
    });
  };

  // Soma o estoque só das filiais selecionadas e separa nas 3 colunas
  const { inStock, outOfStock, lowStock } = useMemo(() => {
    const rows: Row[] = products.map(p => ({
      ...p,
      qty: BRANCHES.reduce((sum, b) => sum + (selected.has(b) ? branchQty(p, b) : 0), 0),
    }));
    return {
      inStock: rows.filter(r => r.qty > 0).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      outOfStock: rows.filter(r => r.qty === 0).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')),
      lowStock: rows.filter(r => r.qty >= 1 && r.qty <= 3).sort((a, b) => a.qty - b.qty),
    };
  }, [products, selected]);

  const filteredIn = useMemo(() =>
    inStock.filter(p =>
      p.name.toLowerCase().includes(searchIn.toLowerCase()) ||
      p.id.includes(searchIn)
    ), [inStock, searchIn]);

  const filteredOut = useMemo(() =>
    outOfStock.filter(p =>
      p.name.toLowerCase().includes(searchOut.toLowerCase()) ||
      p.id.includes(searchOut)
    ), [outOfStock, searchOut]);

  const filteredLow = useMemo(() =>
    lowStock.filter(p =>
      p.name.toLowerCase().includes(searchLow.toLowerCase()) ||
      p.id.includes(searchLow)
    ), [lowStock, searchLow]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40">
          <ShoppingCart size={22} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Ecommerce SC</h1>
          {lastSync && (
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock size={12} />
              Última atualização: {lastSync}
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || loading}
          className="ml-auto flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar API'}
        </button>
      </div>

      {syncMsg && (
        <p className={`text-sm px-4 py-2 rounded-lg ${syncMsg.startsWith('Erro') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
          {syncMsg}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">Estoque considerado de:</span>
        {BRANCHES.map(b => {
          const on = selected.has(b);
          return (
            <button
              key={b}
              onClick={() => toggleBranch(b)}
              aria-pressed={on}
              title={on ? `Clique para ignorar o estoque de ${b}` : `Clique para considerar o estoque de ${b}`}
              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${on
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {b}
            </button>
          );
        })}
        {selected.size < BRANCHES.length && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            só {BRANCHES.filter(b => selected.has(b)).join(' + ')}
          </span>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800">
          <CheckCircle size={14} className="text-green-500" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">{loading ? '...' : `${inStock.length} com estoque`}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800">
          <XCircle size={14} className="text-red-500" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">{loading ? '...' : `${outOfStock.length} sem estoque`}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{loading ? '...' : `${lowStock.length} atenção`}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-green-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manter no site</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-medium">{filteredIn.length}</span>
            </div>
            <CopyButton ids={filteredIn.map(p => p.id)} />
          </div>
          <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchIn}
                onChange={e => setSearchIn(e.target.value)}
                className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none w-full"
              />
            </div>
          </div>
          <div className="p-3 space-y-1.5 overflow-y-auto max-h-[500px]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredIn.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Nenhum produto encontrado</p>
            ) : filteredIn.map(p => (
              <ProductRow key={p.id} product={p} selected={selected} showQty />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <XCircle size={15} className="text-red-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Remover do site</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-medium">{filteredOut.length}</span>
            </div>
            <CopyButton ids={filteredOut.map(p => p.id)} />
          </div>
          <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchOut}
                onChange={e => setSearchOut(e.target.value)}
                className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none w-full"
              />
            </div>
          </div>
          <div className="p-3 space-y-1.5 overflow-y-auto max-h-[500px]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredOut.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Nenhum produto sem estoque</p>
            ) : filteredOut.map(p => (
              <ProductRow key={p.id} product={p} selected={selected} showZeroedAt />
            ))}
          </div>
        </div>

        {/* ── Atenção (1–3 un.) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/60 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 dark:border-amber-800/40 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Atenção</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium">{filteredLow.length}</span>
            </div>
            <CopyButton ids={filteredLow.map(p => p.id)} />
          </div>
          <div className="px-3 py-2 border-b border-amber-50 dark:border-amber-800/20">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchLow}
                onChange={e => setSearchLow(e.target.value)}
                className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none w-full"
              />
            </div>
          </div>
          <div className="p-3 space-y-1.5 overflow-y-auto max-h-[500px]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredLow.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Nenhum produto em atenção</p>
            ) : filteredLow.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border border-amber-100 dark:border-amber-800/30">
                <ProductImage src={p.image_url} name={p.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {isSku(p.id)
                      ? <span className="font-mono">{p.id}</span>
                      : <span className="text-amber-500 dark:text-amber-400" title="Item sem SKU: o ERP enviou só a descrição">sem SKU</span>}
                    {p.brand && p.brand !== 'SC API' && <> · {p.brand}</>}
                    {p.price ? <> · R$ {p.price.toFixed(2)}</> : null}
                  </p>
                  <BranchBreakdown product={p} selected={selected} />
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full shrink-0">
                  {p.qty} un.
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <p className="text-xs text-center text-slate-400 dark:text-slate-600">
        Clique em "Sincronizar API" para buscar os dados mais recentes do estoque SC em tempo real.
      </p>
    </div>
  );
}
