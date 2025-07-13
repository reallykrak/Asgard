const { Client, EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const db = require("croxydb");

// Bir sonraki seviye için ilerleme çubuğu oluşturan fonksiyon
function createProgressBar(current, total, barSize = 20) {
    const percentage = Math.max(0, Math.min(1, current / total));
    const progress = Math.round(barSize * percentage);
    const emptyProgress = barSize - progress;

    const progressText = '▇'.repeat(progress);
    const emptyProgressText = '—'.repeat(emptyProgress);
    
    // Yüzdeyi hesapla ve metin olarak ekle
    const percentageText = Math.floor(percentage * 100);
    return `\`${progressText}${emptyProgressText}\` **${percentageText}%**`;
}

module.exports = {
  // Komutun adını "seviye" olarak değiştirmek daha mantıklı olabilir, ancak isteğiniz üzerine "seviye-yonetim" kalabilir.
  name: "seviye-yonetim", 
  description: "Kendi seviyenizi veya başka bir kullanıcının seviyesini görüntüler.",
  type: 1,
  options: [
    {
      name: "kullanıcı",
      description: "Seviyesini görmek istediğiniz kullanıcı.",
      type: ApplicationCommandOptionType.User,
      required: false, // Zorunlu değil, belirtilmezse komutu kullananın seviyesini gösterir.
    },
  ],
  run: async (client, interaction) => {
    // Eğer bir kullanıcı etiketlenirse onu, etiketlenmezse komutu kullanan kişiyi hedef al.
    const kullanıcı = interaction.options.getUser("kullanıcı") || interaction.user;
    const guildId = interaction.guild.id;

    // Botların seviyesi olmadığı için kontrol et.
    if (kullanıcı.bot) {
      return interaction.reply({ content: `❌ | Botların seviyesi yoktur!`, ephemeral: true });
    }

    // Veritabanından seviye ve XP bilgilerini çek, yoksa varsayılan değerleri kullan (Seviye 1, XP 0).
    const level = db.get(`level_${kullanıcı.id}_${guildId}`) || 1;
    const xp = db.get(`xp_${kullanıcı.id}_${guildId}`) || 0;

    // config.json dosyasından bir sonraki seviye için gereken XP miktarını al.
    // Eğer ayarlanmamışsa varsayılan olarak 100 kabul et.
    const requiredXp = level * (client.config.levelXp || 100);

    // İlerleme çubuğunu oluştur.
    const progressBar = createProgressBar(xp, requiredXp);

    // Tüm bilgileri içeren bir embed oluştur.
    const embed = new EmbedBuilder()
      .setColor(client.config.embedColor || "#5865F2")
      .setTitle(`📊 Seviye Bilgisi: ${kullanıcı.username}`)
      .setThumbnail(kullanıcı.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "📈 Seviye", value: `**${level}**`, inline: true },
        { name: "⭐ Tecrübe Puanı (XP)", value: `**${xp} / ${requiredXp}**`, inline: true },
        { name: "İlerleme", value: progressBar, inline: false }
      )
      .setFooter({ text: client.config.footer || "Seviye Sistemi" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};