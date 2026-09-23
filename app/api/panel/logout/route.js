import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PANEL_COOKIE } from '../../../../lib/panelAuth';

export async function POST() {
  const store = await cookies();
  store.set(PANEL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return NextResponse.json({ ok: true });
}
