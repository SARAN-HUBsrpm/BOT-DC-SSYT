// แปลง GuildMember ของ discord.js → object ที่ตรงกับตาราง "members"
// หมายเหตุ: ไม่ใส่ discord_banner และช่อง roblox_* เพื่อไม่ให้ upsert ไปเขียนทับค่าที่มีอยู่

const { getBuilds } = require('../config/roleMapping');

const STATUS_LABEL = {
  online: '🟢 Online',
  idle: '🟡 Idle',
  dnd: '🔴 Do Not Disturb',
  offline: '⚫ Offline',
};

function getStatus(member) {
  // presence เป็น null = ออฟไลน์ (หรือ Invisible) ซึ่ง Discord ไม่บอกความต่างให้บอท
  return member.presence?.status ?? 'offline';
}

function toMemberRow(member) {
  const roles = member.roles.cache
    .filter((role) => role.id !== member.guild.id) // ตัด @everyone ออก
    .sort((a, b) => b.position - a.position)
    .map((role) => ({ id: role.id, name: role.name }));

  return {
    discord_id: member.id,
    discord_username: member.user.username,
    discord_display_name: member.user.globalName ?? member.user.username,
    discord_server_nickname: member.nickname ?? null,
    discord_avatar: member.displayAvatarURL({ extension: 'png', size: 256 }),
    discord_status: getStatus(member),
    roles,
    builds: getBuilds(roles.map((r) => r.id)),
    is_bot: member.user.bot,
    joined_at: member.joinedAt ? member.joinedAt.toISOString() : null,
  };
}

module.exports = { toMemberRow, STATUS_LABEL };
