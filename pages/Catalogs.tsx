import { BookOpen } from 'lucide-react';

export function Catalogs() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        Catálogos
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Visualize e acesse todos os nossos catálogos de produtos.
                    </p>
                </div>
                <a
                    href="https://drive.google.com/drive/folders/1MuOTCwr3-Swt9fTIK0oY1usuNiF0xGgv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <BookOpen className="w-4 h-4" />
                    Abrir no Google Drive
                </a>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                <iframe
                    src="https://drive.google.com/embeddedfolderview?id=1MuOTCwr3-Swt9fTIK0oY1usuNiF0xGgv#grid"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    title="Catálogos do Google Drive"
                    allow="autoplay"
                ></iframe>
            </div>
        </div>
    );
}
