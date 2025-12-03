import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, FileCode, ArrowRight, ArrowLeft, Save, PackagePlus } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';

interface XmlProduct {
    code: string;
    name: string;
    quantity: number;
    cfop: string;
    exists?: boolean; // Whether product exists in database
}

interface XmlData {
    id: string; // Unique ID for the file/batch
    fileName: string;
    nfeNumber: string;
    series: string;
    date: string;
    branchCnpj: string;
    branch: 'CE' | 'SC' | 'SP' | null;
    natOp: string; // Natureza da Operação
    isTransfer: boolean; // Se é uma transferência
    needsOperationSelection: boolean; // Se precisa que usuário selecione entrada/saída
    operation: 'entry' | 'exit'; // entry (add), exit (remove)
    products: XmlProduct[];
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
    newProductsCount?: number; // Count of new products that will be registered
    productsChecked?: boolean; // Whether products have been checked for existence
}

// Mapping of CNPJ to Branch (Mock for now, can be persisted)
const DEFAULT_BRANCH_MAPPING: Record<string, 'CE' | 'SC' | 'SP'> = {
    // Add known CNPJs here if available
};

export const XmlUpload: React.FC = () => {
    const [xmlItems, setXmlItems] = useState<XmlData[]>([]);
    const [itemNeedingSelection, setItemNeedingSelection] = useState<XmlData | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [branchMappings, setBranchMappings] = useState<Record<string, 'CE' | 'SC' | 'SP'>>(DEFAULT_BRANCH_MAPPING);

    // Load mappings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('stockvision_branch_mappings');
        if (saved) {
            try {
                setBranchMappings({ ...DEFAULT_BRANCH_MAPPING, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Failed to parse branch mappings", e);
            }
        }
    }, []);

    // Save mappings when changed
    const updateBranchMapping = (cnpj: string, branch: 'CE' | 'SC' | 'SP') => {
        const newMappings = { ...branchMappings, [cnpj]: branch };
        setBranchMappings(newMappings);
        localStorage.setItem('stockvision_branch_mappings', JSON.stringify(newMappings));

        // Update existing items
        setXmlItems(prev => prev.map(item => {
            if (item.branchCnpj === cnpj) {
                return { ...item, branch };
            }
            return item;
        }));
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = async (newFiles: File[]) => {
        const xmlFiles = newFiles.filter(f => f.type === 'text/xml' || f.name.endsWith('.xml'));
        if (xmlFiles.length === 0) return;

        const newItems: XmlData[] = [];

        for (const file of xmlFiles) {
            try {
                const text = await file.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");

                // Basic NFe parsing logic
                const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
                if (!infNFe) throw new Error("Invalid NFe XML");

                const ide = infNFe.getElementsByTagName('ide')[0];
                const emit = infNFe.getElementsByTagName('emit')[0];
                const dest = infNFe.getElementsByTagName('dest')[0];
                const detList = infNFe.getElementsByTagName('det');

                const nfeNumber = ide.getElementsByTagName('nNF')[0]?.textContent || '';
                const series = ide.getElementsByTagName('serie')[0]?.textContent || '';
                const dhEmi = ide.getElementsByTagName('dhEmi')[0]?.textContent || '';
                const tpNF = ide.getElementsByTagName('tpNF')[0]?.textContent || '0'; // 0=Entry, 1=Exit
                const natOp = ide.getElementsByTagName('natOp')[0]?.textContent || '';

                // Detectar se é transferência
                const isTransfer = natOp.toLowerCase().includes('transfer');

                // Determine operation and relevant CNPJ
                // tpNF: 0 = Entrada (We received it), 1 = Saída (We sent it)
                let operation: 'entry' | 'exit' = tpNF === '0' ? 'entry' : 'exit';
                let needsOperationSelection = isTransfer;

                // If Entry (0), stock increases. Branch is Destinatário (us).
                // If Exit (1), stock decreases. Branch is Emitente (us).

                let targetCnpj = '';
                if (operation === 'entry') {
                    targetCnpj = dest.getElementsByTagName('CNPJ')[0]?.textContent || '';
                } else {
                    targetCnpj = emit.getElementsByTagName('CNPJ')[0]?.textContent || '';
                }

                const products: XmlProduct[] = [];
                for (let i = 0; i < detList.length; i++) {
                    const prod = detList[i].getElementsByTagName('prod')[0];
                    const code = prod.getElementsByTagName('cProd')[0]?.textContent || '';
                    const name = prod.getElementsByTagName('xProd')[0]?.textContent || '';
                    const qCom = parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent || '0');
                    const cfop = prod.getElementsByTagName('CFOP')[0]?.textContent || '';

                    products.push({ code, name, quantity: qCom, cfop });
                }

                newItems.push({
                    id: Math.random().toString(36).substr(2, 9),
                    fileName: file.name,
                    nfeNumber,
                    series,
                    date: dhEmi,
                    branchCnpj: targetCnpj,
                    branch: branchMappings[targetCnpj] || null,
                    natOp,
                    isTransfer,
                    needsOperationSelection,
                    operation,
                    products,
                    status: 'pending'
                });

            } catch (err) {
                console.error(`Error parsing ${file.name}`, err);
                // Optionally handle error state for this file
            }
        }

        setXmlItems(prev => [...prev, ...newItems]);

        // Check products existence for new items
        checkProductsInItems(newItems);

        // Verificar se há itens que precisam de seleção
        const firstNeedingSelection = newItems.find(item => item.needsOperationSelection);
        if (firstNeedingSelection) {
            setItemNeedingSelection(firstNeedingSelection);
        }
    };

    // Check which products exist in the database
    const checkProductsInItems = async (items: XmlData[]) => {
        for (const item of items) {
            let newProductsCount = 0;

            // Check each product
            for (const product of item.products) {
                const exists = await inventoryService.checkProductExists(product.code);
                product.exists = exists;
                if (!exists) {
                    newProductsCount++;
                }
            }

            // Update item with check results
            setXmlItems(prev => prev.map(i =>
                i.id === item.id
                    ? { ...i, productsChecked: true, newProductsCount, products: item.products }
                    : i
            ));
        }
    };

    // Verificar se há itens pendentes de seleção quando a lista muda
    useEffect(() => {
        if (!itemNeedingSelection) {
            const needsSelection = xmlItems.find(item => item.needsOperationSelection);
            if (needsSelection) {
                setItemNeedingSelection(needsSelection);
            }
        }
    }, [xmlItems, itemNeedingSelection]);

    const handleOperationSelection = (itemId: string, operation: 'entry' | 'exit') => {
        setXmlItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, operation, needsOperationSelection: false }
                : item
        ));
        setItemNeedingSelection(null);
    };

    const removeFile = (index: number) => {
        setXmlItems(prev => prev.filter((_, i) => i !== index));
    };

    const processStock = async () => {
        setLoading(true);

        const itemsToProcess = xmlItems.filter(item => item.status === 'pending' || item.status === 'error');

        for (const item of itemsToProcess) {
            if (item.needsOperationSelection) {
                setXmlItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', message: 'Selecione se é entrada ou saída' } : i));
                continue;
            }

            if (!item.branch) {
                setXmlItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', message: 'Filial não identificada' } : i));
                continue;
            }

            setXmlItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

            try {
                let createdCount = 0;
                let updatedCount = 0;

                // First pass: Check and create missing products
                for (const prod of item.products) {
                    const exists = await inventoryService.checkProductExists(prod.code);

                    if (!exists) {
                        // Create new product with initial stock of 0
                        await inventoryService.createProductFromXml(
                            prod.code,
                            prod.name,
                            'Sem Marca' // Default brand for XML imports
                        );
                        createdCount++;
                        console.log(`Created new product: ${prod.code} - ${prod.name}`);
                    }
                }

                // Second pass: Adjust stock for all products
                for (const prod of item.products) {
                    // Determine adjustment
                    // Entry = Add, Exit = Subtract
                    const modifier = item.operation === 'entry' ? 1 : -1;
                    const adjustment = prod.quantity * modifier;

                    const adjustments = {
                        ce: item.branch === 'CE' ? adjustment : 0,
                        sc: item.branch === 'SC' ? adjustment : 0,
                        sp: item.branch === 'SP' ? adjustment : 0
                    };

                    await inventoryService.adjustStock(prod.code, adjustments);
                    updatedCount++;
                }

                const successMessage = createdCount > 0
                    ? `${createdCount} produto(s) cadastrado(s), ${updatedCount} estoque(s) atualizado(s)`
                    : `${updatedCount} estoque(s) atualizado(s)`;

                setXmlItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', message: successMessage } : i));

            } catch (err: any) {
                setXmlItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', message: err.message || 'Erro ao atualizar' } : i));
            }
        }

        setLoading(false);
    };

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload de XML (NFe)</h1>
                <p className="text-slate-600 mb-8">Envie arquivos XML de notas fiscais para atualizar o estoque automaticamente.</p>

                {/* Upload Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                            }`}
                    >
                        <FileCode className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                        <p className="text-lg font-semibold text-slate-700 mb-2">
                            Arraste e solte arquivos XML aqui
                        </p>
                        <p className="text-sm text-slate-500 mb-4">ou</p>
                        <label className="inline-block px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors cursor-pointer font-semibold">
                            Selecionar Arquivos
                            <input
                                type="file"
                                accept=".xml,text/xml"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Preview List */}
                {xmlItems.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Arquivos Identificados ({xmlItems.length})</h2>
                            <button
                                onClick={processStock}
                                disabled={loading || xmlItems.every(i => i.status === 'success')}
                                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Atualizar Estoque
                                    </>
                                )}
                            </button>
                        </div>

                        {xmlItems.map((item, index) => (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${item.operation === 'entry' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {item.operation === 'entry' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{item.fileName}</h3>
                                            <p className="text-sm text-slate-500">
                                                NFe: {item.nfeNumber} • Série: {item.series} • {new Date(item.date).toLocaleDateString()}
                                            </p>
                                            {item.isTransfer && (
                                                <p className="text-xs text-brand-600 font-semibold mt-1">
                                                    📦 {item.natOp}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">CNPJ: {item.branchCnpj}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Branch Selector */}
                                        <div className="flex flex-col items-end">
                                            <label className="text-xs text-slate-500 mb-1">Filial</label>
                                            <select
                                                value={item.branch || ''}
                                                onChange={(e) => updateBranchMapping(item.branchCnpj, e.target.value as any)}
                                                disabled={item.status === 'success'}
                                                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${!item.branch ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 bg-white text-slate-700'
                                                    }`}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="CE">Ceará (CE)</option>
                                                <option value="SC">Santa Catarina (SC)</option>
                                                <option value="SP">São Paulo (SP)</option>
                                            </select>
                                        </div>

                                        {/* Status Indicator */}
                                        <div className="w-32 text-right">
                                            {item.needsOperationSelection && <span className="text-orange-600 font-semibold flex items-center justify-end gap-1"><AlertCircle className="w-4 h-4" /> Aguardando</span>}
                                            {!item.needsOperationSelection && item.status === 'success' && <span className="text-green-600 font-semibold flex items-center justify-end gap-1"><CheckCircle className="w-4 h-4" /> Sucesso</span>}
                                            {!item.needsOperationSelection && item.status === 'error' && <span className="text-red-600 font-semibold flex items-center justify-end gap-1"><AlertCircle className="w-4 h-4" /> Erro</span>}
                                            {!item.needsOperationSelection && item.status === 'processing' && <span className="text-blue-600 font-semibold">Processando...</span>}
                                            {!item.needsOperationSelection && item.status === 'pending' && <span className="text-slate-400">Pendente</span>}
                                        </div>

                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                            disabled={loading}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {item.message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm ${item.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                        {item.message}
                                    </div>
                                )}

                                {/* New Products Badge */}
                                {item.productsChecked && item.newProductsCount && item.newProductsCount > 0 && item.status === 'pending' && (
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                                        <PackagePlus className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-700">
                                            {item.newProductsCount} produto(s) novo(s) serão cadastrados automaticamente
                                        </span>
                                    </div>
                                )}

                                {/* Products Preview */}
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-slate-700 mb-2">Produtos ({item.products.length})</p>
                                    <div className="max-h-40 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-1 text-left">Cód.</th>
                                                    <th className="px-2 py-1 text-left">Nome</th>
                                                    <th className="px-2 py-1 text-right">Qtd.</th>
                                                    <th className="px-2 py-1 text-right">CFOP</th>
                                                    {item.productsChecked && <th className="px-2 py-1 text-center">Status</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.products.map((prod, idx) => (
                                                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                                                        <td className="px-2 py-1 font-mono text-slate-600">{prod.code}</td>
                                                        <td className="px-2 py-1 text-slate-900 truncate max-w-[200px]">{prod.name}</td>
                                                        <td className={`px-2 py-1 text-right font-semibold ${item.operation === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {item.operation === 'entry' ? '+' : '-'}{prod.quantity}
                                                        </td>
                                                        <td className="px-2 py-1 text-right text-slate-500">{prod.cfop}</td>
                                                        {item.productsChecked && (
                                                            <td className="px-2 py-1 text-center">
                                                                {prod.exists === false ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                                        <PackagePlus className="w-3 h-3" />
                                                                        Novo
                                                                    </span>
                                                                ) : prod.exists === true ? (
                                                                    <span className="text-slate-400 text-xs">✓</span>
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs">...</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal de Seleção de Operação para Transferências */}
                {itemNeedingSelection && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">Transferência Detectada</h2>
                            <p className="text-slate-600 mb-6">
                                Este XML é uma <span className="font-semibold text-brand-600">transferência</span>.
                                Por favor, selecione se você está <strong>recebendo</strong> (entrada) ou <strong>enviando</strong> (saída) os produtos.
                            </p>

                            <div className="bg-slate-50 rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500">NFe:</span>
                                        <span className="ml-2 font-semibold text-slate-900">{itemNeedingSelection.nfeNumber}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Série:</span>
                                        <span className="ml-2 font-semibold text-slate-900">{itemNeedingSelection.series}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Natureza:</span>
                                        <span className="ml-2 font-semibold text-brand-600">{itemNeedingSelection.natOp}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500">CNPJ:</span>
                                        <span className="ml-2 font-mono text-slate-700">{itemNeedingSelection.branchCnpj}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleOperationSelection(itemNeedingSelection.id, 'entry')}
                                    className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 border-2 border-green-300 hover:border-green-500 rounded-xl transition-all group"
                                >
                                    <ArrowRight className="w-12 h-12 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
                                    <span className="text-lg font-bold text-green-700">Entrada</span>
                                    <span className="text-sm text-green-600 mt-1">Receber produtos</span>
                                    <span className="text-xs text-green-500 mt-2">+ Adiciona ao estoque</span>
                                </button>

                                <button
                                    onClick={() => handleOperationSelection(itemNeedingSelection.id, 'exit')}
                                    className="flex flex-col items-center justify-center p-6 bg-red-50 hover:bg-red-100 border-2 border-red-300 hover:border-red-500 rounded-xl transition-all group"
                                >
                                    <ArrowLeft className="w-12 h-12 text-red-600 mb-3 group-hover:scale-110 transition-transform" />
                                    <span className="text-lg font-bold text-red-700">Saída</span>
                                    <span className="text-sm text-red-600 mt-1">Enviar produtos</span>
                                    <span className="text-xs text-red-500 mt-2">- Subtrai do estoque</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
