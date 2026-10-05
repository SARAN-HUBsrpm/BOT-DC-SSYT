const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { toMemberRow, STATUS_LABEL } = require('../services/memberMapper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('member')
    .setDescription('ดูข้อมูลสมาชิก')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('สมาชิกที่ต้องการดู (ไม่ใส่ = ตัวคุณเอง)')
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: 'ไม่พบสมาชิกคนนี้ใน Server',
        flags: MessageFlags.Ephemeral,
      });
    }

    const row = toMemberRow(member);
    const roleText = row.roles.length
      ? row.roles.map((r) => `<@&${r.id}>`).join(' ')
      : 'ไม่มี Role';

    const embed = new EmbedBuilder()
      .setTitle(row.discord_display_name)
      .setThumbnail(row.discord_avatar)
      .addFields(
        { name: 'Username', value: `@${row.discord_username}`, inline: true },
        { name: 'Status', value: STATUS_LABEL[row.discord_status], inline: true },
        { name: 'Discord ID', value: row.discord_id },
        { name: 'Roles', value: roleText },
        {
          name: 'Joined Server',
          value: row.joined_at ? `<t:${Math.floor(new Date(row.joined_at) / 1000)}:D>` : 'ไม่ทราบ',
        }
      )
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
