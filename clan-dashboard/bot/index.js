require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { shutdownBot } = require('./services/automation');

if (!process.env.DISCORD_TOKEN || !process.env.GUILD_ID) {
  console.error('✗ ขาด DISCORD_TOKEN หรือ GUILD_ID ใน .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // Server Members Intent
    GatewayIntentBits.GuildPresences, // Presence Intent
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  const handler = async (...args) => {
    try {
      await event.execute(...args);
    } catch (err) {
      console.error(`Error ใน event ${event.name}:`, err);
    }
  };
  if (event.once) client.once(event.name, handler);
  else client.on(event.name, handler);
}

client.on(Events.InteractionCreate, async (interaction) => {
  const label = interaction.isButton() ? interaction.customId : `/${interaction.commandName}`;
  try {
    // ปุ่มยืนยัน Roblox
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('robloxverify:')) {
        await client.commands.get('linkroblox').handleButton(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error ใน ${label}:`, err);
    const msg = { content: 'เกิดข้อผิดพลาดในการทำงาน', flags: MessageFlags.Ephemeral };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch { /* ignore */ }
  }
});

process.once('SIGINT', () => shutdownBot(client, 'SIGINT'));
process.once('SIGTERM', () => shutdownBot(client, 'SIGTERM'));

client.login(process.env.DISCORD_TOKEN);
