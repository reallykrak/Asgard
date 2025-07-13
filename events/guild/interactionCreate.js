// events/core/interactionCreate.js

const { InteractionType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const db = require("croxydb");
const moment = require("moment"); // moment'ı ekliyoruz

// --- CENTRALIZED REGISTRATION FUNCTION ---
// Bu fonksiyon olduğu gibi kalabilir.
async function finalizeRegistration(interaction, targetMember, baseName, staffMember, registrationType) {
    const guildId = interaction.guild.id;
    const systemSettings = db.get(`registerSystem_${guildId}`);
    if (!systemSettings) {
        return interaction.editReply({ content: "❌ Registration system settings not found. Please ask an admin to re-configure it.", ephemeral: true });
    }

    const { registeredRoleId, unregisteredRoleId, logChannelId, tag } = systemSettings;
    const registeredRole = await interaction.guild.roles.fetch(registeredRoleId).catch(() => null);
    const unregisteredRole = await interaction.guild.roles.fetch(unregisteredRoleId).catch(() => null);

    if (!registeredRole || !unregisteredRole) {
        return interaction.editReply({ content: "❌ Error: Registered or unregistered role not found. Please re-configure the system.", ephemeral: true });
    }

    // Prepend the tag to the name
    const newName = `${tag ? `${tag} ` : ''}${baseName}`;

    try {
        await targetMember.setNickname(newName);
        await targetMember.roles.add(registeredRole);
        await targetMember.roles.remove(unregisteredRole);

        // Disable the buttons after registration
        const originalMessage = interaction.message;
        if (originalMessage && originalMessage.components.length > 0) {
            const disabledRow = ActionRowBuilder.from(originalMessage.components[0]);
            disabledRow.components.forEach(c => c.setDisabled(true));
            await originalMessage.edit({ components: [disabledRow] }).catch(() => {});
        }

        const successMessage = `✅ **${targetMember.user.tag}** has been successfully registered as **${newName}**!`;
        await interaction.editReply({ content: successMessage, ephemeral: true });
        
        // Improved log message
        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("📝 Member Registered")
                .addFields(
                    { name: "Member", value: `${targetMember} (\`${targetMember.id}\`)`, inline: false },
                    { name: "Registered By", value: `${staffMember} (\`${staffMember.id}\`)`, inline: false },
                    { name: "New Nickname", value: newName, inline: false },
                    { name: "Registration Type", value: registrationType, inline: false } // New field
                )
                .setThumbnail(targetMember.user.displayAvatarURL())
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
        console.error("Finalize Registration Error:", error);
        await interaction.editReply({ content: `❌ An error occurred. Please check my permissions and role hierarchy.`, ephemeral: true });
    }
}

// Bu fonksiyon da olduğu gibi kalabilir.
function isNameValid(name) {
    const profanity = ["fuck", "bitch", "cunt", "nigger", "amk", "sik", "yarrak", "pezevenk"];
    if (profanity.some(word => name.toLowerCase().includes(word))) return { valid: false, reason: "The name contains inappropriate language." };
    if (name.length < 3 || name.length > 24) return { valid: false, reason: "Name must be between 3 and 24 characters." };
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) return { valid: false, reason: "Name can only contain letters, numbers, and spaces." };
    if (/(.)\1{2,}/.test(name)) return { valid: false, reason: "Name contains too many repeating characters." };
    if (!/[aeiouy]/i.test(name)) return { valid: false, reason: "Name must contain at least one vowel." };
    if (/^\d+$/.test(name)) return { valid: false, reason: "Name cannot be only numbers." };
    return { valid: true, reason: null };
}

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.run(client, interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
        }
    }
    
    else if (interaction.isButton()) {
        const [action, ...args] = interaction.customId.split('_');
        const guildId = interaction.guild.id;

        // --- CAPTCHA SİSTEMİ BUTON KONTROLÜ ---
        if (action === 'captcha' && args[0] === 'verify') {
            const targetMemberId = args[1];

            // Sadece ilgili üyenin butona basmasını sağla
            if (interaction.user.id !== targetMemberId) {
                return interaction.reply({ content: "❌ | Bu doğrulama sana ait değil!", ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`captcha_modal_${targetMemberId}`)
                .setTitle("Hesap Doğrulama")
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('captcha_input')
                        .setLabel("Resimdeki karakterleri girin")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(6)
                        .setMaxLength(6)
                        .setPlaceholder("ABCDEF")
                ));
            return await interaction.showModal(modal);
        }
        
        // --- ESKİ KAYIT SİSTEMİ BUTON KONTROLLERİ ---
        const targetMemberIdForRegister = args[1]; // Veya customId'nizin yapısına göre args[0]
        const systemSettings = db.get(`registerSystem_${guildId}`);
        if (action === 'manual' || action === 'ai' || action === 'normal') {
            if (!systemSettings) return;

            const targetMember = await interaction.guild.members.fetch(targetMemberIdForRegister).catch(() => null);
            if (!targetMember) {
                return interaction.reply({ content: "❌ Member not found. They may have left the server.", ephemeral: true }).catch(() => {});
            }

            if (action === 'manual' || action === 'ai') {
                const { staffRoleId } = systemSettings;
                if (action === 'manual') {
                    const hasStaffRole = interaction.member.roles.cache.has(staffRoleId);
                    if (!hasStaffRole) {
                        return interaction.reply({ content: "❌ You do not have the required staff role to use this button.", ephemeral: true });
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`manual_modal_${targetMember.id}`)
                        .setTitle("Manual Registration")
                        .addComponents(new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('member_name')
                                .setLabel("New name for the member")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder("e.g., John")
                        ));
                    await interaction.showModal(modal);
                } else { // action === 'ai'
                    if (interaction.user.id !== targetMember.id) {
                        return interaction.reply({ content: "❌ You can only use this button for yourself.", ephemeral: true });
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`ai_modal_${targetMember.id}`)
                        .setTitle("AI Assisted Registration")
                        .addComponents(new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('ai_member_name')
                                .setLabel("Enter your desired name")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder("A valid and respectful name")
                        ));
                    await interaction.showModal(modal);
                }
            } else if (action === 'normal') {
                await interaction.deferReply({ ephemeral: true });
                const { staffRoleId } = systemSettings;
                const hasStaffRole = interaction.member.roles.cache.has(staffRoleId);
                
                if (!hasStaffRole) {
                    return interaction.editReply({ content: "❌ You do not have the required staff role to use this button." });
                }
                
                await finalizeRegistration(interaction, targetMember, targetMember.user.username, interaction.member, "Normal (Staff)");
            }
        }
    }
    
    else if (interaction.isModalSubmit()) {
        await interaction.deferReply({ ephemeral: true });
        const [action, ...args] = interaction.customId.split('_');
        const guildId = interaction.guild.id;

        // --- CAPTCHA SİSTEMİ MODAL KONTROLÜ ---
        if (action === 'captcha' && args[0] === 'modal') {
            const targetMemberId = args[1];
            const member = await interaction.guild.members.fetch(targetMemberId).catch(() => null);
            if (!member) {
                return interaction.editReply({ content: "❌ | Üye bulunamadı, sunucudan ayrılmış olabilir.", ephemeral: true });
            }

            const captchaSettings = db.get(`captchaSystem_${guildId}`);
            if (!captchaSettings) {
                return interaction.editReply({ content: "❌ | Captcha sistemi ayarları bulunamadı. Lütfen yöneticiye bildirin.", ephemeral: true });
            }

            const correctCode = db.get(`captchaCode_${guildId}_${member.id}`);
            const userInput = interaction.fields.getTextInputValue('captcha_input');

            if (correctCode && userInput.toLowerCase() === correctCode.toLowerCase()) {
                // Doğru
                const { registeredRoleId, unregisteredRoleId, logChannelId } = captchaSettings;
                const registeredRole = await interaction.guild.roles.fetch(registeredRoleId).catch(() => null);
                const unregisteredRole = await interaction.guild.roles.fetch(unregisteredRoleId).catch(() => null);
                const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);

                if (!registeredRole || !unregisteredRole) {
                    return interaction.editReply({ content: "❌ | Kayıtlı veya kayıtsız rolü bulunamadı. Lütfen yöneticiye bildirin.", ephemeral: true });
                }

                try {
                    await member.roles.add(registeredRole);
                    await member.roles.remove(unregisteredRole);
                    
                    // Captcha mesajını sil
                    await interaction.message.delete().catch(err => console.error("Captcha mesajı silinemedi:", err));

                    // Veritabanından kodu temizle
                    db.delete(`captchaCode_${guildId}_${member.id}`);

                    if (logChannel) {
                        const accountCreationDate = moment(member.user.createdAt);
                        const accountAge = moment().diff(accountCreationDate, 'days');
                        const securityStatus = accountAge < 15 ? "Şüpheli ❓" : "Güvenli ✅";
                        
                        const logEmbed = new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Üye Doğrulandı")
                            .setThumbnail(member.user.displayAvatarURL())
                            .addFields(
                                { name: "Üye", value: `${member} (\`${member.id}\`)`},
                                { name: "Doğrulama Zamanı", value: `<t:${Math.floor(Date.now() / 1000)}:R>`},
                                { name: "Hesap Güvenliği", value: `${securityStatus} (${accountAge} günlük hesap)` }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                    
                    await interaction.editReply({ content: "✅ | Başarıyla doğrulandın! Sunucuya hoş geldin.", ephemeral: true });

                } catch (error) {
                    console.error("Roller verilirken hata oluştu:", error);
                    await interaction.editReply({ content: "❌ | Rolleri ayarlarken bir hata oluştu. Lütfen yetkilerimi kontrol edin.", ephemeral: true });
                }

            } else {
                // Yanlış
                return interaction.editReply({ content: "❌ | Yanlış kod girdin! Lütfen tekrar dene.", ephemeral: true });
            }
        }
        
        // --- ESKİ KAYIT SİSTEMİ MODAL KONTROLLERİ ---
        const targetMemberIdForRegister = args[1];
        if (action === 'manual' || action === 'ai') {
            const targetMember = await interaction.guild.members.fetch(targetMemberIdForRegister).catch(() => null);
            if (!targetMember) {
                return interaction.editReply({ content: "❌ Member not found. They may have left the server." });
            }

            if (action === 'manual') {
                const baseName = interaction.fields.getTextInputValue('member_name');
                await finalizeRegistration(interaction, targetMember, baseName, interaction.member, "Manual (Staff)");
            }
            else if (action === 'ai') {
                const baseName = interaction.fields.getTextInputValue('ai_member_name');
                const validation = isNameValid(baseName);
                if (!validation.valid) {
                    return interaction.editReply({ content: `❌ Invalid name. Reason: ${validation.reason}` });
                }
                const selfMember = await interaction.guild.members.fetch(client.user.id);
                await finalizeRegistration(interaction, targetMember, baseName, selfMember, "AI (Self-Service)");
            }
        }
    }
  },
};
                               
