const { Client, EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "xp-sil",
  description: "Bir kullanıcının XP'sini sıfırlar veya azaltır.",
  type: 1,
  options: [
    { name: "kullanıcı", description: "XP'si silinecek/azaltılacak kullanıcı", type: ApplicationCommandOptionType.User, required: true },
    { name: "miktar", description: "Silinecek XP miktarı (Tüm XP'yi silmek için 0 yazın)", type: ApplicationCommandOptionType.Integer, required: true, min_value: 0 },
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!", ephemeral: true });
    }

    const kullanıcı = interaction.options.getUser("kullanıcı");
    const miktar = interaction.options.getInteger("miktar");
    const guildId = interaction.guild.id;

    if (kullanıcı.bot) {
      return interaction.reply({ content: `❌ | Botlar için seviye komutları kullanılamaz!`, ephemeral: true });
    }

    const currentXp = db.get(`xp_${kullanıcı.id}_${guildId}`) || 0;
    if (currentXp === 0 && miktar > 0) {
      return interaction.reply({ content: `❌ | **${kullanıcı.tag}** kullanıcısının zaten 0 XP'si var!`, ephemeral: true });
    }

    let newXp;
    if (miktar === 0) {
      db.delete(`xp_${kullanıcı.id}_${guildId}`);
      newXp = 0;
    } else {
      newXp = Math.max(0, currentXp - miktar);
      db.set(`xp_${kullanıcı.id}_${guildId}`, newXp);
    }
    
    const level = db.get(`level_${kullanıcı.id}_${guildId}`) || 1;
    const requiredXp = level * (client.config.levelXp || 100);

    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ XP Silindi!")
      .setDescription(`**Kullanıcı:** ${kullanıcı}\n**Silinen XP:** ${miktar === 0 ? "Tüm XP" : miktar}\n**Yeni XP:** ${newXp}/${requiredXp}\n**Seviye:** ${level}\n**Ayarlayan:** ${interaction.user}`)
      .setThumbnail(kullanıcı.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: client.config.footer || "Seviye Sistemi" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};