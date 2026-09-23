import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

function pathnameFromUrl(value = '') {
  const text = String(value || '');
  if (text.startsWith('/api/media/')) {
    const raw = text.slice('/api/media/'.length).split('?')[0].split('#')[0];
    if (!raw) return '';
    try { return raw.split('/').map(p => decodeURIComponent(p)).join('/'); } catch (_) { return ''; }
  }
  const m = text.match(/(?:private|public)\.blob\.vercel-storage\.com\/(.+?)(?:\?|#|$)/);
  if (m) return m[1];
  return '';
}

async function signedGetUrl(pathname) {
  const validUntil = Date.now() + 6 * 60 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil });
  return presignedUrl;
}

function collectPaths(value, set) {
  if (typeof value === 'string') { const p = pathnameFromUrl(value); if (p) set.add(p); return; }
  if (Array.isArray(value)) { for (const item of value) collectPaths(item, set); return; }
  if (value && typeof value === 'object') { for (const v of Object.values(value)) collectPaths(v, set); }
}

function replacePaths(value, map) {
  if (typeof value === 'string') { const p = pathnameFromUrl(value); return p && map.has(p) ? map.get(p) : value; }
  if (Array.isArray(value)) return value.map(item => replacePaths(item, map));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replacePaths(v, map)]));
  return value;
}

export async function GET() {
  try {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'public', 'config.json'), 'utf8'));
    const paths = new Set();
    collectPaths(config, paths);

    const entries = await Promise.all([...paths].map(async pathname => {
      try { return [pathname, await signedGetUrl(pathname)]; }
      catch (err) { console.error('[site-config] falha ao assinar', pathname, err?.message); return [pathname, null]; }
    }));

    const map = new Map(entries.filter(([, url]) => url !== null));

    return NextResponse.json(replacePaths(config, map), {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[site-config]', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar a configuração.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
