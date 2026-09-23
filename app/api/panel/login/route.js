import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPanelSession, panelCookieOptions, panelCredentialsValid, PANEL_COOKIE } from '../../../../lib/panelAuth';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!panelCredentialsValid(body.username, body.password)) {
    return NextResponse.json({ ok: false, error: 'Login inválido.' }, { status: 401 });
  }
  const store = await cookies();
  store.set(PANEL_COOKIE, createPanelSession(body.username), panelCookieOptions());
  return NextResponse.json({ ok: true });
}
