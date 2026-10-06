const { syncGuild } = require('./discordSync');
const { memberUpdateQueue } = require('./memberUpdateQueue');
const { refreshLinkedRoblox } = require('./robloxLink');

function readIntervalMinutes(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function fmtError(err) {
  return err?.message || String(err);
}

const state = {
  guildId: null,
  startedAt: null,
  shuttingDown: false,
  timers: [],
  jobs: {
    roblox: { running: false, lastRunAt: null, lastOkAt: null, lastError: null, lastResult: null },
    fullSync: { running: false, lastRunAt: null, lastOkAt: null, lastError: null, lastResult: null },
  },
};

async function runGuarded(name, job) {
  const slot = state.jobs[name];
  if (!slot || slot.running) return { skipped: true, reason: 'already-running' };
  slot.running = true;
  slot.lastRunAt = new Date().toISOString();
  slot.lastError = null;
  try {
    const result = await job();
    slot.lastOkAt = new Date().toISOString();
    slot.lastResult = result;
    return result;
  } catch (err) {
    slot.lastError = fmtError(err);
    console.error(`✗ ${name} automation ล้มเหลว:`, err);
    throw err;
  } finally {
    slot.running = false;
  }
}

function addInterval(name, intervalMs, job) {
  const timer = setInterval(() => {
    runGuarded(name, job).catch(() => {});
  }, intervalMs);
  timer.unref?.();
  state.timers.push(timer);
}

function startAutomation(guild) {
  if (state.startedAt) return;
  state.guildId = guild.id;
  state.startedAt = new Date().toISOString();
  memberUpdateQueue.start();

  const robloxMinutes = readIntervalMinutes('ROBLOX_REFRESH_INTERVAL_MINUTES', 20);
  const fullSyncMinutes = readIntervalMinutes('FULL_SYNC_INTERVAL_MINUTES', 60);

  addInterval('roblox', robloxMinutes * 60 * 1000, () => refreshLinkedRoblox());
  addInterval('fullSync', fullSyncMinutes * 60 * 1000, () => syncGuild(guild));

  console.log(`✓ Phase 5 Automation: Roblox ทุก ${robloxMinutes} นาที, Full sync ทุก ${fullSyncMinutes} นาที`);
}

function getAutomationHealth(client) {
  return {
    guildId: state.guildId,
    startedAt: state.startedAt,
    uptimeMs: state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0,
    shuttingDown: state.shuttingDown,
    wsPing: client?.ws?.ping ?? null,
    jobs: state.jobs,
    queue: memberUpdateQueue.getHealth(),
  };
}

function stopTimers() {
  for (const timer of state.timers) clearInterval(timer);
  state.timers = [];
}

async function runRobloxRefreshNow() {
  return runGuarded('roblox', () => refreshLinkedRoblox());
}

async function runFullSyncNow(guild) {
  return runGuarded('fullSync', () => syncGuild(guild));
}

async function shutdownBot(client, reason = 'manual') {
  if (state.shuttingDown) return;
  state.shuttingDown = true;
  console.log(`กำลังปิดบอทอย่างปลอดภัย (${reason})...`);
  stopTimers();
  memberUpdateQueue.stop();
  try {
    await memberUpdateQueue.flush();
  } catch (err) {
    console.error('Flush คิวก่อนปิดไม่สำเร็จ:', err.message);
  }
  client?.destroy();
  console.log('✓ Bot shutdown complete');
  process.exit(0);
}

module.exports = {
  startAutomation,
  getAutomationHealth,
  runRobloxRefreshNow,
  runFullSyncNow,
  shutdownBot,
};
