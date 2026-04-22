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
    const imgW = 900;
    const imgH = 900;
    const imgX = (1080 - imgW) / 2;
    const imgY = 280;

    // Draw image container background (ALWAYS DRAW)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';
    ctx.shadowBlur = 60;
    roundRect(imgX, imgY, imgW, imgH, 40);
    ctx.fill();
    ctx.restore();

    // Attempt to load product image with fallback
    let productImage = await loadImage(product.image_url || '');
    
    // Fallback image if main one fails
    if (!productImage) {
        console.warn(`[StoryGen] Failed to load image for ${product.id}, using fallback.`);
        productImage = await loadImage('https://images.unsplash.com/photo-1553413077-190dd305871c?w=1000&auto=format&fit=crop&q=80');
    }

    if (productImage) {
        // Clip and Draw Product
        ctx.save();
        roundRect(imgX, imgY, imgW, imgH, 40);
        ctx.clip();
        
        const ratio = Math.min(imgW / productImage.width, imgH / productImage.height);
        const w = productImage.width * ratio;
        const h = productImage.height * ratio;
        ctx.drawImage(productImage, imgX + (imgW - w) / 2, imgY + (imgH - h) / 2, w, h);
        ctx.restore();
    } else {
        // If even fallback fails, draw a placeholder icon
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 200px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📦', 540, imgY + imgH / 2 + 60);
    }

    // --- Floating Tags (Matches Screenshot Aesthetic) ---
    // These should ALWAYS be drawn on top of the box
    const isOutOfStock = product.total === 0;
    
    // Status Tag
    const statusText = product.is_future ? 'EM BREVE' : (isOutOfStock ? 'ESGOTADO' : 'DISPONÍVEL');
    ctx.save();
    ctx.fillStyle = product.is_future ? '#6366f1' : (isOutOfStock ? '#ef4444' : '#10b981'); // indigo-500 : red-500 : emerald-500
    roundRect(imgX + 30, imgY + 30, 240, 64, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, imgX + 150, imgY + 72);
    ctx.restore();

    // COD Tag
    ctx.save();
    ctx.fillStyle = '#1e293b'; // slate-800
    roundRect(imgX + 30, imgY + 110, 210, 56, 16);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`COD: ${product.id}`, imgX + 135, imgY + 146);
    ctx.restore();

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

    // --- Availability / CTA Section (Replaced Grid with Promotional Message) ---
    const messageY = lastY + 180;
    
    // Background glow/gradient for the message area
    const msgGradient = ctx.createRadialGradient(540, messageY, 0, 540, messageY, 600);
    msgGradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    msgGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = msgGradient;
    ctx.fillRect(0, messageY - 200, 1080, 500);

    ctx.textAlign = 'center';
    
    // Large Status Highlight
    if (product.is_future) {
        ctx.fillStyle = '#6366f1'; // indigo-500
        ctx.font = '900 90px Inter, sans-serif';
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        ctx.shadowBlur = 40;
        ctx.fillText('LOGO MAIS EM', 540, messageY - 80);
        ctx.fillText('NOSSO ESTOQUE', 540, messageY + 40);
    } else {
        ctx.fillStyle = '#10b981'; // emerald-500
        ctx.font = '900 130px Inter, sans-serif';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 40;
        ctx.fillText('DISPONÍVEL', 540, messageY);
    }
    ctx.shadowBlur = 0; // Reset shadow

    // Strong Commercial Phrase
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 48px Inter, sans-serif';
    const commercialPhrase = "QUALIDADE, AGILIDADE E O MELHOR SUPORTE PARA SUA PRODUÇÃO.";
    
    // Using the wrapText with center alignment adjustment
    const words = commercialPhrase.split(' ');
    let line = '';
    let currentY = messageY + 110;
    const maxWidth = 900;
    const lineHeight = 65;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), 540, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), 540, currentY);

    // --- Footer CTA ---
    const footerGradient = ctx.createLinearGradient(0, 1750, 0, 1920);
    footerGradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
    footerGradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
    ctx.fillStyle = footerGradient;
    ctx.fillRect(0, 1700, 1080, 220);

    ctx.textAlign = 'center';
    ctx.fillStyle = product.is_future ? '#6366f1' : '#10b981';
    ctx.font = '900 42px Inter, sans-serif';
    ctx.fillText(product.is_future ? '👀 FIQUE DE OLHO NO MCI ESTOQUE' : '🚀 GARANTA JÁ O SEU NO MCI ESTOQUE', 540, 1840);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(new File([blob], `story-mci-${product.id}.png`, { type: 'image/png' }));
            }
        }, 'image/png', 0.95);
    });
};
