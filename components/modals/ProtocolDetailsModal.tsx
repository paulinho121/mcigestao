import React, { useState } from 'react';
import { X, Trash2, Edit, Printer, AlertTriangle, Loader2, Info } from 'lucide-react';
import { WithdrawalProtocol } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{protocol.product_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                            <span>Qtd: <strong className="text-brand-600">{protocol.quantity} un</strong></span>
                            <span>•</span>
                            <span>Unidade: <strong>{protocol.branch}</strong></span>
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data do Registro</p>
                            <p className="font-bold text-slate-900 dark:text-white">
                                {format(new Date(protocol.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número de Série</p>
                            <p className="font-bold text-slate-900 dark:text-white">{protocol.serial_number || 'N/A'}</p>
                        </div>
                    </div>

                    {protocol.observations && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl mt-1">
                                {protocol.observations}
                            </p>
                        </div>
                    )}

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
                                    <p className="text-xs mt-1">A quantidade ({protocol.quantity} un) será devolvida ao estoque da unidade {protocol.branch}. Esta ação será registrada nos logs de auditoria.</p>
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
