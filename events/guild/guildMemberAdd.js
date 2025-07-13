// events/members/guildMemberAdd.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "guildMemberAdd",
  once: false,
  async execute(client, member) {
    const guildId = member.guild.id;
    const registerSystem = db.get(`registerSystem_${guildId}`);

    if (registerSystem) {
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
        // --- ENHANCED WELCOME MESSAGE ---
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