const { Client, EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "seviye-ekle",
  description: "Bir kullanıcının seviyesine belirtilen miktarda ekleme yapar.",
  type: 1,
  options: [
    { name: "kullanıcı", description: "Seviye eklenecek kullanıcı", type: ApplicationCommandOptionType.User, required: true },
    { name: "miktar", description: "Eklenecek seviye miktarı", type: ApplicationCommandOptionType.Integer, required: true, min_value: 1 },
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

    const currentLevel = db.get(`level_${kullanıcı.id}_${guildId}`) || 1;
    const newLevel = currentLevel + miktar;
    db.set(`level_${kullanıcı.id}_${guildId}`, newLevel);

    const embed = new EmbedBuilder()
      .setColor(client.config.embedColor || "#00FF00")
      .setTitle("📈 Seviye Eklendi!")
      .setDescription(`**Kullanıcı:** ${kullanıcı}\n**Eklendi:** ${miktar} seviye\n**Yeni Seviye:** ${newLevel}\n**Ayarlayan:** ${interaction.user}`)
      .setThumbnail(kullanıcı.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: client.config.footer || "Seviye Sistemi" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};