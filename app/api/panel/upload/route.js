import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import { PANEL_COOKIE, verifyPanelSession } from '../../../../lib/panelAuth';
import { backupProjectFile, writeProjectFile } from '../../../../lib/panelStorage';

const SAFE_SLOT = /^[a-zA-Z0-9_-]{1,40}$/;
const FIXED_BASE = {
  profile: 'profile',
  cover: 'cover',
  'brand-logo': 'brunadcarv',
  'welcome-audio': 'AudioBoasVindas',
  curtiu1: 'curtiu1', curtiu2: 'curtiu2', curtiu3: 'curtiu3',
  'vip-post': 'vip-post', 'vip-grid': 'vip-grid',
  'bump-1': 'bump-1', 'bump-2': 'bump-2',
  'bump-poster-1': 'bump-poster-1', 'bump-poster-2': 'bump-poster-2',
};
function fixedBase(slot){
  if(FIXED_BASE[slot]) return FIXED_BASE[slot];
  const post=slot.match(/^postagem([1-3])$/);
  if(post) return `postagem${post[1]}`;
  return slot;
}
function urlToRel(url=''){
  const clean=String(url||'').split('?')[0].trim();
  if(!clean.startsWith('/') || clean.startsWith('//')) return '';
  return `public/${clean.replace(/^\/+/, '')}`;
}
async function authorized() {
  const store = await cookies();
  return !!verifyPanelSession(store.get(PANEL_COOKIE)?.value);
}
export async function POST(request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    const slot = String(form.get('slot') || 'media');
    const currentUrl = String(form.get('currentUrl') || '');
    if (!file || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
    if (!SAFE_SLOT.test(slot)) return NextResponse.json({ error: 'Slot inválido.' }, { status: 400 });
    if (file.size > 95 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo acima de 95 MB.' }, { status: 413 });
    const ext = (path.extname(file.name || '') || '.bin').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const base = fixedBase(slot);
    const relPath = `public/${base}${ext}`;
    const oldRel = urlToRel(currentUrl);
    if(oldRel) await backupProjectFile(oldRel, `Painel: backup ${slot}`);
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await writeProjectFile(relPath, bytes, `Painel: atualizar ${slot}`);
    const url = `/${base}${ext}`;
    return NextResponse.json({ ok: true, url, previewUrl: `${url}?v=${Date.now()}`, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
