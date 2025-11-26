import { useState } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, X, FileSpreadsheet, Settings } from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { ImportManagement } from './ImportManagement';
import { XmlUpload } from './XmlUpload';

interface UploadProps {
}

interface ParsedRow {
    COD?: string;
    'NOME DO PRODUTO'?: string;
    MARCA?: string;
    'CEARÁ'?: string;
    'SANTA CATARINA'?: string;
    'SÃO PAULO'?: string;
    TOTAL?: string;
    RESERVA?: string;
}

type UploadSubTab = 'csv' | 'import' | 'xml';

export const Upload: React.FC<UploadProps> = () => {
    const [activeSubTab, setActiveSubTab] = useState<UploadSubTab>('csv');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);

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

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (selectedFile: File) => {
        setError('');
        setSuccess('');
        setParsedData([]);

        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
            setError('Por favor, selecione um arquivo CSV válido');
            return;
        }

        setFile(selectedFile);
        parseFile(selectedFile);
    };

    const parseFile = (file: File) => {
        setLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const products: Product[] = results.data.map((row: any) => {
                        const parsedRow = row as ParsedRow;

                        return {
                            id: parsedRow.COD?.toString() || '',
                            name: parsedRow['NOME DO PRODUTO'] || '',
                            brand: parsedRow.MARCA || '',
                            stock_ce: parseInt(parsedRow['CEARÁ'] || '0'),
                            stock_sc: parseInt(parsedRow['SANTA CATARINA'] || '0'),
                            stock_sp: parseInt(parsedRow['SÃO PAULO'] || '0'),
                            total: parseInt(parsedRow.TOTAL || '0'),
                            reserved: parseInt(parsedRow.RESERVA || '0')
                        };
                    }).filter(p => p.id && p.name);

                    if (products.length === 0) {
                        setError('Nenhum produto válido encontrado no arquivo');
                    } else {
                        setParsedData(products);
                        setSuccess(`${products.length} produtos encontrados e prontos para upload`);
                    }
                } catch (err) {
                    setError('Erro ao processar arquivo. Verifique o formato.');
                } finally {
                    setLoading(false);
                }
            },
            error: (error) => {
                setError(`Erro ao ler arquivo: ${error.message}`);
                setLoading(false);
            }
        });
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await inventoryService.uploadProducts(parsedData);
            setSuccess(`${parsedData.length} produtos enviados com sucesso para o banco de dados!`);

            setTimeout(() => {
                setFile(null);
                setParsedData([]);
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar dados para o banco');
        } finally {
            setLoading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setParsedData([]);
        setError('');
        setSuccess('');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sub-tabs */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveSubTab('csv')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeSubTab === 'csv'
                                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/30'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            Upload CSV
                        </button>
                        <button
                            onClick={() => setActiveSubTab('import')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeSubTab === 'import'
                                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/30'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Settings className="w-5 h-5" />
                            Gestão de Importação
                        </button>
                        <button
                            onClick={() => setActiveSubTab('xml')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeSubTab === 'xml'
                                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/30'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <FileText className="w-5 h-5" />
                            Upload XML (NFe)
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeSubTab === 'import' ? (
                <ImportManagement />
            ) : activeSubTab === 'xml' ? (
                <XmlUpload />
            ) : (
                <div className="p-6">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload de Planilha</h1>
                        <p className="text-slate-600 mb-8">Envie uma planilha CSV com os dados de produtos para atualizar o banco de dados</p>

                        {success && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2" /> {success}
                            </div>
                        )}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2" /> {error}
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Selecionar Arquivo</h2>

                            {!file ? (
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
                                    <UploadIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                                    <p className="text-lg font-semibold text-slate-700 mb-2">
                                        Arraste e solte seu arquivo CSV aqui
                                    </p>
                                    <p className="text-sm text-slate-500 mb-4">ou</p>
                                    <label className="inline-block px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors cursor-pointer font-semibold">
                                        Selecionar Arquivo
                                        <input
                                            type="file"
                                            accept=".csv,text/csv"
                                            onChange={handleFileInput}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-xs text-slate-400 mt-4">Formato aceito: CSV</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <FileText className="w-8 h-8 text-brand-600 mr-3" />
                                            <div>
                                                <p className="font-semibold text-slate-900">{file.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {(file.size / 1024).toFixed(2)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={clearFile}
                                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <h3 className="font-semibold text-blue-900 mb-2">Formato Esperado</h3>
                                <p className="text-sm text-blue-700 mb-2">
                                    O arquivo CSV deve conter as seguintes colunas:
                                </p>
                                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                                    <li>• <strong>COD</strong> - Código do produto</li>
                                    <li>• <strong>NOME DO PRODUTO</strong> - Nome/descrição</li>
                                    <li>• <strong>MARCA</strong> - Marca do produto</li>
                                    <li>• <strong>CEARÁ</strong> - Estoque no Ceará</li>
                                    <li>• <strong>SANTA CATARINA</strong> - Estoque em Santa Catarina</li>
                                    <li>• <strong>SÃO PAULO</strong> - Estoque em São Paulo</li>
                                    <li>• <strong>TOTAL</strong> - Total de estoque</li>
                                    <li>• <strong>RESERVA</strong> - Quantidade reservada</li>
                                </ul>
                            </div>
                        </div>

                        {parsedData.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Pré-visualização ({parsedData.length} produtos)
                                    </h2>
                                    <button
                                        onClick={handleUpload}
                                        disabled={loading}
                                        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <UploadIcon className="w-5 h-5" />
                                                Enviar para Banco de Dados
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Código</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Produto</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Marca</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700">CE</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700">SC</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700">SP</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 10).map((product, index) => (
                                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-slate-900">{product.id}</td>
                                                    <td className="px-4 py-3 text-slate-900">{product.name}</td>
                                                    <td className="px-4 py-3 text-slate-600">{product.brand}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900">{product.stock_ce}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900">{product.stock_sc}</td>
                                                    <td className="px-4 py-3 text-right text-slate-900">{product.stock_sp}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{product.total}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.length > 10 && (
                                        <p className="text-sm text-slate-500 mt-4 text-center">
                                            Mostrando 10 de {parsedData.length} produtos
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
