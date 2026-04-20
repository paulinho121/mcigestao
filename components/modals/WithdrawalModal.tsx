import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, CheckCircle2, AlertCircle, Search, User, UserCheck, MapPin, Hash, FileText, ChevronRight, Loader2, Printer } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { Product, WithdrawalProtocol } from '../../types';
import { WithdrawalReceipt } from '../reports/WithdrawalReceipt';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userEmail: string;
}

type Step = 'product' | 'details' | 'photo' | 'confirm' | 'success';

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onSuccess, userEmail }) => {
    const [step, setStep] = useState<Step>('product');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        customer_name: '',
        receiver_name: '',
        branch: 'CE' as 'CE' | 'SC' | 'SP',
        quantity: 1,
        serial_number: '',
        observations: ''
    });
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedProtocol, setSavedProtocol] = useState<WithdrawalProtocol | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                const results = await inventoryService.searchProducts(searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    if (!isOpen) return null;

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setStep('details');
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setStep('confirm');
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const result = await inventoryService.registerWithdrawal({
                product_id: selectedProduct.id,
                product_name: selectedProduct.name,
                customer_name: formData.customer_name,
                receiver_name: formData.receiver_name,
                branch: formData.branch,
                quantity: formData.quantity,
                serial_number: formData.serial_number,
                observations: formData.observations,
                user_email: userEmail
            }, photo || undefined);
            
            if (result) setSavedProtocol(result);
            setStep('success');
            // Remove the automatic close to allow printing
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar retirada');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep('product');
        setSelectedProduct(null);
        setSearchQuery('');
        setFormData({
            customer_name: '',
            receiver_name: '',
            branch: 'CE',
            quantity: 1,
            serial_number: '',
            observations: ''
        });
        setPhoto(null);
        setPhotoPreview(null);
        setError(null);
        setSavedProtocol(null);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Protocolo de Retirada</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Padrão Logístico Lalamove</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                        className="h-full bg-brand-600 transition-all duration-500 ease-out" 
                        style={{ width: `${(Object.keys(steps).indexOf(step) + 1) * 20}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {step === 'product' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto text-brand-600 mb-2">
                                    <Search className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold dark:text-white">Selecione o Item</h3>
                                <p className="text-sm text-slate-500">Busque pelo código ou nome do produto</p>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Ex: MC-001 ou Cabo HDMI..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                {searchResults.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleProductSelect(product)}
                                        className="w-full p-4 flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-brand-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500">
                                                {product.id.slice(0, 4)}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{product.name}</p>
                                                <p className="text-xs text-slate-500">{product.brand}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'details' && selectedProduct && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center gap-4 border border-brand-100 dark:border-brand-800">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-bold text-brand-600 shadow-sm">
                                    {selectedProduct.id.slice(0, 4)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">{selectedProduct.name}</p>
                                    <p className="text-xs text-slate-500">Estoque Total: {selectedProduct.total} unidades</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                        <User className="w-3 h-3" /> Cliente (Quem solicitou)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nome do Cliente"
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                        <UserCheck className="w-3 h-3" /> Quem está retirando
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nome do Portador / Motorista"
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                                        value={formData.receiver_name}
                                        onChange={(e) => setFormData({...formData, receiver_name: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Unidade
                                        </label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white appearance-none"
                                            value={formData.branch}
                                            onChange={(e) => setFormData({...formData, branch: e.target.value as any})}
                                        >
                                            <option value="CE">Ceará (CE)</option>
                                            <option value="SC">Santa Catarina (SC)</option>
                                            <option value="SP">São Paulo (SP)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> Quantidade
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedProduct[`stock_${formData.branch.toLowerCase()}` as keyof Product] as number}
                                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> Número de Série (S/N)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Caso houver..."
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                                        value={formData.serial_number}
                                        onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> Observações
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Observações adicionais..."
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white resize-none"
                                        value={formData.observations}
                                        onChange={(e) => setFormData({...formData, observations: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('photo')}
                                disabled={!formData.customer_name || !formData.receiver_name}
                                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                Próximo Passo <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {step === 'photo' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 py-4">
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto text-amber-600 mb-2">
                                    <Camera className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold dark:text-white">Comprovação de Entrega</h3>
                                <p className="text-sm text-slate-500">Tire uma foto do item sendo entregue ou do comprovante assinado.</p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-video w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all group"
                                >
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-700 dark:text-slate-300">Escolher arquivo ou Capturar</p>
                                        <p className="text-xs text-slate-400">Clique para abrir a câmera ou galeria</p>
                                    </div>
                                </button>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handlePhotoChange}
                                />
                                
                                <button 
                                    onClick={() => setStep('confirm')}
                                    className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                                >
                                    Continuar sem foto (Não recomendado)
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && selectedProduct && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-center dark:text-white">Resumo do Protocolo</h3>
                            
                            {photoPreview && (
                                <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-xl rotate-1">
                                    <img src={photoPreview} alt="Comprovante" className="w-full aspect-video object-cover" />
                                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4">
                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Produto</span>
                                    <span className="text-sm font-bold dark:text-white">{selectedProduct.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Quantidade</span>
                                    <span className="text-sm font-bold text-brand-600">{formData.quantity} un</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Retirada por</span>
                                    <span className="text-sm font-bold dark:text-white">{formData.receiver_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Unidade</span>
                                    <span className="text-sm font-bold dark:text-white">{formData.branch}</span>
                                </div>
                                {formData.serial_number && (
                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">S/N</span>
                                        <span className="text-sm font-bold dark:text-white">{formData.serial_number}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Finalizar Retirada <CheckCircle2 className="w-5 h-5" /></>}
                            </button>
                            
                            <button
                                onClick={() => setStep('details')}
                                className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Voltar e Editar
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-12 space-y-6 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 animate-bounce">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Retirada Concluída!</h3>
                                <p className="text-slate-500">O estoque foi atualizado automaticamente e o protocolo registrado.</p>
                            </div>
                            <div className="inline-block px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Protocolo #WD-{Date.now().toString().slice(-6)}
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handlePrint}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                                >
                                    <Printer className="w-5 h-5" /> Imprimir Comprovante
                                </button>
                                <button
                                    onClick={() => { onClose(); onSuccess(); resetForm(); }}
                                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    Fechar Janela
                                </button>
                            </div>

                            {/* Hidden component for printing */}
                            <div className="hidden print:block print:fixed print:inset-0 print:z-[99999] print:bg-white overflow-visible">
                                {savedProtocol && <WithdrawalReceipt protocol={savedProtocol} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const steps = {
    product: 0,
    details: 1,
    photo: 2,
    confirm: 3,
    success: 4
};
