import { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Folder, File, ChevronRight, Home, ArrowLeft,
    ExternalLink, Loader2, Image, FileText, FileVideo,
    FileSpreadsheet, RefreshCw, AlertCircle, X, Maximize2, Minimize2,
    Download
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
    webContentLink?: string;
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
        fields: 'files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,modifiedTime)',
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
function DriveIcon({ mimeType, thumbnailLink, name }: { mimeType: string; thumbnailLink?: string; name?: string }) {
    // Transform thumbnail link to get a higher resolution if possible (Google Drive thumbnail convention)
    const highResThumbnail = thumbnailLink?.replace(/=s\d+(?:-c)?$/, '=s400');

    if (isFolder(mimeType)) {
        return (
            <div className="relative group/folder">
                <div className="w-14 h-3 bg-amber-400 dark:bg-amber-500 rounded-t-lg ml-1" />
                <div className="w-20 h-14 bg-amber-400 dark:bg-amber-500 rounded-b-lg rounded-tr-lg flex items-center justify-center shadow-md border border-amber-300 dark:border-amber-600">
                    <Folder className="w-8 h-8 text-amber-700 dark:text-amber-900 opacity-40" />
                </div>
            </div>
        );
    }

    if (thumbnailLink) {
        return (
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-md transition-all">
                <img
                    src={highResThumbnail || thumbnailLink}
                    alt={name || ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                />
                {/* Overlay for hover depth */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                {/* File Type Badge Overlay */}
                <div className="absolute bottom-1.5 right-1.5 p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                    {mimeType.includes('pdf') ? <FileText className="w-3.5 h-3.5 text-red-500" /> :
                        mimeType.startsWith('image/') ? <Image className="w-3.5 h-3.5 text-blue-500" /> :
                            mimeType.startsWith('video/') ? <FileVideo className="w-3.5 h-3.5 text-purple-500" /> :
                                <File className="w-3.5 h-3.5 text-slate-500" />}
                </div>
            </div>
        );
    }

    // Default Fallback Container
    const iconSize = "w-10 h-10";
    let icon = <File className={`${iconSize} text-slate-400`} />;
    let bgColor = "bg-slate-100 dark:bg-slate-800/50";

    if (mimeType.startsWith('image/')) {
        icon = <Image className={`${iconSize} text-blue-400`} />;
        bgColor = "bg-blue-50 dark:bg-blue-900/20";
    } else if (mimeType.startsWith('video/')) {
        icon = <FileVideo className={`${iconSize} text-purple-400`} />;
        bgColor = "bg-purple-50 dark:bg-purple-900/20";
    } else if (mimeType.includes('pdf')) {
        icon = <FileText className={`${iconSize} text-red-400`} />;
        bgColor = "bg-red-50 dark:bg-red-900/20";
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        icon = <FileSpreadsheet className={`${iconSize} text-green-400`} />;
        bgColor = "bg-green-50 dark:bg-green-900/20";
    }

    return (
        <div className={`w-full aspect-[4/3] rounded-xl ${bgColor} flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700/50 transition-all group-hover:border-slate-300 dark:group-hover:border-slate-600`}>
            {icon}
        </div>
    );
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
                            href={item.webContentLink || `https://drive.google.com/uc?export=download&id=${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                            title="Baixar arquivo"
                        >
                            <Download className="w-4 h-4" />
                        </a>
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
                    {/* Loading overlay with blurred thumbnail notion */}
                    {!iframeLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            {item.thumbnailLink && (
                                <img
                                    src={item.thumbnailLink.replace(/=s\d+(?:-c)?$/, '=s800')}
                                    className="absolute inset-0 w-full h-full object-contain blur-2xl opacity-20 pointer-events-none"
                                    alt=""
                                />
                            )}
                            <div className="relative z-20 flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-brand-600 dark:text-brand-400 animate-spin" />
                                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Preparando pré-visualização...</p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">{item.name}</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        src={getDrivePreviewUrl(item.id)}
                        className="w-full h-full border-0 relative z-0"
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
                                    return (
                                        <div
                                            key={item.id}
                                            className="group relative flex flex-col items-center transition-all duration-300"
                                        >
                                            <button
                                                onClick={() => handleClick(item)}
                                                className="w-full flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-center focus:outline-none"
                                            >
                                                <div className="w-full transform transition-transform duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1">
                                                    <DriveIcon mimeType={item.mimeType} thumbnailLink={item.thumbnailLink} name={item.name} />
                                                </div>
                                                <div className="w-full px-1">
                                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight line-clamp-2 break-words group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                        {item.name}
                                                    </span>
                                                    {!folder && (
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 block opacity-60">
                                                            {item.mimeType.split('/').pop()?.toUpperCase() || 'FILE'}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Quick Action Overlay for Files */}
                                            {!folder && (
                                                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 z-20">
                                                    <a
                                                        href={item.webContentLink || `https://drive.google.com/uc?export=download&id=${item.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-500 transition-all active:scale-90"
                                                        title="Download Direto"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
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
