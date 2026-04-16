import { Product } from '../types';

export const generateStoryImage = async (product: Product): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // --- Background Layer ---
    // Deep Slate Gradient
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#020617'); // slate-950
    gradient.addColorStop(0.5, '#0f172a'); // slate-900
    gradient.addColorStop(1, '#020617'); // slate-950
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Dynamic Mesh Effect (Subtle emerald lines)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 1080; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 200, 1920);
        ctx.stroke();
    }

    // Helper: Rounded Rect
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    // Helper: Image Loader
    const loadImage = (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    // --- Header Branding ---
    const logo = await loadImage('/logo-mci.png');
    if (logo) {
        const logoW = 360;
        const logoH = (logo.height / logo.width) * logoW;
        ctx.drawImage(logo, (1080 - logoW) / 2, 80, logoW, logoH);
    }

    // --- Product Showcase Image ---
    const productImage = await loadImage(product.image_url || '');
    if (productImage) {
        // Draw image container background
        ctx.fillStyle = '#ffffff';
        const imgW = 900;
        const imgH = 900;
        const imgX = (1080 - imgW) / 2;
        const imgY = 280;
        
        ctx.save();
        ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';
        ctx.shadowBlur = 60;
        roundRect(imgX, imgY, imgW, imgH, 40);
        ctx.fill();
        ctx.restore();

        // Clip and Draw Product
        ctx.save();
        roundRect(imgX, imgY, imgW, imgH, 40);
        ctx.clip();
        
        // Dark overlay on image for contrast if needed, but usually images are white background
        const ratio = Math.min(imgW / productImage.width, imgH / productImage.height);
        const w = productImage.width * ratio;
        const h = productImage.height * ratio;
        ctx.drawImage(productImage, imgX + (imgW - w) / 2, imgY + (imgH - h) / 2, w, h);
        ctx.restore();

        // --- Floating Tags (Matches Screenshot Aesthetic) ---
        const isOutOfStock = product.total === 0;
        
        // Status Tag
        ctx.fillStyle = isOutOfStock ? '#ef4444' : '#10b981'; // red-500 : emerald-500
        roundRect(imgX + 30, imgY + 30, 240, 64, 16);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isOutOfStock ? 'ESGOTADO' : 'DISPONÍVEL', imgX + 150, imgY + 72);

        // COD Tag
        ctx.fillStyle = '#1e293b'; // slate-800
        roundRect(imgX + 30, imgY + 110, 210, 56, 16);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1'; // slate-300
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(`COD: ${product.id}`, imgX + 135, imgY + 146);

        // Price Tag REMOVED per user request
    }

    // --- Product Title Section ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    
    // Dynamic Font Size for Title based on length
    const fontSize = product.name.length > 50 ? 54 : 68;
    ctx.font = `900 ${fontSize}px Inter, sans-serif`;
    
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        let lineCount = 0;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                if (lineCount < 4) { // Limit to 5 lines
                    ctx.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                    lineCount++;
                } else {
                    line = line.trim() + '...';
                    break;
                }
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY;
    };

    const titleY = 1240;
    const lastY = wrapText(product.name.toUpperCase(), 90, titleY, 900, fontSize + 10);

    // --- Availability Cards (Grid Style) ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    roundRect(90, lastY + 60, 900, 320, 40);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // Total Badge
    ctx.fillStyle = '#10b981';
    roundRect(140, lastY + 110, 60, 60, 15);
    ctx.fill();
    // (Simple box icon drawing)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(155, lastY + 125, 30, 30);
    
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '900 28px Inter, sans-serif';
    ctx.fillText('ESTOQUE TOTAL', 220, lastY + 150);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px Inter, sans-serif';
    ctx.fillText(product.total.toString(), 940, lastY + 160);

    // Branch Grid
    const branches = [
        { name: 'CEARÁ', stock: product.stock_ce, color: 'rgba(16, 185, 129, 0.1)', textColor: '#10b981' },
        { name: 'S. CATARINA', stock: product.stock_sc, color: 'rgba(59, 130, 246, 0.1)', textColor: '#3b82f6' },
        { name: 'S. PAULO', stock: product.stock_sp, color: 'rgba(244, 63, 94, 0.1)', textColor: '#f43f5e' }
    ];

    branches.forEach((branch, i) => {
        const x = 140 + (i * 280);
        const y = lastY + 200;
        const w = 240;
        const h = 160;

        ctx.fillStyle = branch.color;
        roundRect(x, y, w, h, 20);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = branch.textColor;
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(branch.name, x + w / 2, y + 50);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 56px Inter, sans-serif';
        ctx.fillText(branch.stock.toString(), x + w / 2, y + 120);
    });

    // --- Footer CTA ---
    const footerGradient = ctx.createLinearGradient(0, 1750, 0, 1920);
    footerGradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
    footerGradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
    ctx.fillStyle = footerGradient;
    ctx.fillRect(0, 1700, 1080, 220);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10b981';
    ctx.font = '900 42px Inter, sans-serif';
    ctx.fillText('🚀 GARANTA JÁ O SEU NO MCI ESTOQUE', 540, 1840);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(new File([blob], `story-mci-${product.id}.png`, { type: 'image/png' }));
            }
        }, 'image/png', 0.95);
    });
};
