const { Events } = require('discord.js');
const { syncRoleInMemberRows } = require('../services/roleMaintenance');

module.exports = {
  name: Events.GuildRoleUpdate,

  async execute(oldRole, newRole) {
    if (oldRole.name === newRole.name && oldRole.position === newRole.position) return;
    const count = await syncRoleInMemberRows(newRole);
    if (count > 0) console.log(`✓ Role updated sync: ${newRole.name} (${count} members queued)`);
  },
};
