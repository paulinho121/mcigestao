import { useState, useEffect } from 'react';
import { predictionService, StockPrediction } from '../services/predictionService';
import { TrendingDown, AlertTriangle, CheckCircle, Info, Calendar, ArrowRight } from 'lucide-react';

interface StockInsightsProps {
  branch: 'CE' | 'SC' | 'SP';
}

export const StockInsights: React.FC<StockInsightsProps> = ({ branch }) => {
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPredictions = async () => {
      setLoading(true);
      const data = await predictionService.getPredictions(branch);
      setPredictions(data.filter(p => p.status !== 'stable'));
      setLoading(false);
    };
    loadPredictions();
  }, [branch]);

  if (loading) return (
    <div className="animate-pulse flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3].map(i => <div key={i} className="min-w-[280px] h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>)}
    </div>
  );

  if (predictions.length === 0) return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600" />
      <span className="text-sm font-medium text-green-700 dark:text-green-400">Estoque saudável! Nenhuma ruptura prevista para os próximos 15 dias.</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-brand-600" />
            Insights de Ressuprimento (IA)
        </h3>
        <span className="text-xs text-slate-400">Baseado nos últimos 60 dias</span>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {predictions.map(p => (
          <div key={p.productId} className={`min-w-[300px] p-4 rounded-xl border transition-all ${
            p.status === 'critical' 
              ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
              : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-1.5 rounded-lg ${p.status === 'critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                p.status === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
              }`}>
                {p.status === 'critical' ? 'Crítico' : 'Atenção'}
              </span>
            </div>
            
            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate" title={p.productName}>
              {p.productName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Cód: {p.productId}</p>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Saldo</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{p.currentStock}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Esgota em</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${p.status === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                    <Calendar className="w-3 h-3" />
                    ~{p.daysRemaining} dias
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
