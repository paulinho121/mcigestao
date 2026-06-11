import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, XCircle, CheckCircle, Clock, Copy, Check, RefreshCw, Search, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { scStockService } from '../services/scStockService';

interface SCProduct {
  id: string;
  name: string;
  brand: string;
  stock_sc: number;
  image_url?: string;
  price?: number;
  updated_at: string;
}

function CopyButton({ ids, label = 'Copiar códigos' }: { ids: string[]; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(ids.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? 'Copiado!' : label}
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

function ProductRow({ product, showQty = false, showZeroedAt = false }: { product: SCProduct; showQty?: boolean; showZeroedAt?: boolean }) {
  const zeroedAt = showZeroedAt && product.updated_at
    ? new Date(product.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <ProductImage src={product.image_url} name={product.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{product.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          <span className="font-mono">{product.id}</span>
          {product.brand && product.brand !== 'SC API' && <> · {product.brand}</>}
          {product.price ? <> · R$ {product.price.toFixed(2)}</> : null}
        </p>
      </div>
      {showQty && (
        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full shrink-0">
          {product.stock_sc} un.
        </span>
      )}
      {zeroedAt && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{zeroedAt}</span>
      )}
    </div>
  );
}

export function MarketingSC() {
  const [inStock, setInStock] = useState<SCProduct[]>([]);
  const [outOfStock, setOutOfStock] = useState<SCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [searchIn, setSearchIn] = useState('');
  const [searchOut, setSearchOut] = useState('');
  const [lastSync, setLastSync] = useState('');

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [inRes, outRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, brand, stock_sc, image_url, price, updated_at')
          .gt('stock_sc', 0)
          .not('id', 'like', '%.0')
          .order('name'),
        supabase
          .from('products')
          .select('id, name, brand, stock_sc, image_url, price, updated_at')
          .eq('stock_sc', 0)
          .not('id', 'like', '%.0')
          .order('updated_at', { ascending: false }),
      ]);

      if (inRes.data) setInStock(inRes.data as SCProduct[]);
      if (outRes.data) setOutOfStock(outRes.data as SCProduct[]);
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

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800">
          <CheckCircle size={14} className="text-green-500" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">{loading ? '...' : `${inStock.length} com estoque`}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800">
          <XCircle size={14} className="text-red-500" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">{loading ? '...' : `${outOfStock.length} sem estoque`}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

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
              <ProductRow key={p.id} product={p} showQty />
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
              <ProductRow key={p.id} product={p} showZeroedAt />
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
