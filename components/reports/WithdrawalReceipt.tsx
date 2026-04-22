import React from 'react';
import { WithdrawalProtocol } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PackageCheck, FileText, CheckCircle2 } from 'lucide-react';

interface WithdrawalReceiptProps {
    protocol: WithdrawalProtocol;
}

export const WithdrawalReceipt: React.FC<WithdrawalReceiptProps> = ({ protocol }) => {
    return (
        <div className="bg-white text-slate-900 font-sans p-8 md:p-12 max-w-4xl mx-auto min-h-screen" id="printable-receipt">
            {/* Global Print Styles to hide EVERYTHING else on the screen */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 1cm; }
                    body * {
                        visibility: hidden;
                    }
                    #printable-receipt, #printable-receipt * {
                        visibility: visible;
                    }
                    #printable-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                }
            `}} />

            {/* Header with Logo */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <PackageCheck className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">MCI GESTÃO</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controle Logístico Inteligente</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">PROTOCOLO DE RETIRADA</h2>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">#{protocol.id.slice(-8).toUpperCase()}</p>
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-12">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Data e Hora
                    </p>
                    <p className="text-base font-bold text-slate-900">
                        {format(new Date(protocol.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade</p>
                    <p className="text-base font-bold text-slate-900">
                        {protocol.branch === 'CE' ? 'Ceará (CE)' : protocol.branch === 'SC' ? 'Santa Catarina (SC)' : 'São Paulo (SP)'}
                    </p>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente / Solicitante</p>
                    <p className="text-base font-bold text-slate-900">{protocol.customer_name}</p>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portador / Motorista</p>
                    <p className="text-base font-bold text-slate-900">{protocol.receiver_name}</p>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nota Fiscal</p>
                    <p className={`text-base font-bold ${protocol.invoice_number ? 'text-slate-900' : 'text-slate-300'}`}>
                        {protocol.invoice_number || 'PENDENTE'}
                    </p>
                </div>
            </div>

            {/* Item Details Table */}
            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden mb-16">
                <div className="bg-slate-900 p-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Detalhamento dos Itens Liberados</h3>
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição do Produto</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Qtd</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Unidade</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-100">
                            <td className="p-4">
                                <p className="text-base font-bold text-slate-900 leading-snug">{protocol.product_name}</p>
                                {protocol.serial_number && (
                                    <p className="text-xs font-bold text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded w-fit">S/N: {protocol.serial_number}</p>
                                )}
                            </td>
                            <td className="p-4 text-center">
                                <p className="text-xl font-black text-slate-900">{protocol.quantity}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">UNIDADES</p>
                            </td>
                            <td className="p-4 text-center">
                                <p className="text-sm font-bold text-slate-900">{protocol.branch}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">FILIAL</p>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {protocol.observations && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações do Protocolo</p>
                                <p className="text-xs font-medium text-slate-700 italic leading-relaxed">
                                    {protocol.observations}
                                </p>
                            </div>
                            {protocol.invoice_number && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NF Faturamento</p>
                                    <p className="text-sm font-black text-slate-900">#{protocol.invoice_number}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-16 mt-24">
                <div className="text-center">
                    <div className="border-t-2 border-slate-900 pt-4">
                        <p className="font-bold text-slate-900 uppercase">{protocol.receiver_name}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Assinatura de quem retirou</p>
                    </div>
                </div>
                
                <div className="text-center">
                    <div className="border-t-2 border-slate-900 pt-4">
                        <p className="font-bold text-slate-900 uppercase">MCI GESTÃO ({protocol.branch})</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Visto / Carimbo da Expedição</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Este documento comprova a transferência de responsabilidade sobre os itens listados acima.
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                    Gerado pelo Sistema StockVision • Protocolo Oficial de Saída
                </p>
            </div>
        </div>
    );
};
