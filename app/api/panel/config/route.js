import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PANEL_COOKIE, verifyPanelSession } from '../../../../lib/panelAuth';
import { readProjectFile, storageMode, writeProjectFile } from '../../../../lib/panelStorage';

async function authorized() {
  const store = await cookies();
  return !!verifyPanelSession(store.get(PANEL_COOKIE)?.value);
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const bytes = await readProjectFile('public/config.json');
    return NextResponse.json({ config: JSON.parse(bytes.toString('utf8')), mode: storageMode() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Configuração inválida.' }, { status: 400 });
    }
    const serialized = JSON.stringify(body, null, 2) + '\n';
    const result = await writeProjectFile('public/config.json', Buffer.from(serialized), 'Painel: atualizar config.json');
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
