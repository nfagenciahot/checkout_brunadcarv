import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PANEL_COOKIE, verifyPanelSession } from '../../../../lib/panelAuth';

export async function GET() {
  const store = await cookies();
  const session = verifyPanelSession(store.get(PANEL_COOKIE)?.value);
  return NextResponse.json({ authenticated: !!session, user: session?.u || null });
}
