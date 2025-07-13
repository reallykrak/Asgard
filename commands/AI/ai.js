// Gerekli modülleri içeri aktarıyoruz.
const { EmbedBuilder } = require("discord.js");
const fetch = require('node-fetch');

module.exports = {
  // commandLoader.js tarafından okunacak komut bilgileri
  name: "ai",
  description: "Yapay zeka ile sohbet edin.",
  type: 1, // 1: Slash Command (Sohbet Girdisi)
  options: [
    {
      name: "soru",
      description: "Yapay zekaya yöneltmek istediğiniz soru.",
      type: 3, // 3: String (Metin)
      required: true,
    },
  ],

  // interactionCreate.js tarafından çalıştırılacak ana fonksiyon
  run: async (client, interaction) => {

    // API yanıtı gecikebileceği için Discord'a "düşünüyor..." durumu gönderiyoruz.
    // Bu, komutun zaman aşımına uğramasını engeller.
    await interaction.deferReply();

    // Kullanıcının 'soru' seçeneğine girdiği metni alıyoruz.
    const soru = interaction.options.getString("soru");

    try {
      // Belirtilen API adresine POST isteği gönderiyoruz.
      const response = await fetch("https://api.gptgod.online/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // API'nin beklediği formatta gövde (body) hazırlıyoruz.
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: soru }],
        })
      });

      // API'den gelen yanıtı JSON olarak işliyoruz.
      const data = await response.json();

      // API'den gelen cevabı alıyoruz. Cevap yoksa veya format bozuksa diye bir kontrol ekliyoruz.
      const cevap = data.choices?.[0]?.message?.content?.trim() || "❌ Üzgünüm, bir yanıt alınamadı. Lütfen daha sonra tekrar deneyin.";

      // Cevabı kullanıcıya göstermek için şık bir Embed mesajı oluşturuyoruz.
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle("🤖 Yapay Zeka")
        .addFields(
          { name: 'Sizin Sorunuz', value: `> ${soru}` },
          { name: 'Yapay Zekanın Yanıtı', value: `>>> ${cevap}` }
        )
        .setTimestamp()
        .setFooter({ text: `Komutu kullanan: ${interaction.user.tag}` });

      // "Düşünüyor..." mesajını, hazırladığımız bu Embed ile güncelliyoruz.
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      // Bir hata oluşursa, hatayı konsola yazdırıyoruz.
      console.error("❌ | AI komutunda hata oluştu:", error);

      // Kullanıcıya da bir hata mesajı gönderiyoruz.
      await interaction.editReply({ content: "❌ Bir şeyler ters gitti! Yapay zeka hizmetine ulaşılamıyor." });
    }
  },
};
        
