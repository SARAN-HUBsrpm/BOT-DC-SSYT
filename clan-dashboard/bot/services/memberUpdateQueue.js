const { toMemberRow } = require('./memberMapper');
const { supabase } = require('./supabase');

const DEFAULT_FLUSH_MS = 5000;
const DEFAULT_MAX_BATCH = 250;

function readPositiveInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function cleanPatch(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key !== 'discord_id' && value !== undefined) out[key] = value;
  }
  return out;
}

class MemberUpdateQueue {
  constructor() {
    this.flushMs = readPositiveInt('MEMBER_QUEUE_FLUSH_MS', DEFAULT_FLUSH_MS);
    this.maxBatch = readPositiveInt('MEMBER_QUEUE_MAX_BATCH', DEFAULT_MAX_BATCH);
    this.upserts = new Map();
    this.patches = new Map();
    this.timer = null;
    this.flushing = false;
    this.started = false;
    this.stats = {
      totalUpserted: 0,
      totalPatched: 0,
      totalFlushes: 0,
      failedFlushes: 0,
      lastFlushAt: null,
      lastError: null,
    };
  }

  start() {
    this.started = true;
    this.schedule();
  }

  stop() {
    this.started = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  enqueueMember(member, reason = 'member') {
    if (!member?.id || !member.guild) return;
    const row = {
      ...toMemberRow(member),
      is_in_server: true,
      synced_at: new Date().toISOString(),
    };
    void reason;
    this.upserts.set(member.id, { ...(this.upserts.get(member.id) || {}), ...row });
    this.schedule();
  }

  enqueuePatch(discordId, patch, reason = 'patch') {
    if (!discordId) return;
    const payload = cleanPatch({
      ...patch,
      synced_at: patch.synced_at ?? new Date().toISOString(),
    });
    void reason;

    if (this.upserts.has(discordId)) {
      this.upserts.set(discordId, { ...this.upserts.get(discordId), ...payload });
    } else {
      this.patches.set(discordId, { ...(this.patches.get(discordId) || {}), ...payload });
    }
    this.schedule();
  }

  enqueueMemberLeft(memberOrId) {
    const discordId = typeof memberOrId === 'string' ? memberOrId : memberOrId?.id;
    if (!discordId) return;
    this.upserts.delete(discordId);
    this.enqueuePatch(discordId, {
      is_in_server: false,
      discord_status: 'offline',
    }, 'guildMemberRemove');
  }

  schedule() {
    if (!this.started || this.timer || this.flushing) return;
    if (!this.pendingCount()) return;
    const delay = this.pendingCount() >= this.maxBatch ? 250 : this.flushMs;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch((err) => console.error('Member queue flush error:', err));
    }, delay);
    this.timer.unref?.();
  }

  pendingCount() {
    return this.upserts.size + this.patches.size;
  }

  getHealth() {
    return {
      started: this.started,
      flushMs: this.flushMs,
      maxBatch: this.maxBatch,
      pendingUpserts: this.upserts.size,
      pendingPatches: this.patches.size,
      pendingTotal: this.pendingCount(),
      flushing: this.flushing,
      ...this.stats,
    };
  }

  requeue(upserts, patches) {
    for (const row of upserts) {
      this.upserts.set(row.discord_id, { ...(this.upserts.get(row.discord_id) || {}), ...row });
    }
    for (const patch of patches) {
      this.patches.set(patch.discord_id, { ...(this.patches.get(patch.discord_id) || {}), ...patch });
    }
  }

  async flush() {
    if (this.flushing || !this.pendingCount()) return { upserted: 0, patched: 0 };
    this.flushing = true;

    const upserts = [...this.upserts.values()];
    const patches = [...this.patches.entries()].map(([discordId, patch]) => ({ discord_id: discordId, ...patch }));
    this.upserts.clear();
    this.patches.clear();

    let upserted = 0;
    let patched = 0;
    const failedPatches = [];

    try {
      for (const part of chunk(upserts, 500)) {
        const { error } = await supabase.from('members').upsert(part, { onConflict: 'discord_id' });
        if (error) throw new Error(`Upsert queue ไม่สำเร็จ: ${error.message}`);
        upserted += part.length;
      }

      for (const part of chunk(patches, 50)) {
        for (const patch of part) {
          const { discord_id, ...payload } = patch;
          const { error } = await supabase.from('members').update(payload).eq('discord_id', discord_id);
          if (error) {
            failedPatches.push(patch);
            console.warn(`Patch สมาชิกไม่สำเร็จ ${discord_id}: ${error.message}`);
            continue;
          }
          patched++;
        }
      }

      this.stats.totalUpserted += upserted;
      this.stats.totalPatched += patched;
      this.stats.totalFlushes++;
      this.stats.lastFlushAt = new Date().toISOString();
      this.stats.lastError = failedPatches.length ? `Patch queue ไม่สำเร็จ ${failedPatches.length} รายการ` : null;
      if (failedPatches.length) {
        this.stats.failedFlushes++;
        this.requeue([], failedPatches);
      }
      return { upserted, patched };
    } catch (err) {
      this.stats.failedFlushes++;
      this.stats.lastError = err.message;
      this.requeue(upserts, patches);
      throw err;
    } finally {
      this.flushing = false;
      this.schedule();
    }
  }
}

const memberUpdateQueue = new MemberUpdateQueue();

module.exports = { memberUpdateQueue };
