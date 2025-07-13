const { Client, EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "seviye-ayarla",
  description: "Bir kullanıcının seviyesini ve XP'sini doğrudan ayarlar.",
  type: 1,
  options: [
    { name: "kullanıcı", description: "Seviyesi ayarlanacak kullanıcı", type: ApplicationCommandOptionType.User, required: true },
    { name: "seviye", description: "Ayarlanacak seviye", type: ApplicationCommandOptionType.Integer, required: true, min_value: 1 },
    { name: "xp", description: "Ayarlanacak XP (isteğe bağlı, varsayılan 0)", type: ApplicationCommandOptionType.Integer, required: false, min_value: 0 },
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!", ephemeral: true });
    }

    const kullanıcı = interaction.options.getUser("kullanıcı");
    const seviye = interaction.options.getInteger("seviye");
    const xp = interaction.options.getInteger("xp") || 0; // Eğer XP belirtilmezse 0 olsun
    const guildId = interaction.guild.id;

    if (kullanıcı.bot) {
      return interaction.reply({ content: `❌ | Botlar için seviye komutları kullanılamaz!`, ephemeral: true });
    }

    db.set(`level_${kullanıcı.id}_${guildId}`, seviye);
    db.set(`xp_${kullanıcı.id}_${guildId}`, xp);
    
    const requiredXp = seviye * (client.config.levelXp || 100);

    const embed = new EmbedBuilder()
      .setColor(client.config.embedColor || "#00FF00")
      .setTitle("⚙️ Seviye Ayarlandı!")
      .setDescription(`**Kullanıcı:** ${kullanıcı}\n**Yeni Seviye:** ${seviye}\n**Yeni XP:** ${xp}/${requiredXp}\n**Ayarlayan:** ${interaction.user}`)
      .setThumbnail(kullanıcı.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: client.config.footer || "Seviye Sistemi" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};