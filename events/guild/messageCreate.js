// events/messages/messageCreate.js

const db = require("croxydb");
const { EmbedBuilder } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
// moment.locale("tr"); // Set to 'en' or remove for English

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // --- XP & Level System ---
    const userXp = db.get(`xp_${message.author.id}_${message.guild.id}`) || 0;
    const userLevel = db.get(`level_${message.author.id}_${message.guild.id}`) || 1;
    const requiredXp = userLevel * (client.config.levelXp || 150); // Use config value or a default
    const messageXp = client.config.mesajXp || 15; // Use config value or a default

    db.add(`xp_${message.author.id}_${message.guild.id}`, messageXp);

    if (userXp + messageXp >= requiredXp) {
      db.set(`level_${message.author.id}_${message.guild.id}`, userLevel + 1);
      db.set(`xp_${message.author.id}_${message.guild.id}`, 0);

      const levelUpEmbed = new EmbedBuilder()
        .setColor(client.config.successColor || "Green")
        .setDescription(`🎉 | Congratulations ${message.author}! You've reached level **${userLevel + 1}**!`)
        .setTimestamp();

      message.channel.send({ embeds: [levelUpEmbed] });
    }

    // --- AFK System ---
    if (db.has(`afk_${message.author.id}`)) {
      const afkDate = db.get(`afkDate_${message.author.id}`);
      const timeAgo = moment.duration(Date.now() - afkDate.date).format("D [days], H [hrs], m [mins], s [secs]");

      db.delete(`afk_${message.author.id}`);
      db.delete(`afkDate_${message.author.id}`);

      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setDescription(`✅ | Welcome back! You are no longer AFK. You were away for ${timeAgo}.`)
        .setTimestamp();

      message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    if (message.mentions.users.size > 0) {
      const mentionedUser = message.mentions.users.first();
      if (db.has(`afk_${mentionedUser.id}`)) {
        const afkReason = db.get(`afk_${mentionedUser.id}`);
        const afkDate = db.get(`afkDate_${mentionedUser.id}`);
        const timeAgo = moment.duration(Date.now() - afkDate.date).format("D [days], H [hrs], m [mins], s [secs]");

        const embed = new EmbedBuilder()
          .setColor("#5865F2")
          .setDescription(`ℹ️ | ${mentionedUser.tag} has been AFK for **${timeAgo}**.\n\n📝 **Reason:** ${afkReason}`)
          .setTimestamp();

        message.reply({ embeds: [embed] });
      }
    }
  },
};