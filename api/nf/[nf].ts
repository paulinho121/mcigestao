export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
    const url = new URL(req.url);
    // Extrai o número da NF do path: /api/nf/562011
    const nf = url.pathname.split('/').pop() || '';

    const origin = 'https://estoquemci.vercel.app';
    const pageUrl = `${origin}/nf/${nf}`;

    // Tenta ler o index.html da build e injetar as meta tags OG
    let appHtml = '';
    try {
        const indexRes = await fetch(`${origin}/index.html`, {
            headers: { 'Accept': 'text/html' },
        });
        if (indexRes.ok) appHtml = await indexRes.text();
    } catch { /* fallback abaixo */ }

    const ogTags = `
    <meta property="og:site_name" content="MCI Estoque" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="🚚 Rastreamento NF ${nf} | MCI" />
    <meta property="og:description" content="Acompanhe sua mercadoria em tempo real via JAMEF. Clique para ver o status de entrega da NF ${nf}." />
    <meta property="og:image" content="${origin}/og-tracking.svg" />
    <meta property="og:image:type" content="image/svg+xml" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="🚚 Rastreamento NF ${nf} | MCI" />
    <meta name="twitter:description" content="Acompanhe sua mercadoria em tempo real via JAMEF." />
    <meta name="twitter:image" content="${origin}/og-tracking.svg" />
    `;

    if (appHtml) {
        // Injeta as tags OG no <head> da aplicação React existente
        const html = appHtml.replace('<head>', `<head>${ogTags}`);
        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
            },
        });
    }

    // Fallback: página mínima com OG tags + carregamento da SPA
    const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${ogTags}
    <title>Rastreamento NF ${nf} · MCI</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
        .card{text-align:center;padding:40px;max-width:400px}
        .logo{width:80px;height:80px;border-radius:24px;background:#1d4ed8;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px}
        h1{color:#fff;font-size:20px;font-weight:900;margin-bottom:8px}
        p{color:#64748b;font-size:14px;margin-bottom:24px}
        .nf{color:#38bdf8;font-size:28px;font-weight:900;margin-bottom:4px}
        .spinner{width:40px;height:40px;border:3px solid #1e293b;border-top:3px solid #0ea5e9;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto}
        @keyframes spin{to{transform:rotate(360deg)}}
    </style>
    <script>
        // Carrega a aplicação React para este URL
        window.addEventListener('load', function() {
            // AppRouter vai detectar /nf/${nf} e mostrar o rastreamento
        });
    </script>
</head>
<body>
    <div class="card">
        <div class="logo">🚚</div>
        <div class="nf">NF ${nf}</div>
        <h1>Rastreamento de Mercadoria</h1>
        <p>Carregando informações de entrega...</p>
        <div class="spinner"></div>
    </div>
    <script type="module" src="/index.tsx"></script>
</body>
</html>`;

    return new Response(fallbackHtml, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 's-maxage=3600',
        },
    });
}
