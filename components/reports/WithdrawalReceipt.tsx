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
                        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">MCI GESTÃO</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Controle Logístico</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-black uppercase text-slate-300">PROTOCOLO DE RETIRADA</h2>
                    <p className="text-lg font-bold text-slate-900">#{protocol.id.slice(-8).toUpperCase()}</p>
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-12">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Data e Hora do Registro
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                        {format(new Date(protocol.created_at), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}
                    </p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidade Responsável</p>
                    <p className="text-lg font-bold text-slate-900">
                        {protocol.branch === 'CE' ? 'Filial Ceará (CE)' : protocol.branch === 'SC' ? 'Filial Santa Catarina (SC)' : 'Filial São Paulo (SP)'}
                    </p>
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente / Solicitante</p>
                    <p className="text-lg font-bold text-slate-900">{protocol.customer_name}</p>
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responsável pela Retirada</p>
                    <p className="text-lg font-bold text-slate-900">{protocol.receiver_name}</p>
                </div>
            </div>

            {/* Item Details Box */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-8 mb-16">
                <div className="flex items-center gap-2 mb-6">
                    <CheckCircle2 className="w-5 h-5 text-slate-400" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Itens Liberados</h3>
                </div>
                
                <div className="flex justify-between items-end border-b-2 border-slate-200 pb-4 mb-4">
                    <div className="flex-1 pr-8">
                        <p className="text-2xl font-black text-slate-900 leading-tight">{protocol.product_name}</p>
                        {protocol.serial_number && (
                            <p className="text-sm font-bold text-slate-500 mt-2">S/N: {protocol.serial_number}</p>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">QTD</p>
                        <p className="text-4xl font-black text-slate-900">{protocol.quantity} <span className="text-xl">un</span></p>
                    </div>
                </div>

                {protocol.observations && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Observações Operacionais</p>
                        <p className="text-sm font-medium text-slate-700 italic">{protocol.observations}</p>
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
