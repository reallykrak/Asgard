// function/captchaGenerator.js

const { createCanvas } = require('@napi-rs/canvas');

// Zorluk seviyelerine göre ayarlar
const difficultySettings = {
    easy: {
        noiseLines: 5,
        noiseDots: 50,
        maxRotation: 0.1, // radyan
        yJitter: 5,     // piksel
        charSpacing: 1,
    },
    normal: {
        noiseLines: 15,
        noiseDots: 200,
        maxRotation: 0.3,
        yJitter: 15,
        charSpacing: 0.9,
    },
    medium: {
        noiseLines: 18,
        noiseDots: 250,
        maxRotation: 0.4,
        yJitter: 20,
        charSpacing: 0.85,
    },
    hard: {
        noiseLines: 25,
        noiseDots: 400,
        maxRotation: 0.6,
        yJitter: 25,
        charSpacing: 0.8,
    }
};

function generateRandomText(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // O, o, 0, I, i, 1 gibi karışabilecek karakterler çıkarıldı
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

    // Rastgele gürültü çizgileri (arka plan)
    for (let i = 0; i < settings.noiseLines; i++) {
        ctx.strokeStyle = `rgba(${Math.random()*150},${Math.random()*150},${Math.random()*150},0.2)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.setTransform(1, Math.random() * 0.1, 0, 1, 0, 0); // Hafif eğim
        ctx.stroke();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Transformu sıfırla
    }
    
    // Captcha Metni
    const captchaText = generateRandomText(6);
    // ----- DEĞİŞİKLİK BURADA YAPILDI -----
    // "DejaVu Sans" yerine genel bir "sans-serif" fontu kullanılıyor.
    ctx.font = 'bold 65px sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
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
        
        ctx.fillStyle = `rgb(${Math.random()*80},${Math.random()*80},${Math.random()*80})`;
        ctx.fillText(char, 0, 0);
        
        ctx.restore();
    }

    // Rastgele gürültü noktaları (ön plan)
    for (let i = 0; i < settings.noiseDots; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`;
        ctx.fillRect(x, y, 2, 2);
    }
    
    const imageBuffer = await canvas.toBuffer('image/png');

    return { captchaText, imageBuffer };
}

module.exports = { generateCaptcha };
         
