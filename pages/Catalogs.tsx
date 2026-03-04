import { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Folder, File, ChevronRight, Home, ArrowLeft,
    ExternalLink, Loader2, Image, FileText, FileVideo,
    FileSpreadsheet, RefreshCw, AlertCircle, X, Maximize2, Minimize2
} from 'lucide-react';

// ─── Configuration ─────────────────────────────────────────────────────────
const ROOT_FOLDER_ID = '1MuOTCwr3-Swt9fTIK0oY1usuNiF0xGgv';
const GDRIVE_API_KEY = import.meta.env.VITE_GDRIVE_API_KEY as string | undefined;
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

// ─── Types ──────────────────────────────────────────────────────────────────
interface DriveItem {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    webViewLink?: string;
    size?: string;
    modifiedTime?: string;
}

interface BreadcrumbItem {
    id: string;
    name: string;
}

// ─── Drive API helper ────────────────────────────────────────────────────────
async function fetchFolderContents(folderId: string): Promise<DriveItem[]> {
    if (!GDRIVE_API_KEY) throw new Error('NO_API_KEY');

    const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed = false`,
        key: GDRIVE_API_KEY,
        fields: 'files(id,name,mimeType,thumbnailLink,webViewLink,size,modifiedTime)',
        orderBy: 'folder,name',
        pageSize: '200',
    });

    const res = await fetch(`${DRIVE_API}?${params}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    return (data.files || []) as DriveItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isFolder(mimeType: string) {
    return mimeType === 'application/vnd.google-apps.folder';
}

function isViewableInApp(mimeType: string) {
    // All these can be embedded via Drive preview URL
    return (
        mimeType.includes('pdf') ||
        mimeType.startsWith('image/') ||
        mimeType.includes('presentation') ||
        mimeType.includes('document') ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('google-apps')
    );
}

function getDrivePreviewUrl(fileId: string) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
function DriveIcon({ mimeType, thumbnailLink }: { mimeType: string; thumbnailLink?: string }) {
    if (isFolder(mimeType)) {
        return (
            <div className="relative">
                <div className="w-14 h-2.5 bg-amber-400 rounded-t-md ml-1" />
                <div className="w-16 h-11 bg-amber-400 rounded-b-md rounded-tr-md flex items-center justify-center shadow-md">
                    <div className="w-8 h-6 bg-amber-300 rounded opacity-50" />
                </div>
            </div>
        );
    }
    if (thumbnailLink) {
        return (
            <img
                src={thumbnailLink}
                alt=""
                className="w-16 h-12 object-cover rounded-lg shadow-sm"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
        );
    }
    if (mimeType.startsWith('image/')) return <Image className="w-10 h-10 text-blue-400" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="w-10 h-10 text-purple-400" />;
    if (mimeType.includes('pdf')) return <FileText className="w-10 h-10 text-red-400" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
        return <FileSpreadsheet className="w-10 h-10 text-green-400" />;
    return <File className="w-10 h-10 text-slate-400" />;
}

// ─── File Viewer Modal ────────────────────────────────────────────────────────
function FileViewer({ item, onClose }: { item: DriveItem; onClose: () => void }) {
    const [maximized, setMaximized] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${maximized
                        ? 'fixed inset-2'
                        : 'w-full max-w-5xl'
                    }`}
                style={maximized ? {} : { height: '85vh' }}
            >
                {/* Modal Header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                    <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-white text-sm truncate flex-1">
                        {item.name}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                            href={item.webViewLink || `https://drive.google.com/open?id=${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                            title="Abrir no Google Drive"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                            onClick={() => setMaximized(m => !m)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                            title={maximized ? 'Restaurar' : 'Maximizar'}
                        >
                            {maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Fechar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Viewer */}
                <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 min-h-0">
                    {/* Loading overlay */}
                    {!iframeLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-slate-100 dark:bg-slate-950">
                            <Loader2 className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Carregando arquivo...</p>
                        </div>
                    )}
                    <iframe
                        src={getDrivePreviewUrl(item.id)}
                        className="w-full h-full border-0"
                        title={item.name}
                        allow="autoplay"
                        onLoad={() => setIframeLoaded(true)}
                        style={{ display: 'block' }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function Catalogs() {
    const [currentFolderId, setCurrentFolderId] = useState(ROOT_FOLDER_ID);
    const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
        { id: ROOT_FOLDER_ID, name: 'Catálogos' },
    ]);
    const [items, setItems] = useState<DriveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noApiKey, setNoApiKey] = useState(false);
    const [viewingFile, setViewingFile] = useState<DriveItem | null>(null);

    const loadFolder = useCallback(async (folderId: string) => {
        setLoading(true);
        setError(null);
        setNoApiKey(false);
        try {
            const data = await fetchFolderContents(folderId);
            setItems(data);
        } catch (err: any) {
            if (err.message === 'NO_API_KEY') setNoApiKey(true);
            else setError(err.message || 'Erro ao carregar conteúdo.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFolder(currentFolderId);
    }, [currentFolderId, loadFolder]);

    const navigateInto = (folder: DriveItem) => {
        setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
        setCurrentFolderId(folder.id);
    };

    const navigateTo = (index: number) => {
        const crumb = breadcrumb[index];
        setBreadcrumb(prev => prev.slice(0, index + 1));
        setCurrentFolderId(crumb.id);
    };

    const handleClick = (item: DriveItem) => {
        if (isFolder(item.mimeType)) {
            navigateInto(item);
        } else if (isViewableInApp(item.mimeType)) {
            setViewingFile(item);
        } else {
            // Non-previewable files (zip, etc.) open externally
            window.open(
                item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
                '_blank',
                'noopener,noreferrer'
            );
        }
    };

    const isAtRoot = breadcrumb.length <= 1;

    return (
        <>
            {/* ── File Viewer Modal ── */}
            {viewingFile && (
                <FileViewer item={viewingFile} onClose={() => setViewingFile(null)} />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ── Page Header ── */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            Catálogos
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Visualize e navegue pelos catálogos de produtos diretamente aqui.
                        </p>
                    </div>
                    <a
                        href={`https://drive.google.com/drive/folders/${currentFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Abrir no Drive
                    </a>
                </div>

                {/* ── Explorer Card ── */}
                <div
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
                    style={{ minHeight: '520px' }}
                >
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                        <button
                            onClick={() => !isAtRoot && navigateTo(breadcrumb.length - 2)}
                            disabled={isAtRoot}
                            title="Voltar"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                            onClick={() => navigateTo(0)}
                            disabled={isAtRoot}
                            title="Início"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <Home className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                            onClick={() => loadFolder(currentFolderId)}
                            title="Atualizar"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>

                        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1 flex-shrink-0" />

                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-1 flex-wrap text-sm overflow-x-auto min-w-0">
                            {breadcrumb.map((crumb, idx) => (
                                <div key={`${crumb.id}-${idx}`} className="flex items-center gap-1 shrink-0">
                                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                                    <button
                                        onClick={() => navigateTo(idx)}
                                        className={`px-2 py-0.5 rounded-md transition-colors truncate max-w-[160px] ${idx === breadcrumb.length - 1
                                                ? 'text-brand-600 dark:text-brand-400 font-semibold cursor-default'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        title={crumb.name}
                                    >
                                        {crumb.name}
                                    </button>
                                </div>
                            ))}
                        </nav>

                        {!loading && !error && !noApiKey && (
                            <span className="ml-auto flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-auto">
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                                <Loader2 className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin" />
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Carregando...</p>
                            </div>
                        )}

                        {!loading && noApiKey && (
                            <div className="flex flex-col items-center h-full gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>Configure <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">VITE_GDRIVE_API_KEY</code> no <code>.env</code> para navegação completa.</span>
                                </div>
                                <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ minHeight: '400px' }}>
                                    <iframe
                                        src={`https://drive.google.com/embeddedfolderview?id=${currentFolderId}#grid`}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0, minHeight: '400px' }}
                                        title="Catálogos"
                                    />
                                </div>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                                <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl text-center max-w-md border border-red-100 dark:border-red-800">
                                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                    <p className="text-red-700 dark:text-red-400 font-medium">Não foi possível carregar</p>
                                    <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
                                    <button
                                        onClick={() => loadFolder(currentFolderId)}
                                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                    >
                                        Tentar novamente
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && !error && !noApiKey && items.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                                <Folder className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                                <p className="text-slate-500 dark:text-slate-400">Esta pasta está vazia</p>
                            </div>
                        )}

                        {!loading && !error && !noApiKey && items.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {items.map((item) => {
                                    const folder = isFolder(item.mimeType);
                                    const viewable = isViewableInApp(item.mimeType);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleClick(item)}
                                            className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 active:scale-95 transition-all duration-150 text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <div className="transition-transform duration-150 group-hover:scale-105 group-hover:-translate-y-0.5">
                                                <DriveIcon mimeType={item.mimeType} thumbnailLink={item.thumbnailLink} />
                                            </div>
                                            <span className="text-xs text-slate-700 dark:text-slate-300 leading-tight line-clamp-2 break-words w-full">
                                                {item.name}
                                            </span>
                                            {!folder && (
                                                <span className={`text-[10px] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${viewable
                                                        ? 'text-brand-500 dark:text-brand-400'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                    }`}>
                                                    {viewable
                                                        ? <><FileText className="w-2.5 h-2.5" /> Visualizar</>
                                                        : <><ExternalLink className="w-2.5 h-2.5" /> Abrir</>
                                                    }
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
