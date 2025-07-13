const { Client, EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "seviye-sil",
  description: "Bir kullanıcının seviyesini ve XP'sini sıfırlar.",
  type: 1,
  options: [
    { name: "kullanıcı", description: "Seviyesi sıfırlanacak kullanıcı", type: ApplicationCommandOptionType.User, required: true },
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!", ephemeral: true });
    }

    const kullanıcı = interaction.options.getUser("kullanıcı");
    const guildId = interaction.guild.id;

    if (kullanıcı.bot) {
      return interaction.reply({ content: `❌ | Botlar için seviye komutları kullanılamaz!`, ephemeral: true });
    }
    
    const currentLevel = db.get(`level_${kullanıcı.id}_${guildId}`) || 1;
    if (currentLevel === 1 && !db.has(`xp_${kullanıcı.id}_${guildId}`)) {
      return interaction.reply({ content: `❌ | **${kullanıcı.tag}** kullanıcısının zaten verisi sıfırlanmış!`, ephemeral: true });
    }

    db.set(`level_${kullanıcı.id}_${guildId}`, 1);
    db.delete(`xp_${kullanıcı.id}_${guildId}`);
    
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ Seviye Sıfırlandı!")
      .setDescription(`**Kullanıcı:** ${kullanıcı}\n**Eski Seviye:** ${currentLevel}\n**Yeni Seviye:** 1\n**XP:** 0\n**Ayarlayan:** ${interaction.user}`)
      .setThumbnail(kullanıcı.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: client.config.footer || "Seviye Sistemi" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};