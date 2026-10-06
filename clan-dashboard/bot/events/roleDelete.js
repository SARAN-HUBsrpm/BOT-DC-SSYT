const { Events } = require('discord.js');
const { removeRoleFromMemberRows } = require('../services/roleMaintenance');

module.exports = {
  name: Events.GuildRoleDelete,

  async execute(role) {
    const count = await removeRoleFromMemberRows(role);
    if (count > 0) console.log(`✓ Role deleted sync: ${role.name} (${count} members queued)`);
  },
};
