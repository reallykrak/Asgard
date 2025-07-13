// function/captchaGenerator.js

const { createCanvas, loadImage } = require('@napi-rs/canvas');

function generateRandomText(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function generateCaptcha(width = 400, height = 150) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    // Rastgele gürültü çizgileri
    for (let i = 0; i < 15; i++) {
        ctx.strokeStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }
    
    // Captcha Metni
    const captchaText = generateRandomText(6);
    ctx.font = 'bold 70px Sans';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Harfleri biraz döndürerek ve farklı konumlara yerleştirerek yaz
    const spacing = width / (captchaText.length + 1);
    for (let i = 0; i < captchaText.length; i++) {
        const char = captchaText[i];
        ctx.save();
        const x = spacing * (i + 0.5) + (Math.random() - 0.5) * 10;
        const y = height / 2 + (Math.random() - 0.5) * 20;
        const angle = (Math.random() - 0.5) * 0.4; // radyan cinsinden açı
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }

    // Rastgele gürültü noktaları
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`;
        ctx.fillRect(x, y, 2, 2);
    }
    
    const imageBuffer = await canvas.toBuffer('image/png');

    return { captchaText, imageBuffer };
}

module.exports = { generateCaptcha };                
