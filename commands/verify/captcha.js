// commands/verify/captcha.js

const { EmbedBuilder, PermissionsBitField, ChannelType, AttachmentBuilder } = require("discord.js");
const db = require("croxydb");
const { generateCaptcha } = require("../../function/captchaGenerator");

module.exports = {
  name: "captcha",
  description: "Captcha sistemini yönetir.",
  type: 1,
  options: [
    {
      name: "ayarla",
      description: "Captcha sistemini ayarlar.",
      type: 1,
      options: [
        { name: "kanal", description: "Captcha mesajının gönderileceği kanal.", type: 7, required: true, channel_types: [ChannelType.GuildText], },
        { name: "kayıtlı-rol", description: "Doğrulamayı geçen üyelere verilecek rol.", type: 8, required: true, },
        { name: "kayıtsız-rol", description: "Yeni üyelere verilecek başlangıç rolü.", type: 8, required: true, },
        { name: "log-kanalı", description: "Doğrulama kayıtlarının gönderileceği kanal.", type: 7, required: true, channel_types: [ChannelType.GuildText], },
      ],
    },
    { name: "sıfırla", description: "Captcha sistemini sıfırlar.", type: 1, },
    {
        name: "test",
        description: "Size özel bir test captcha'sı gönderir.",
        type: 1, // Subcommand
        options: [{
            name: "zorluk",
            description: "Test edilecek zorluk seviyesi.",
            type: 3,
            required: true,
            choices: [
                { name: "Kolay (Easy)", value: "easy" },
                { name: "Normal (Normal)", value: "normal" },
                { name: "Orta (Medium)", value: "medium" },
                { name: "Zor (Hard)", value: "hard" }
            ]
        }]
    }
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız!", ephemeral: true, });
    }

    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subCommand === "ayarla") {
        const channel = interaction.options.getChannel("kanal");
        const registeredRole = interaction.options.getRole("kayıtlı-rol");
        const unregisteredRole = interaction.options.getRole("kayıtsız-rol");
        const logChannel = interaction.options.getChannel("log-kanalı");
        db.set(`captchaSystem_${guildId}`, { channelId: channel.id, registeredRoleId: registeredRole.id, unregisteredRoleId: unregisteredRole.id, logChannelId: logChannel.id });
        const embed = new EmbedBuilder().setColor("Green").setTitle("✅ Captcha Sistemi Ayarlandı").setDescription("Captcha sistemi başarıyla ayarlandı!").addFields(
            { name: "Captcha Kanalı", value: `${channel}`, inline: true },
            { name: "Kayıtlı Rolü", value: `${registeredRole}`, inline: true },
            { name: "Kayıtsız Rolü", value: `${unregisteredRole}`, inline: true },
            { name: "Log Kanalı", value: `${logChannel}`, inline: true }
        ).setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subCommand === "sıfırla") {
        if (!db.get(`captchaSystem_${guildId}`)) { return interaction.reply({ content: "❌ | Captcha sistemi zaten ayarlı değil.", ephemeral: true }); }
        db.delete(`captchaSystem_${guildId}`);
        return interaction.reply({ content: "✅ | Captcha sistemi başarıyla sıfırlandı.", ephemeral: true });
    }

    if (subCommand === 'test') {
        const difficulty = interaction.options.getString("zorluk");
        await interaction.deferReply({ ephemeral: true });

        const { captchaText, imageBuffer } = await generateCaptcha(difficulty);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });
        
        console.log(`Test Captcha Kodu (${difficulty}): ${captchaText}`);

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Seviye Test Captcha`)
            .setDescription("Aşağıdaki resim, seçtiğiniz zorluk seviyesinde oluşturulmuştur.")
            .setImage('attachment://captcha.png');

        await interaction.editReply({
            embeds: [embed],
            files: [{ attachment: imageBuffer, name: 'captcha.png' }],
        });
    }
  },
};
         
