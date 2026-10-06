const { getBuilds } = require('../config/roleMapping');
const { memberUpdateQueue } = require('./memberUpdateQueue');
const { supabase } = require('./supabase');

function sortRolesForGuild(roles, guild) {
  return [...roles].sort((a, b) => {
    const posA = guild.roles.cache.get(a.id)?.position ?? 0;
    const posB = guild.roles.cache.get(b.id)?.position ?? 0;
    return posB - posA;
  });
}

async function getRowsWithRole(roleId) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from('members')
      .select('discord_id, roles')
      .contains('roles', [{ id: String(roleId) }])
      .range(from, from + page - 1);
    if (error) throw new Error(`อ่านสมาชิกตาม Role ไม่สำเร็จ: ${error.message}`);
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

async function syncRoleInMemberRows(role) {
  const rows = await getRowsWithRole(role.id);
  for (const row of rows) {
    const roles = sortRolesForGuild(
      (row.roles || []).map((r) => (r.id === role.id ? { ...r, name: role.name } : r)),
      role.guild
    );
    memberUpdateQueue.enqueuePatch(row.discord_id, {
      roles,
      builds: getBuilds(roles.map((r) => r.id)),
    }, 'roleUpdate');
  }
  return rows.length;
}

async function removeRoleFromMemberRows(role) {
  const rows = await getRowsWithRole(role.id);
  for (const row of rows) {
    const roles = sortRolesForGuild((row.roles || []).filter((r) => r.id !== role.id), role.guild);
    memberUpdateQueue.enqueuePatch(row.discord_id, {
      roles,
      builds: getBuilds(roles.map((r) => r.id)),
    }, 'roleDelete');
  }
  return rows.length;
}

module.exports = { syncRoleInMemberRows, removeRoleFromMemberRows };
