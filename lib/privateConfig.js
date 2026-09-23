import { hasRedisStore, kvGet, kvSet } from './kv';

const KV_KEY = 'brunadcarv:private-config';

export async function readPrivateConfig() {
  if (!hasRedisStore()) return {};
  return (await kvGet(KV_KEY)) || {};
}

export async function writePrivateConfig(next) {
  if (!hasRedisStore()) {
    throw new Error('REDIS_URL não configurada na Vercel.');
  }

  await kvSet(KV_KEY, next);
}

export async function updatePrivateConfig(patch) {
  const current = await readPrivateConfig();
  const next = {
    ...current,
    ...patch,
    telegram: {
      ...(current.telegram || {}),
      ...(patch.telegram || {}),
    },
  };

  await writePrivateConfig(next);
  return next;
}
