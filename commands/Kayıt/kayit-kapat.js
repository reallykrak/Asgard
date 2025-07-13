// commands/kayit-kapat.js

const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");

module.exports = {
    name: "register-disable",
    description: "Disables the registration system on the server.",
    type: 1,
    options: [],
    run: async (client, interaction) => {
        if (!interaction.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription("❌ | You must have the **Administrator** permission to use this command.")],
                ephemeral: true,
            });
        }
        
        const registerSystem = db.get(`registerSystem_${interaction.guild.id}`);
        if (!registerSystem) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription("❌ | The registration system is not active!")],
                ephemeral: true,
            });
        }

        db.delete(`registerSystem_${interaction.guild.id}`);
        const successEmbed = new EmbedBuilder()
            .setColor("Green")
            .setDescription("✅ | The registration system has been successfully disabled!")
            .setFooter({ text: `Action by: ${interaction.user.tag}` });
        return interaction.reply({ embeds: [successEmbed] });
    },
};