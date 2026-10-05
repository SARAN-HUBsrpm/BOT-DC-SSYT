const { PermissionFlagsBits } = require('discord.js');

function isAdminOrOwner(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  const isOwner = process.env.OWNER_DISCORD_ID && interaction.user.id === process.env.OWNER_DISCORD_ID;
  return Boolean(isAdmin || isOwner);
}

module.exports = { isAdminOrOwner };
