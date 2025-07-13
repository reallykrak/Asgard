const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
const db = require("croxydb");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");

// --- Font Yükleme ---
const fontPath = path.join(__dirname, "../../fonts");
const fontsToLoad = [
  { file: "Orbitron-Bold.ttf", family: "Orbitron" },
  { file: "Poppins-Bold.ttf", family: "Poppins" },
  { file: "Inter-Regular.ttf", family: "Inter" },
];

fontsToLoad.forEach(({ file, family }) => {
  const fullPath = path.join(fontPath, file);
  try {
    if (fs.existsSync(fullPath)) {
      GlobalFonts.registerFromPath(fullPath, family);
    } else {
      console.error(`Yazı tipi dosyası bulunamadı: ${fullPath}`);
    }
  } catch (error) {
    console.error(`Yazı tipi yüklenirken hata oluştu: ${family} (${fullPath})`, error);
  }
});

// Ses kanalı XP aralıklarını tutmak için bir Map
const voiceXpIntervals = new Map();

module.exports = {
  name: "level",
  description: "Seviye bilgilerinizi şık bir kartla gösterir.",
  type: ApplicationCommandType.ChatInput,
  cooldown: 5,
  options: [
    {
      name: "user",
      description: "Seviyesini görmek istediğiniz kullanıcı.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();

    const user = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guild.id;

    if (user.bot) {
        return interaction.editReply({ content: "🤖 Botların seviyesi yoktur!", ephemeral: true });
    }

    try {
      // Veritabanından verileri al
      const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
      const level = db.get(`level_${user.id}_${guildId}`) || 1;
      const requiredXp = level * (db.get(`xpKatsayisi_${guildId}`) || 100);
      const progress = requiredXp > 0 ? (xp / requiredXp) * 100 : 0;

      const canvas = createCanvas(934, 282);
      const ctx = canvas.getContext("2d");

      // Arka Plan (Mavi Gradyan)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#0d122d");
      gradient.addColorStop(1, "#242f69");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Kullanıcı Adı
      ctx.font = "bold 36px 'Poppins'";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "start";
      ctx.fillText(user.username, 270, 130);

      // Seviye ve XP Bilgisi (Sağ Taraf)
      ctx.textAlign = "end";
      
      ctx.font = "32px 'Poppins'"; 
      ctx.fillStyle = "#F472B6";
      ctx.fillText(`Level: ${level}`, 870, 100);

      ctx.font = "24px 'Inter'";
      ctx.fillStyle = "#B9BBBE";
      ctx.fillText(`XP: ${xp} / ${requiredXp}`, 870, 140);

      // --- XP İlerleme Çubuğu ---
      // Çubuk Arka Planı
      ctx.fillStyle = "#2f3136";
      ctx.fillRect(270, 180, 600, 50);
      
      // Çubuk Dolgusu
      if (progress > 0) {
        const fillWidth = (600 * progress) / 100;
        ctx.fillStyle = "#43b581"; // Yeşil dolgu
        ctx.fillRect(270, 180, fillWidth, 50);
      }
      
      // Çubuk Yüzde Metni
      ctx.font = "bold 25px 'Poppins'";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.floor(progress)}%`, 570, 205);

      // Avatar (Dairesel ve Siyah Çerçeveli)
      ctx.save();
      ctx.beginPath();
      ctx.arc(141, 141, 100, 0, Math.PI * 2, true);
      ctx.closePath();
      // Avatarın dışına siyah bir çizgi ekle
      ctx.strokeStyle = '#000000'; // Siyah renk
      ctx.lineWidth = 8; // **Çizgi kalınlığı 2'den 8'e yükseltildi.**
      ctx.stroke();
      ctx.clip();
      
      const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
      const avatar = await loadImage(avatarUrl);
      ctx.drawImage(avatar, 41, 41, 200, 200);
      ctx.restore();

      const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "level-card.png" });
      await interaction.editReply({ files: [attachment] });

    } catch (error) {
      console.error("Seviye kartı oluşturulurken hata:", error);
      await interaction.editReply({
        content: "Seviye kartı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin!",
        ephemeral: true,
      });
    }
  },
  
  // XP kazanma olayları
  registerEvents: (client) => {
    client.on("messageCreate", async (message) => {
      if (message.author.bot || !message.guild) return;
      const guildId = message.guild.id, userId = message.author.id;
      const levelSystem = db.get(`seviyeSistemi_${guildId}`); // Sistemi etkinleştirme/devre dışı bırakma ayarınız olduğunu varsayarak
      if (!levelSystem) return;
      try {
        const lastXpTime = db.get(`sonXpZamani_${userId}_${guildId}`) || 0;
        if (Date.now() - lastXpTime < 60000) return; // 1 dakika bekleme süresi
        const earnedXp = Math.floor(Math.random() * 15) + 5, currentXp = db.get(`xp_${userId}_${guildId}`) || 0, currentLevel = db.get(`level_${userId}_${guildId}`) || 1, requiredXp = currentLevel * (db.get(`xpKatsayisi_${guildId}`) || 100);
        const newXp = currentXp + earnedXp;
        db.set(`xp_${userId}_${guildId}`, newXp);
        db.set(`sonXpZamani_${userId}_${guildId}`, Date.now());
        if (newXp >= requiredXp) {
          const newLevel = currentLevel + 1;
          db.set(`level_${userId}_${guildId}`, newLevel);
          db.set(`xp_${userId}_${guildId}`, newXp - requiredXp); 
          await message.channel.send({ embeds: [new EmbedBuilder().setColor("Green").setTitle("🎉 Seviye Atladın!").setDescription(`Tebrikler ${message.author}! **${newLevel}**. seviyeye ulaştın.`).setTimestamp()] }).catch(console.error);
        }
      } catch (error) { console.error("Mesaj XP işlenirken hata:", error); }
    });
    client.on("voiceStateUpdate", async (oldState, newState) => {
        if (newState.member.user.bot) return;
        const guildId = newState.guild.id;
        const levelSystem = db.get(`seviyeSistemi_${guildId}`);
        if (!levelSystem) return;
        const userKey = `${newState.member.id}-${guildId}`;
        const isJoining = newState.channelId && newState.channelId !== newState.guild.afkChannelId;
        const isLeaving = !newState.channelId || newState.channelId === newState.guild.afkChannelId;
        if (isJoining && !voiceXpIntervals.has(userKey)) { startVoiceXP(newState.member, guildId); } 
        else if (isLeaving && voiceXpIntervals.has(userKey)) { stopVoiceXP(newState.member, guildId); }
    });
    function startVoiceXP(member, guildId) {
        const userKey = `${member.id}-${guildId}`;
        if (voiceXpIntervals.has(userKey)) return;
        const interval = setInterval(() => {
          if (!member.voice.channel || member.voice.channel.id === member.guild.afkChannelId) { stopVoiceXP(member, guildId); return; }
          try {
            const userId = member.id, currentXp = db.get(`xp_${userId}_${guildId}`) || 0, currentLevel = db.get(`level_${userId}_${guildId}`) || 1, requiredXp = currentLevel * (db.get(`xpKatsayisi_${guildId}`) || 100), earnedXp = Math.floor(Math.random() * 10) + 10;
            const newXp = currentXp + earnedXp;
            db.set(`xp_${userId}_${guildId}`, newXp);
            if (newXp >= requiredXp) {
              const newLevel = currentLevel + 1;
              db.set(`level_${userId}_${guildId}`, newLevel);
              db.set(`xp_${userId}_${guildId}`, newXp - requiredXp);
              member.send({ embeds: [new EmbedBuilder().setColor("Green").setTitle("🎉 Seviye Atladın!").setDescription(`**${member.guild.name}** sunucusunda ses kanalında bulunarak **${newLevel}**. seviyeye ulaştın!`).setTimestamp()]}).catch(() => {});
            }
          } catch (error) { console.error("Ses XP işlenirken hata:", error); }
        }, 60000); // Her 60 saniyede bir
        voiceXpIntervals.set(userKey, interval);
      }
      function stopVoiceXP(member, guildId) {
        const userKey = `${member.id}-${guildId}`;
        if (voiceXpIntervals.has(userKey)) {
          clearInterval(voiceXpIntervals.get(userKey));
          voiceXpIntervals.delete(userKey);
        }
      }
  }
};