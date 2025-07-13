const {
  ApplicationCommandType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  EmbedBuilder
} = require("discord.js");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");
const db = require("croxydb");

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

module.exports = {
  name: "leaderboard",
  description: "Sunucudaki en yüksek rütbeli kullanıcıları listeler.",
  type: ApplicationCommandType.ChatInput,
  run: async (client, interaction) => {
    await interaction.deferReply();

    const guildId = interaction.guild.id;
    const pageSize = 10;
    let currentPage = 0;

    let allData = db.all() || [];
    if (!Array.isArray(allData)) {
      allData = Object.entries(allData).map(([ID, data]) => ({ ID, data }));
    }

    const levelData = allData
      .filter(entry => entry.ID?.startsWith(`level_`) && entry.ID?.endsWith(`_${guildId}`))
      .map(entry => {
        const userId = entry.ID.split("_")[1];
        return {
          userId: userId,
          level: entry.data,
          xp: db.get(`xp_${userId}_${guildId}`) || 0,
        };
      });

    if (levelData.length === 0) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor("Red").setDescription("📊 Bu sunucuda henüz sıralamaya girmiş kullanıcı yok!")],
        ephemeral: true,
      });
    }

    const sortedData = levelData.sort((a, b) => {
      if (b.level === a.level) return b.xp - a.xp;
      return b.level - a.level;
    });

    // --- Resim Oluşturma Fonksiyonu ---
    const generateLeaderboardImage = async (page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const pageData = sortedData.slice(start, end);
      
      const canvasHeight = 120 + (pageData.length * 75);
      const canvas = createCanvas(800, canvasHeight);
      const ctx = canvas.getContext("2d");

      // Arka Plan (Mavi Gradyan)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#0d122d");
      gradient.addColorStop(1, "#242f69");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Başlık
      ctx.font = "42px 'Orbitron'"; // Yazı tipi değiştirildi
      ctx.fillStyle = "#FFFFFF"; // Daha parlak beyaz renk
      ctx.textAlign = "center";
      ctx.fillText("Leaderboard", canvas.width / 2, 70);

      const startY = 110;
      const entryHeight = 75;

      for (let i = 0; i < pageData.length; i++) {
        const data = pageData[i];
        const positionY = startY + i * entryHeight;
        const rank = start + i + 1;

        try {
          const user = await client.users.fetch(data.userId).catch(() => null);
          if (!user) continue;

          const requiredXp = data.level * (db.get(`xpKatsayisi_${guildId}`) || 100);
          const progress = requiredXp > 0 ? (data.xp / requiredXp) * 100 : 0;
          
          // Satır Arka Planı (Yuvarlak)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.roundRect(20, positionY - 10, 760, 65, 15);
          ctx.fill();

          // Sıra Numarası (Yuvarlak Kutu)
          ctx.fillStyle = getRankColor(rank);
          ctx.beginPath();
          ctx.roundRect(35, positionY, 55, 45, 10);
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 24px 'Poppins'";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`#${rank}`, 62.5, positionY + 22.5);
          
          // Avatar (Dairesel)
          ctx.save();
          ctx.beginPath();
          ctx.arc(130, positionY + 22.5, 22.5, 0, Math.PI * 2);
          ctx.clip();
          const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 64 }));
          ctx.drawImage(avatar, 107.5, positionY, 45, 45);
          ctx.restore();

          // Kullanıcı Bilgisi
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 20px 'Inter'";
          ctx.textAlign = "left";
          ctx.fillText(user.username, 170, positionY + 18);
          
          ctx.fillStyle = "#B9BBBE";
          ctx.font = "16px 'Inter'";
          ctx.fillText(`Level: ${data.level} • XP: ${data.xp}/${requiredXp}`, 170, positionY + 42);

          // XP Çubuğu (Kare/Dikdörtgen)
          ctx.fillStyle = "#2C2F33";
          ctx.fillRect(480, positionY + 20, 250, 15);
          
          if (progress > 0) {
            ctx.fillStyle = "#43b581"; // Yeşil dolgu
            ctx.fillRect(480, positionY + 20, (250 * progress) / 100, 15);
          }

          // Yüzde Metni
          ctx.font = "bold 14px 'Poppins'";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(`${Math.floor(progress)}%`, 740, positionY + 27.5);
          
        } catch (error) {
          console.error(`Kullanıcı #${rank} çizilirken hata: ${error}`);
        }
      }
      
      return canvas.toBuffer('image/png');
    };

    function getRankColor(rank) {
      if (rank === 1) return "#FFD700"; // Altın
      if (rank === 2) return "#C0C0C0"; // Gümüş
      if (rank === 3) return "#CD7F32"; // Bronz
      return "#5865F2"; // Varsayılan
    }

    const generateButtons = (page) => {
      const maxPage = Math.ceil(sortedData.length / pageSize) - 1;
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev_page").setLabel("◀ Önceki").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("next_page").setLabel("Sonraki ▶").setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage)
      );
    };

    try {
      const imageBuffer = await generateLeaderboardImage(currentPage);
      const attachment = new AttachmentBuilder(imageBuffer, { name: "leaderboard.png" });
      const row = generateButtons(currentPage);

      const message = await interaction.editReply({ files: [attachment], components: [row] });

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 120000,
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "prev_page") currentPage--;
        if (i.customId === "next_page") currentPage++;

        const newImageBuffer = await generateLeaderboardImage(currentPage);
        const newAttachment = new AttachmentBuilder(newImageBuffer, { name: "leaderboard.png" });
        const newRow = generateButtons(currentPage);
        await i.editReply({ files: [newAttachment], components: [newRow] });
      });

      collector.on("end", async () => {
        const disabledRow = generateButtons(currentPage);
        disabledRow.components.forEach(c => c.setDisabled(true));
        await message.edit({ components: [disabledRow] }).catch(() => {});
      });

    } catch (error) {
      console.error("Liderlik tablosu resmi oluşturulurken hata:", error);
      await interaction.editReply({ content: "Liderlik tablosu resmi oluşturulurken bir hata oluştu.", ephemeral: true });
    }
  },
};