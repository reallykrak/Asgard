const { createCanvas } = require('@napi-rs/canvas'); // registerFont yok!
const path = require('path');

// Zorluk ayarları
const difficultySettings = {
    easy: { noiseLines: 5, noiseDots: 30, maxRotation: 0.1, yJitter: 5, charSpacing: 1, foregroundLines: 1 },
    normal: { noiseLines: 10, noiseDots: 100, maxRotation: 0.2, yJitter: 10, charSpacing: 0.9, foregroundLines: 2 },
    medium: { noiseLines: 15, noiseDots: 200, maxRotation: 0.3, yJitter: 15, charSpacing: 0.85, foregroundLines: 3 },
    hard: { noiseLines: 20, noiseDots: 300, maxRotation: 0.5, yJitter: 20, charSpacing: 0.8, foregroundLines: 5 }
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

    // Arka plan
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    // Arka plan noktaları
    for (let i = 0; i < settings.noiseDots; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Arka plan çizgileri
    for (let i = 0; i < settings.noiseLines; i++) {
        ctx.strokeStyle = `rgba(50,50,50,0.05)`;
        ctx.lineWidth = Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }

    // Captcha metni
    const captchaText = generateRandomText(6);
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const spacing = (width / captchaText.length) * settings.charSpacing;
    const startX = (width - (spacing * (captchaText.length - 1))) / 2;

    for (let i = 0; i < captchaText.length; i++) {
        const char = captchaText[i];
        const x = startX + i * spacing;
        const y = height / 2 + (Math.random() - 0.5) * settings.yJitter;
        const angle = (Math.random() - 0.5) * settings.maxRotation;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = `rgb(${50 + Math.random()*100},${50 + Math.random()*100},${50 + Math.random()*100})`;
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }

    // ÖN plan çizgileri (harflerin ÜZERİNDE)
    for (let i = 0; i < settings.foregroundLines; i++) {
        ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`;
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }

    const imageBuffer = await canvas.toBuffer('image/png');

    return { captchaText, imageBuffer };
}

module.exports = { generateCaptcha };
