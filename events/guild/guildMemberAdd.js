// events/members/guildMemberAdd.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const db = require("croxydb");
const { generateCaptcha } = require("../../function/captchaGenerator");
const moment = require("moment");

module.exports = {
  name: "guildMemberAdd",
  once: false,
  async execute(client, member) {
    const guildId = member.guild.id;
    const captchaSystem = db.get(`captchaSystem_${guildId}`);
    const registerSystem = db.get(`registerSystem_${guildId}`);

    if (captchaSystem) {
        const { channelId, unregisteredRoleId } = captchaSystem;

        const channel = await member.guild.channels.fetch(channelId).catch(() => null);
        const unregisteredRole = await member.guild.roles.fetch(unregisteredRoleId).catch(() => null);

        if (!channel || !unregisteredRole) {
            console.error(`[Captcha System] Hata: Kanal veya kayıtsız rolü bulunamadı. Sistem sıfırlanıyor: ${guildId}`);
            db.delete(`captchaSystem_${guildId}`);
            return;
        }

        try {
            await member.roles.add(unregisteredRole);
            
            // Hesap yaşını hesapla ve zorluk seviyesini belirle
            const accountAge = moment().diff(member.user.createdAt, 'days');
            let difficulty = 'normal';
            if (accountAge <= 7) {
                difficulty = 'hard';
            } else if (accountAge >= 2000) {
                difficulty = 'easy';
            } else if (accountAge >= 500 && accountAge <= 1000) {
                difficulty = 'medium';
            }

            const { captchaText, imageBuffer } = await generateCaptcha(difficulty);

            db.set(`captchaCode_${guildId}_${member.id}`, captchaText);

            const securityStatus = accountAge < 15 ? "Şüpheli ❓" : "Güvenli ✅";
            
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(`Hoş Geldin, ${member.user.username}!`)
                .setDescription(
                    `Sunucumuza tam erişim sağlamak için lütfen aşağıdaki resimde gördüğün karakterleri girerek kendini doğrula.\n\n` +
                    `**Hesap Güvenlik Durumu:** ${securityStatus}\n` +
                    `*(Hesap ${accountAge} gün önce <t:${Math.floor(member.user.createdAt / 1000)}:R> oluşturuldu.)*`
                )
                .setImage('attachment://captcha.png')
                .setFooter({ text: "Doğrulama yapmak için aşağıdaki butona tıkla."});

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`captcha_verify_${member.id}`)
                        .setLabel("Doğrula")
                        .setStyle(ButtonStyle.Primary)
                );

            // "Hey @kullanıcı" metni kaldırıldı, sadece embed gönderiliyor.
            await channel.send({
                embeds: [embed],
                files: [attachment],
                components: [row]
            });
            
        } catch (error) {
            console.error("Captcha gönderilirken veya rol verilirken hata oluştu:", error);
        }

    } else if (registerSystem) {
      // Mevcut kayıt sisteminiz burada olduğu gibi çalışmaya devam eder.
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
                new ButtonBuilder().setCustomId(`normal_register_${member.id}`).setLabel("Normal Register").setStyle(ButtonStyle.Success).setEmoji("👤"), 
                new ButtonBuilder().setCustomId(`manual_register_${member.id}`).setLabel("Manual Register").setStyle(ButtonStyle.Primary).setEmoji("✍️"),
                new ButtonBuilder().setCustomId(`ai_register_${member.id}`).setLabel("AI Register").setStyle(ButtonStyle.Danger).setEmoji("🤖")
            );
            
        const staffMention = staffRole ? `Hey ${staffRole}!` : "Hey Staff!";
        await welcomeChannel.send({ content: `${staffMention} - Welcome to the server, ${member}!`, embeds: [welcomeEmbed], components: [row] }).catch(console.error);
      } else {
        db.delete(`registerSystem_${guildId}`);
      }
    }
  },
};
        
