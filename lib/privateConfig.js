import fs from 'fs/promises';
import path from 'path';
import { hasRedisStore, kvGet, kvSet } from './kv';

const privatePath = path.join(process.cwd(), 'data', 'private-config.json');
const KV_KEY = 'brunadcarv:private-config';

async function readFileConfig() {
  try { return JSON.parse(await fs.readFile(privatePath, 'utf8')); }
  catch { return {}; }
}

export async function readPrivateConfig() {
  if (hasRedisStore()) return (await kvGet(KV_KEY)) || {};
  return readFileConfig();
}

export async function writePrivateConfig(next) {
  if (hasRedisStore()) {
    await kvSet(KV_KEY, next);
    return;
  }
  if (process.env.VERCEL) throw new Error('Configure o armazenamento persistente antes de salvar segredos pelo painel.');
  await fs.mkdir(path.dirname(privatePath), { recursive: true });
  await fs.writeFile(privatePath, JSON.stringify(next, null, 2), 'utf8');
}

export async function updatePrivateConfig(patch) {
  const current = await readPrivateConfig();
  const next = {
    ...current,
    ...patch,
    telegram: { ...(current.telegram || {}), ...(patch.telegram || {}) },
  };
  await writePrivateConfig(next);
  return next;
}
