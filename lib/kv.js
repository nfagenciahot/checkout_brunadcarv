import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();

export function hasRedisStore() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) throw new Error('Armazenamento persistente não configurado.');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) throw new Error(data?.error || `Redis HTTP ${response.status}`);
  return data?.result;
}

function safeFileKey(key) {
  return String(key).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function localPath(key) {
  return path.join(root, 'data', 'kv', `${safeFileKey(key)}.json`);
}

export async function kvGet(key) {
  if (hasRedisStore()) {
    const raw = await redisCommand(['GET', key]);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }
  try {
    const raw = await fs.readFile(localPath(key), 'utf8');
    const envelope = JSON.parse(raw);
    if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
      await fs.rm(localPath(key), { force: true });
      return null;
    }
    return envelope.value;
  } catch {
    return null;
  }
}

export async function kvSet(key, value, ttlSeconds = 0) {
  if (hasRedisStore()) {
    const raw = JSON.stringify(value);
    if (ttlSeconds > 0) await redisCommand(['SET', key, raw, 'EX', ttlSeconds]);
    else await redisCommand(['SET', key, raw]);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error('Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel.');
  }
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({
    value,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
  }, null, 2), 'utf8');
}

export async function kvDelete(key) {
  if (hasRedisStore()) {
    await redisCommand(['DEL', key]);
    return;
  }
  await fs.rm(localPath(key), { force: true }).catch(() => {});
}
