const { Client, EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "xp-ekle",
  description: "Bir kullanıcının XP'sine belirtilen miktarda ekleme yapar.",
  type: 1,
  options: [
    { name: "kullanıcı", description: "XP eklenecek kullanıcı", type: ApplicationCommandOptionType.User, required: true },
    { name: "miktar", description: "Eklenecek XP miktarı", type: ApplicationCommandOptionType.Integer, required: true, min_value: 1 },
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
    const newXp = currentXp + miktar;
    db.set(`xp_${kullanıcı.id}_${guildId}`, newXp);
    
    const level = db.get(`level_${kullanıcı.id}_${guildId}`) || 1;
    const requiredXpForLevelUp = level * (client.config.levelXp || 100);

    if (newXp >= requiredXpForLevelUp) {
        const newLevel = Math.floor(newXp / requiredXpForLevelUp) + level;
        db.set(`level_${kullanıcı.id}_${guildId}`, newLevel);
        db.set(`xp_${kullanıcı.id}_${guildId}`, newXp % requiredXpForLevelUp);
    }
    
    const finalLevel = db.get(`level_${kullanıcı.id}_${guildId}`) || 1;
    const finalXp = db.get(`xp_${kullanıcı.id}_${guildId}`) || 0;
    const requiredXp = finalLevel * (client.config.levelXp || 100);
    
    const embed = new EmbedBuilder()
      .setColor(client.config.embedColor || "#00FF00")
      .setTitle("⭐ XP Eklendi!")
      .setDescription(`**Kullanıcı:** ${kullanıcı}\n**Eklendi:** ${miktar} XP\n**Yeni XP:** ${finalXp}/${requiredXp}\n**Seviye:** ${finalLevel}\n**Ayarlayan:** ${interaction.user}`)
      .setThumbnail(kullanıcı.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: client.config.footer || "Seviye Sistemi" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};