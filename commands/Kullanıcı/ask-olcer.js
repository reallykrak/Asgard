const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

module.exports = {
  name: "aşkölçer",
  description: "İki kullanıcı arasındaki aşk yüzdesini görsel olarak ölçer!",
  type: ApplicationCommandType.ChatInput,
  cooldown: 3,
  options: [
    {
      name: "kullanıcı1",
      description: "Birinci kullanıcı",
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: "kullanıcı2",
      description: "İkinci kullanıcı (boş bırakılırsa siz seçilirsiniz)",
      type: ApplicationCommandOptionType.User,
      required: false
    }
  ],
  
  run: async(client, interaction) => {
    await interaction.deferReply();
    
    const kullanıcı1 = interaction.options.getUser("kullanıcı1");
    const kullanıcı2 = interaction.options.getUser("kullanıcı2") || interaction.user;
    
    if (kullanıcı1.id === kullanıcı2.id) {
      return interaction.editReply({
        content: "Kendine olan aşkını ölçmek için başka birini etiketlemelisin! 😄",
        ephemeral: true
      });
    }
    
    try {
      const loveScore = Math.abs(
        (parseInt(kullanıcı1.id.substring(0, 5)) + parseInt(kullanıcı2.id.substring(0, 5))) % 101
      );
      
      let color, heartColor;
      if (loveScore < 25) {
        color = "#ff0000"; 
        heartColor = "#ff6666"; 
      } else if (loveScore < 50) {
        color = "#ff6600"; 
        heartColor = "#ff9966"; 
      } else if (loveScore < 75) {
        color = "#ff3399"; 
        heartColor = "#ff66cc"; 
      } else {
        color = "#ff00ff"; 
        heartColor = "#ff66ff"; 
      }
      
      let loveMessage;
      if (loveScore < 25) loveMessage = "Pek umut vaat etmiyor gibi...";
      else if (loveScore < 50) loveMessage = "Arkadaşlıktan ötesi olabilir!";
      else if (loveScore < 75) loveMessage = "Bu ikili çok iyi anlaşıyor!";
      else if (loveScore < 90) loveMessage = "Harika bir çift olabilirler!";
      else loveMessage = "Bu tam bir ruh eşi durumu!";
      
      const canvas = createCanvas(800, 450);
      const ctx = canvas.getContext("2d");
      
      ctx.fillStyle = "#fff0f5"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = "bold 50px Arial";
      ctx.fillStyle = "#ff3399";
      ctx.textAlign = "center";
      ctx.fillText("❤️ Aşk Ölçer ❤️", canvas.width / 2, 70);
      
      // Avatarları çiz
      try {
        const avatar1URL = kullanıcı1.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar1 = await loadImage(avatar1URL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(200, 200, 80, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar1, 120, 120, 160, 160);
        ctx.restore();
        
        const avatar2URL = kullanıcı2.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar2 = await loadImage(avatar2URL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(600, 200, 80, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar2, 520, 120, 160, 160);
        ctx.restore();
      } catch (avatarError) {
        console.error("Avatar yükleme hatası:", avatarError);
        ctx.fillStyle = "#cccccc";
        ctx.beginPath();
        ctx.arc(200, 200, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(600, 200, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      // Avatar çerçeveleri
      ctx.beginPath();
      ctx.arc(200, 200, 85, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(600, 200, 85, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.stroke();
      
      ctx.font = "bold 24px Arial";
      ctx.fillStyle = "#333333";
      ctx.textAlign = "center";
      ctx.fillText(kullanıcı1.username, 200, 310);
      ctx.fillText(kullanıcı2.username, 600, 310);
      
      ctx.font = "bold 100px Arial";
      ctx.fillStyle = color;
      ctx.fillText(`${loveScore}%`, canvas.width / 2, 230);
      
      ctx.font = "80px Arial";
      ctx.fillStyle = "#ff0000";
      ctx.fillText("❤️", canvas.width / 2, 140);
      
      const barWidth = 600;
      const barHeight = 40;
      const barX = (canvas.width - barWidth) / 2;
      const barY = 350;
      
      ctx.fillStyle = "#eeeeee";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 20);
      ctx.fill();
      
      const progressWidth = (loveScore / 100) * barWidth;
      if (progressWidth > 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(barX, barY, progressWidth, barHeight, 20);
        ctx.fill();
      }
      
      ctx.font = "bold 30px Arial";
      ctx.fillStyle = "#333333";
      ctx.fillText(loveMessage, canvas.width / 2, 425);
      
      // HATA DÜZELTİLDİ: toBuffer fonksiyonuna 'image/png' parametresi eklendi.
      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'askolcer.png' });
      
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`❤️ Aşk Ölçer Sonucu ❤️`)
        .setDescription(`**${kullanıcı1.username}** ve **${kullanıcı2.username}** arasındaki aşk skoru: **%${loveScore}**\n\n*${loveMessage}*`)
        .setImage('attachment://askolcer.png')
        .setTimestamp();

      if (client.config?.footer) {
        embed.setFooter({ text: client.config.footer });
      }
      
      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error("Aşk ölçer hatası:", error);
      await interaction.editReply({ content: `Aşk ölçülürken bir hata oluştu! Lütfen tekrar deneyin.` });
    }
  }
};
