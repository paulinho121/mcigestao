import { useEffect, useState } from 'react';
import { X, Box, Smartphone, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// <model-viewer> (Google): 3D no navegador e botão de Realidade Aumentada no celular
// (Android: Scene Viewer/WebXR · iPhone: AR Quick Look). Carregado só quando alguém abre o AR.
const ModelViewer: any = 'model-viewer';

interface Props {
    src: string;
    nome: string;
    poster?: string;
    /** Link público da página do produto, para o QR Code abrir no celular (quando se está no computador). */
    linkCompartilhar?: string;
}

export function ModeloAR({ src, nome, poster, linkCompartilhar }: Props) {
    const [pronto, setPronto] = useState(false);
    const [erro, setErro] = useState('');

    useEffect(() => {
        let vivo = true;
        import('@google/model-viewer')
            .then(() => { if (vivo) setPronto(true); })
            .catch(() => { if (vivo) setErro('Não foi possível carregar o visualizador 3D. Atualize a página (Ctrl+F5).'); });
        return () => { vivo = false; };
    }, []);

    const emComputador = typeof navigator !== 'undefined' && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (erro) return <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>;
    if (!pronto) {
        return (
            <div className="flex items-center justify-center gap-2 h-72 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando o 3D...
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ModelViewer
                src={src}
                poster={poster}
                alt={`Modelo 3D de ${nome}`}
                ar=""
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="fixed"
                camera-controls=""
                auto-rotate=""
                shadow-intensity="1"
                touch-action="pan-y"
                style={{ width: '100%', height: '340px', background: 'radial-gradient(circle at 50% 40%, #f1f5f9, #cbd5e1)', borderRadius: '12px' }}
            >
                <button
                    slot="ar-button"
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-lg"
                >
                    <Smartphone className="w-4 h-4" /> Ver no meu ambiente (AR)
                </button>
            </ModelViewer>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Arraste para girar e use dois dedos (ou a roda do mouse) para aproximar. No celular, toque em "Ver no meu ambiente" para posicionar o produto no tamanho real.
            </p>

            {emComputador && linkCompartilhar && (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <QRCodeSVG value={linkCompartilhar} size={84} />
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        <strong>Quer ver em AR?</strong> Aponte a câmera do celular para este QR Code para abrir o produto no seu celular.
                    </p>
                </div>
            )}
        </div>
    );
}

export function ModeloARModal({ src, nome, poster, linkCompartilhar, onClose }: Props & { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 my-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <Box className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-bold text-slate-900 dark:text-white truncate">{nome}</h2>
                    <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5">
                    <ModeloAR src={src} nome={nome} poster={poster} linkCompartilhar={linkCompartilhar} />
                </div>
            </div>
        </div>
    );
}
