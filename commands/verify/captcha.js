// commands/verify/captcha.js

const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const db = require("croxydb");
const { generateCaptcha } = require("../../function/captchaGenerator"); // Captcha oluşturma fonksiyonunu import ediyoruz

module.exports = {
  name: "captcha",
  description: "Captcha sistemini yönetir.",
  type: 1,
  options: [
    {
      name: "ayarla",
      description: "Captcha sistemini ayarlar.",
      type: 1, // Subcommand
      options: [
        {
          name: "kanal",
          description: "Captcha mesajının gönderileceği kanal.",
          type: 7, // Channel
          required: true,
          channel_types: [ChannelType.GuildText],
        },
        {
            name: "kayıtlı-rol",
            description: "Doğrulamayı geçen üyelere verilecek rol.",
            type: 8, // Role
            required: true,
        },
        {
            name: "kayıtsız-rol",
            description: "Yeni üyelere verilecek başlangıç rolü.",
            type: 8, // Role
            required: true,
        },
        {
            name: "log-kanalı",
            description: "Doğrulama kayıtlarının gönderileceği kanal.",
            type: 7, // Channel
            required: true,
            channel_types: [ChannelType.GuildText],
        },
      ],
    },
    {
        name: "sıfırla",
        description: "Captcha sistemini sıfırlar.",
        type: 1, // Subcommand
    },
    {
        name: "test",
        description: "Size özel bir test captcha'sı gönderir.",
        type: 1, // Subcommand
    }
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({
        content: "❌ | Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const subCommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subCommand === "ayarla") {
        const channel = interaction.options.getChannel("kanal");
        const registeredRole = interaction.options.getRole("kayıtlı-rol");
        const unregisteredRole = interaction.options.getRole("kayıtsız-rol");
        const logChannel = interaction.options.getChannel("log-kanalı");

        db.set(`captchaSystem_${guildId}`, {
            channelId: channel.id,
            registeredRoleId: registeredRole.id,
            unregisteredRoleId: unregisteredRole.id,
            logChannelId: logChannel.id
        });

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Captcha Sistemi Ayarlandı")
            .setDescription("Captcha sistemi başarıyla ayarlandı!")
            .addFields(
                { name: "Captcha Kanalı", value: `${channel}`, inline: true },
                { name: "Kayıtlı Rolü", value: `${registeredRole}`, inline: true },
                { name: "Kayıtsız Rolü", value: `${unregisteredRole}`, inline: true },
                { name: "Log Kanalı", value: `${logChannel}`, inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subCommand === "sıfırla") {
        const systemData = db.get(`captchaSystem_${guildId}`);
        if (!systemData) {
            return interaction.reply({ content: "❌ | Captcha sistemi zaten ayarlı değil.", ephemeral: true });
        }

        db.delete(`captchaSystem_${guildId}`);
        return interaction.reply({ content: "✅ | Captcha sistemi başarıyla sıfırlandı.", ephemeral: true });
    }

    if (subCommand === 'test') {
        const systemData = db.get(`captchaSystem_${guildId}`);
        if (!systemData) {
            return interaction.reply({ content: "❌ | Lütfen önce captcha sistemini `/captcha ayarla` komutu ile kurun.", ephemeral: true });
        }

        const { captchaText, imageBuffer } = await generateCaptcha();
        
        // Test amaçlı doğru kodu konsola yazdıralım
        console.log(`Test Captcha Kodu: ${captchaText}`);

        await interaction.reply({
            content: `**Bu bir testtir.** Gerçek sistemde bu kod sadece bot tarafından bilinir.\nDoğrulama Kodu: \`${captchaText}\``,
            files: [{ attachment: imageBuffer, name: 'captcha.png' }],
            ephemeral: true
        });
    }
  },
};
          
