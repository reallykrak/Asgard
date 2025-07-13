// events/members/guildMemberAdd.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const db = require("croxydb");
const { generateCaptcha } = require("../../function/captchaGenerator"); // Captcha fonksiyonunu import ediyoruz
const moment = require("moment"); // Zaman işlemleri için

module.exports = {
  name: "guildMemberAdd",
  once: false,
  async execute(client, member) {
    const guildId = member.guild.id;
    // Her iki sistemin ayarlarını da veritabanından çekelim
    const captchaSystem = db.get(`captchaSystem_${guildId}`);
    const registerSystem = db.get(`registerSystem_${guildId}`);

    // ÖNCELİK 1: Captcha Sistemi Kontrolü
    if (captchaSystem) {
        const { channelId, unregisteredRoleId } = captchaSystem;

        const channel = await member.guild.channels.fetch(channelId).catch(() => null);
        const unregisteredRole = await member.guild.roles.fetch(unregisteredRoleId).catch(() => null);

        if (!channel || !unregisteredRole) {
            console.error(`[Captcha System] Hata: Kanal veya kayıtsız rolü bulunamadı. Sistem sıfırlanıyor: ${guildId}`);
            db.delete(`captchaSystem_${guildId}`); // Hata durumunda ayarları temizle
            return;
        }

        try {
            await member.roles.add(unregisteredRole);
            
            const { captchaText, imageBuffer } = await generateCaptcha();

            // Üyenin captcha kodunu veritabanına kaydet
            db.set(`captchaCode_${guildId}_${member.id}`, captchaText);

            // Hesap Güvenliği Kontrolü
            const accountCreationDate = moment(member.user.createdAt);
            const accountAge = moment().diff(accountCreationDate, 'days');
            const securityStatus = accountAge < 15 ? "Şüpheli ❓" : "Güvenli ✅";
            
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(`Hoş Geldin, ${member.user.username}!`)
                .setDescription(
                    `Sunucumuza erişmek için lütfen aşağıdaki resimde görünen karakterleri girerek kendini doğrula.\n\n` +
                    `**Hesap Güvenlik Durumu:** ${securityStatus}\n` +
                    `*(Hesap Oluşturma Tarihi: <t:${Math.floor(accountCreationDate.valueOf() / 1000)}:F>)*`
                )
                .setImage('attachment://captcha.png')
                .setFooter({ text: "Doğrulama için butona tıkla."});

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`captcha_verify_${member.id}`)
                        .setLabel("Doğrula")
                        .setStyle(ButtonStyle.Primary)
                );

            await channel.send({
                content: `Hey ${member}!`,
                embeds: [embed],
                files: [attachment],
                components: [row]
            });
            
        } catch (error) {
            console.error("Captcha gönderilirken veya rol verilirken hata oluştu:", error);
        }

    // ÖNCELİK 2: Kayıt Sistemi Kontrolü (Captcha yoksa çalışır)
    } else if (registerSystem) {
      const { channelId, unregisteredRoleId, staffRoleId } = registerSystem;
      
      const welcomeChannel = await member.guild.channels.fetch(channelId).catch(() => null);
      const unregisteredRole = await member.guild.roles.fetch(unregisteredRoleId).catch(() => null);
      const staffRole = await member.guild.roles.fetch(staffRoleId).catch(() => null);

      if (unregisteredRole) {
        await member.roles.add(unregisteredRole).catch(console.error);
      } else {
        db.delete(`registerSystem_${guildId}`);
      }

      if (welcomeChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor("#5865F2")
          .setAuthor({ name: `Welcome to the server, ${member.user.username}!`, iconURL: member.user.displayAvatarURL() })
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`We're happy to have you! To get full access to the server, please complete your registration using the buttons below.\n\nWith you, we are now **${member.guild.memberCount}** members!`)
          .addFields(
            { name: "Account Created", value: `<t:${Math.floor(member.user.createdAt / 1000)}:R>`, inline: true },
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "How to Register?", value: "Choose one of the buttons below to complete your registration. Our staff is here to help!", inline: false}
          )
          .setFooter({ text: "Registration System" })
          .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`normal_register_${member.id}`)
                    .setLabel("Normal Register")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("👤"), 
                new ButtonBuilder()
                    .setCustomId(`manual_register_${member.id}`)
                    .setLabel("Manual Register")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("✍️"),
                new ButtonBuilder()
                    .setCustomId(`ai_register_${member.id}`)
                    .setLabel("AI Register")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("🤖")
            );
            
        const staffMention = staffRole ? `Hey ${staffRole}!` : "Hey Staff!";

        await welcomeChannel.send({ content: `${staffMention} - Welcome to the server, ${member}!`, embeds: [welcomeEmbed], components: [row] }).catch(console.error);

      } else {
        db.delete(`registerSystem_${guildId}`);
      }
    }
  },
};
              
