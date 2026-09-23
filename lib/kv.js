import { createClient } from 'redis';

const GLOBAL_KEY = '__brunadcarvRedisClient';

function getRedisUrl() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error('REDIS_URL não configurada na Vercel.');
  return url;
}

export function hasRedisStore() {
  return Boolean(process.env.REDIS_URL?.trim());
}

async function getRedisClient() {
  if (!globalThis[GLOBAL_KEY]) {
    const client = createClient({
      url: getRedisUrl(),
      socket: {
        reconnectStrategy(retries) {
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Evita transformar eventos de conexão em exceções não tratadas.
    client.on('error', (error) => {
      console.error('[Redis]', error?.message || error);
    });

    globalThis[GLOBAL_KEY] = client;
  }

  const client = globalThis[GLOBAL_KEY];
  if (!client.isOpen) await client.connect();
  return client;
}

export async function kvGet(key) {
  const client = await getRedisClient();
  const raw = await client.get(String(key));
  if (raw == null) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function kvSet(key, value, ttlSeconds = 0) {
  const client = await getRedisClient();
  const raw = JSON.stringify(value);

  if (Number(ttlSeconds) > 0) {
    await client.set(String(key), raw, { EX: Number(ttlSeconds) });
  } else {
    await client.set(String(key), raw);
  }
}

export async function kvDelete(key) {
  const client = await getRedisClient();
  await client.del(String(key));
}
