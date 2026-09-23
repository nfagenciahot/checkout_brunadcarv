import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PANEL_COOKIE, verifyPanelSession } from '../../../../lib/panelAuth';
import { getTelegramBotInfo, getTelegramToken, maskTelegramToken, verifyTelegramChat } from '../../../../lib/telegram';
import { readPrivateConfig, updatePrivateConfig } from '../../../../lib/privateConfig';

async function authorized() {
  const store = await cookies();
  return !!verifyPanelSession(store.get(PANEL_COOKIE)?.value);
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const token = await getTelegramToken();
  if (!token) return NextResponse.json({ configured: false, maskedToken: '', bot: null });
  try {
    const bot = await getTelegramBotInfo(token);
    return NextResponse.json({
      configured: true,
      maskedToken: maskTelegramToken(token),
      bot: { id: bot.id, username: bot.username || '', firstName: bot.first_name || '' },
    });
  } catch (error) {
    return NextResponse.json({ configured: true, maskedToken: maskTelegramToken(token), bot: null, error: error.message }, { status: 200 });
  }
}

export async function PUT(request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const body = await request.json();
    const token = String(body?.token || '').trim();
    if (!token) return NextResponse.json({ error: 'Informe o token do bot.' }, { status: 400 });
    const bot = await getTelegramBotInfo(token);
    await updatePrivateConfig({ telegram: { botToken: token } });
    return NextResponse.json({
      ok: true,
      configured: true,
      maskedToken: maskTelegramToken(token),
      bot: { id: bot.id, username: bot.username || '', firstName: bot.first_name || '' },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const body = await request.json();
    if (body?.action !== 'verifyChat') return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    const result = await verifyTelegramChat(body.chatId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
