// commands/kayit-ayarla.js

const { EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const db = require("croxydb");

module.exports = {
    name: "register-setup",
    description: "Sets up the registration system for the server.",
    type: 1,
    options: [
        {
            name: "welcome-channel",
            description: "The channel where welcome messages will be sent.",
            type: ApplicationCommandOptionType.Channel,
            required: true,
            channel_types: [ChannelType.GuildText],
        },
        {
            name: "staff-role",
            description: "The role that can use the registration buttons.",
            type: ApplicationCommandOptionType.Role,
            required: true,
        },
        {
            name: "registered-role",
            description: "The role to be given to registered members.",
            type: ApplicationCommandOptionType.Role,
            required: true,
        },
        {
            name: "unregistered-role",
            description: "The role to be given to new members upon joining.",
            type: ApplicationCommandOptionType.Role,
            required: true,
        },
        {
            name: "log-channel",
            description: "The channel where registration logs will be sent. (Optional)",
            type: ApplicationCommandOptionType.Channel,
            required: false,
            channel_types: [ChannelType.GuildText],
        },
        {
            name: "tag",
            description: "The tag to be added to the username of registered users. (Optional)",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    run: async (client, interaction) => {
        if (!interaction.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription("❌ | You must have the **Administrator** permission to use this command.")],
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel("welcome-channel");
        const staffRole = interaction.options.getRole("staff-role");
        const registeredRole = interaction.options.getRole("registered-role");
        const unregisteredRole = interaction.options.getRole("unregistered-role");
        const logChannel = interaction.options.getChannel("log-channel");
        const tag = interaction.options.getString("tag");
        const botMember = interaction.guild.members.me;

        // Role hierarchy check
        if (registeredRole.position >= botMember.roles.highest.position || unregisteredRole.position >= botMember.roles.highest.position) {
            const errorEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Role Hierarchy Error")
                .setDescription(`The bot's highest role ('**${botMember.roles.highest.name}**') must be **above** both the registered and unregistered roles. Please move the bot's role up in your server settings.`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const systemData = {
            channelId: channel.id,
            staffRoleId: staffRole.id,
            registeredRoleId: registeredRole.id,
            unregisteredRoleId: unregisteredRole.id,
            logChannelId: logChannel ? logChannel.id : null,
            tag: tag ? tag : null,
        };
        db.set(`registerSystem_${interaction.guild.id}`, systemData);

        const successEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Registration System Setup Complete")
            .setDescription(`The registration system has been configured successfully.\n\n**Welcome Channel**: ${channel}\n**Staff Role**: ${staffRole}\n**Registered Role**: ${registeredRole}\n**Unregistered Role**: ${unregisteredRole}\n**Log Channel**: ${logChannel || "Not Set"}\n**Tag**: \`${tag || "Not Set"}\``)
            .setFooter({ text: `Setup by: ${interaction.user.tag}` });
        return interaction.reply({ embeds: [successEmbed] });
    },
};