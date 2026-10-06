const { Events } = require('discord.js');
const { memberUpdateQueue } = require('../services/memberUpdateQueue');

module.exports = {
  name: Events.PresenceUpdate,

  async execute(oldPresence, newPresence) {
    const oldStatus = oldPresence?.status ?? 'offline';
    const newStatus = newPresence?.status ?? 'offline';
    if (oldStatus === newStatus) return;

    const discordId = newPresence?.userId ?? oldPresence?.userId;
    if (!discordId) return;

    memberUpdateQueue.enqueuePatch(discordId, {
      discord_status: newStatus,
      is_in_server: true,
    }, 'presenceUpdate');
  },
};
