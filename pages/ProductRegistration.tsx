import { useState } from 'react';
import { 
  Package, 
  Save, 
  Tag, 
  ImageIcon, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  MapPin, 
  Building2,
  Image as ImageIconLucide,
  Type,
  FileText
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

interface ProductRegistrationProps {
}

export const ProductRegistration: React.FC<ProductRegistrationProps> = () => {
  const [formData, setFormData] = useState<Partial<Product>>({
    id: '',
    name: '',
    brand: '',
    image_url: '',
    stock_ce: 0,
    stock_sc: 0,
    stock_sp: 0,
    observations: ''
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('stock_') ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (!formData.id || !formData.name) {
        throw new Error('Código e nome são campos obrigatórios.');
      }

      await inventoryService.createProduct(formData);
      setStatus({ type: 'success', message: 'Produto cadastrado com sucesso! Já está disponível para consulta.' });
      setFormData({
        id: '',
        name: '',
        brand: '',
        image_url: '',
        stock_ce: 0,
        stock_sc: 0,
        stock_sp: 0,
        observations: ''
      });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Erro ao cadastrar produto.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/20 ring-4 ring-brand-500/10">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Cadastro de Novo Item</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Registre manualmente novos itens para familiarização da equipe.</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          <form onSubmit={handleSubmit} className="p-8 sm:p-12 space-y-10">
            
            {/* Basic Info Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <FileText className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest">Informações Básicas</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Código do Produto (SKU)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Tag className="w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      required
                      type="text"
                      name="id"
                      value={formData.id}
                      onChange={handleChange}
                      placeholder="Ex: 1896"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Marca</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building2 className="w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="Ex: Sony, Godox, Aputure"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nome Completo do Produto</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Type className="w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ex: Iluminador LED RGB P300C com Softbox"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-transparent hover:border-brand-500/20 transition-all">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.is_future || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_future: e.target.checked }))}
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors ${formData.is_future ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.is_future ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Item Futuro (Lançamento)</span>
                      <p className="text-[10px] text-slate-500 font-bold">Ative para sinalizar que o item chegará em breve.</p>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* Media Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <ImageIconLucide className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest">Mídia e Foto</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">URL da Imagem</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ImageIcon className="w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleChange}
                      placeholder="https://exemplo.com/foto.jpg"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1 italic">* Cole o link direto da imagem (Google Images ou site do fabricante)</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] aspect-square border-2 border-dashed border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                  {formData.image_url ? (
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-full h-full object-contain rounded-xl animate-in zoom-in-90 duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const icon = parent.querySelector('.preview-fallback');
                          if (icon) (icon as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`preview-fallback flex-col items-center gap-2 text-slate-300 ${formData.image_url ? 'hidden' : 'flex'}`}>
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Prévia da Foto</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Stock Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <MapPin className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest">Estoque Inicial (Opcional)</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(['ce', 'sc', 'sp'] as const).map(branch => (
                  <div key={branch} className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Filial {branch.toUpperCase()}</label>
                    <input
                      type="number"
                      name={`stock_${branch}`}
                      value={formData[`stock_${branch}` as keyof Product] as number}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white text-center font-bold text-lg"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Observations */}
            <section className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Observações Técnicas / Notas</label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                placeholder="Detalhes sobre compatibilidade, acessórios inclusos, etc."
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white min-h-[120px] resize-none"
              />
            </section>

            {/* Status Messages */}
            {status && (
              <div className={`p-6 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500 ${
                status.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' 
                  : 'bg-rose-50 text-rose-800 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50'
              }`}>
                {status.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
                <p className="text-sm font-bold">{status.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                disabled={loading}
                type="submit"
                className={`w-full py-5 rounded-3xl font-black text-lg text-white shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                  loading 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-brand-600/30'
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Finalizar Cadastro
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Info Card */}
        <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex items-start gap-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-800/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Dica de Familiarização</h4>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 mt-1">
              Ao cadastrar itens que ainda vão chegar, você permite que os vendedores visualizem as fotos e descrições técnicas antecipadamente, facilitando a pré-venda e o conhecimento do produto.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
