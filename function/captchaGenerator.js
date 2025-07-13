// function/captchaGenerator.js

const { createCanvas, registerFont } = require('@napi-rs/canvas');
const path = require('path');

// --- FONT KAYDI ---
// Proje başlangıcında font dosyasını yüklüyoruz.
// Bu sayede botun çalıştığı sistemde fontun yüklü olup olmaması önemini yitirir.
try {
    const fontPath = path.join(__dirname, '..', 'fonts', 'DejaVuSans-Bold.ttf');
    registerFont(fontPath, { family: 'DejaVu Sans Bold' });
} catch (error) {
    console.error("!!!! ÖNEMLİ HATA: Font dosyası yüklenemedi. 'fonts/DejaVuSans-Bold.ttf' dosyasının doğru yerde olduğundan emin olun. !!!!");
    console.error(error);
}


// Zorluk seviyelerine göre ayarlar
const difficultySettings = {
    easy: { noiseLines: 5, noiseDots: 50, maxRotation: 0.1, yJitter: 5, charSpacing: 1, foregroundLines: 2 },
    normal: { noiseLines: 12, noiseDots: 200, maxRotation: 0.3, yJitter: 15, charSpacing: 0.9, foregroundLines: 3 },
    medium: { noiseLines: 15, noiseDots: 250, maxRotation: 0.4, yJitter: 20, charSpacing: 0.85, foregroundLines: 4 },
    hard: { noiseLines: 20, noiseDots: 400, maxRotation: 0.6, yJitter: 25, charSpacing: 0.8, foregroundLines: 5 }
};

function generateRandomText(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function generateCaptcha(difficulty = 'normal', width = 400, height = 150) {
    const settings = difficultySettings[difficulty] || difficultySettings.normal;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Arka Plan
    ctx.fillStyle = '#e9e9e9'; // Hafif gri bir arka plan
    ctx.fillRect(0, 0, width, height);

    // 2. Arka Plan Gürültüsü (Çizgiler ve Noktalar)
    for (let i = 0; i < settings.noiseDots; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
        ctx.fillRect(x, y, 2, 2);
    }
    for (let i = 0; i < settings.noiseLines; i++) {
        ctx.strokeStyle = `rgba(${Math.random()*150},${Math.random()*150},${Math.random()*150},0.2)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }
    
    // 3. Captcha METNİNİ ÇİZME
    // Artık kayıtlı font ailesini kullandığımız için harfler her zaman görünecektir.
    ctx.font = '65px "DejaVu Sans Bold"'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const captchaText = generateRandomText(6);
    const spacing = (width / captchaText.length) * settings.charSpacing;
    const startX = (width - (spacing * (captchaText.length - 1))) / 2;
    
    for (let i = 0; i < captchaText.length; i++) {
        const char = captchaText[i];
        ctx.save();
        const x = startX + i * spacing;
        const y = height / 2 + (Math.random() - 0.5) * settings.yJitter;
        const angle = (Math.random() - 0.5) * settings.maxRotation;
        
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // Her harfe farklı bir koyu renk ata
        ctx.fillStyle = `rgb(${Math.random()*50},${Math.random()*50},${Math.random()*50})`;
        ctx.fillText(char, 0, 0);
        
        ctx.restore();
    }

    // 4. ÖN PLAN GÜRÜLTÜSÜ (Harflerin ÜZERİNE Gelen Çizgiler)
    for (let i = 0; i < settings.foregroundLines; i++) {
        ctx.strokeStyle = `rgba(${Math.random()*120},${Math.random()*120},${Math.random()*120},0.4)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    const imageBuffer = await canvas.toBuffer('image/png');

    return { captchaText, imageBuffer };
}

module.exports = { generateCaptcha };
