const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ตรวจว่าบอทออนไลน์และทำงานปกติ'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', withResponse: true });
    const roundTrip = sent.resource.message.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `🏓 Pong!\nLatency: **${roundTrip}ms**\nWebSocket: **${interaction.client.ws.ping}ms**`
    );
  },
};
