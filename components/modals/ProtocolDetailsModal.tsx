import React, { useState } from 'react';
import { X, Trash2, Edit, AlertTriangle, Loader2, Info, FileText, CheckCircle2, PackageCheck } from 'lucide-react';
import { WithdrawalProtocol } from '../../types';
import { format } from 'date-fns';
import { inventoryService } from '../../services/inventoryService';

interface ProtocolDetailsModalProps {
    protocol: WithdrawalProtocol | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    userEmail: string;
}

export const ProtocolDetailsModal: React.FC<ProtocolDetailsModalProps> = ({ protocol, isOpen, onClose, onDelete, userEmail }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState(protocol?.invoice_number || '');
    const [masterMemo, setMasterMemo] = useState(protocol?.master_memo || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingMemo, setIsSavingMemo] = useState(false);
    const [isEditingMemo, setIsEditingMemo] = useState(false);

    React.useEffect(() => {
        if (protocol) {
            setInvoiceNumber(protocol.invoice_number || '');
            setMasterMemo(protocol.master_memo || '');
            setIsEditing(false);
            setIsEditingMemo(false);
        }
    }, [protocol]);

    if (!isOpen || !protocol) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await inventoryService.deleteWithdrawalProtocol(protocol, userEmail);
            onDelete();
            onClose();
        } catch (error) {
            console.error('Error deleting protocol:', error);
            alert('Erro ao excluir o protocolo. Verifique suas permissões.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveInvoice = async () => {
        if (!protocol) return;
        setIsSaving(true);
        try {
            await inventoryService.updateWithdrawalProtocol(protocol.id, {
                invoice_number: invoiceNumber
            });
            protocol.invoice_number = invoiceNumber;
            setIsEditing(false);
            onDelete();
        } catch (error) {
            console.error('Error updating invoice:', error);
            alert('Erro ao atualizar a nota fiscal.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMemo = async () => {
        if (!protocol) return;
        setIsSavingMemo(true);
        try {
            await inventoryService.updateWithdrawalProtocol(protocol.id, {
                master_memo: masterMemo
            });
            protocol.master_memo = masterMemo;
            setIsEditingMemo(false);
        } catch (error) {
            console.error('Error updating memo:', error);
            alert('Erro ao atualizar a observação do super usuário.');
        } finally {
            setIsSavingMemo(false);
        }
    };

    const isOverdue = !protocol.invoice_number && 
        (new Date().getTime() - new Date(protocol.created_at).getTime()) / (1000 * 3600 * 24) >= 7;


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                
                <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Info className="w-6 h-6 text-brand-600" />
                            Detalhes do Protocolo
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                            ID: {protocol.id.slice(-8)}
                        </p>
                        {isOverdue && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Alarme: NF Pendente (+7 dias)
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="space-y-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <PackageCheck className="w-3 h-3" /> Itens Liberados ({protocol.items?.length || 0})
                        </p>
                        <div className="space-y-3">
                            {protocol.items?.map((item, index) => (
                                <div key={item.id || index} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight pr-4">{item.product_name}</h3>
                                        <span className="text-lg font-black text-brand-600 flex-shrink-0">{item.quantity} un</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        {item.serial_number && (
                                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                                                S/N: {item.serial_number}
                                            </span>
                                        )}
                                        {item.observations && (
                                            <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md italic">
                                                "{item.observations}"
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente Solicitante</p>
                            <p className="font-bold text-slate-900 dark:text-white">{protocol.customer_name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsável pela Retirada</p>
                            <p className="font-bold text-slate-900 dark:text-white">{protocol.receiver_name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade</p>
                            <p className="font-bold text-slate-900 dark:text-white">{protocol.branch}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data do Registro</p>
                            <p className="font-bold text-slate-900 dark:text-white">
                                {format(new Date(protocol.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                        </div>
                        <div className="col-span-2 p-4 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-800">
                            <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Nota Fiscal (Faturamento)
                            </p>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Digite o número da NF..."
                                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white text-sm"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveInvoice}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors flex items-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Salvar
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(false); setInvoiceNumber(protocol.invoice_number || ''); }}
                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className={`font-black text-lg ${protocol.invoice_number ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic font-normal text-sm'}`}>
                                        {protocol.invoice_number || 'Não faturada'}
                                    </p>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                    >
                                        <Edit className="w-3 h-3" /> {protocol.invoice_number ? 'Editar NF' : 'Inserir NF'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Master Memo Section */}
                        <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-500" /> Observação Super Usuário (Acompanhamento)
                            </p>
                            
                            {isEditingMemo ? (
                                <div className="space-y-3">
                                    <textarea
                                        rows={3}
                                        placeholder="Adicione uma nota sobre o status deste protocolo (ex: Aguardando retorno do vendedor X)..."
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white text-sm resize-none"
                                        value={masterMemo}
                                        onChange={(e) => setMasterMemo(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveMemo}
                                            disabled={isSavingMemo}
                                            className="flex-1 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isSavingMemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Salvar Nota
                                        </button>
                                        <button
                                            onClick={() => { setIsEditingMemo(false); setMasterMemo(protocol.master_memo || ''); }}
                                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="min-h-[40px] p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl">
                                        <p className={`text-sm ${masterMemo ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 italic'}`}>
                                            {masterMemo || 'Nenhuma observação de acompanhamento registrada.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingMemo(true)}
                                        className="w-fit text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-1"
                                    >
                                        <Edit className="w-3 h-3" /> {masterMemo ? 'Editar Observação' : 'Adicionar Observação'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>



                    {protocol.photo_url && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Comprovante Fotográfico</p>
                            <img src={protocol.photo_url} alt="Comprovante" className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    {showDeleteConfirm ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-800">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold">Confirma a exclusão deste protocolo?</p>
                                    <p className="text-xs mt-1">Todos os itens ({protocol.items?.length || 0}) serão devolvidos ao estoque da unidade {protocol.branch}. Esta ação será registrada nos logs de auditoria.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                >
                                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Excluir Permanentemente</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex-1 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Excluir
                            </button>
                            <button
                                onClick={() => {
                                    alert('Para editar um protocolo, recomendamos excluí-lo (o que devolve o item ao estoque) e criar um novo com os dados corretos para manter a integridade dos logs.');
                                }}
                                className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Edit className="w-4 h-4" /> Editar
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
