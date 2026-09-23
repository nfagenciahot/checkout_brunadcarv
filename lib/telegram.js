import { readPrivateConfig } from './privateConfig';

const TELEGRAM_BASE = 'https://api.telegram.org';

export async function getTelegramToken() {
  const privateConfig = await readPrivateConfig();
  return String(privateConfig?.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

export function maskTelegramToken(token = '') {
  const value = String(token || '');
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 5)}••••••••${value.slice(-4)}`;
}

async function resolveToken(token) {
  const value = String(token || await getTelegramToken() || '').trim();
  if (!value) throw new Error('Token do bot Telegram não configurado.');
  return value;
}

export async function telegramCall(method, payload = {}, token) {
  const resolvedToken = await resolveToken(token);
  const response = await fetch(`${TELEGRAM_BASE}/bot${resolvedToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok || !data?.ok) {
    const detail = data?.description || `HTTP ${response.status}`;
    throw new Error(`Telegram ${method}: ${detail}`);
  }
  return data.result;
}

export async function getTelegramBotInfo(token) {
  return telegramCall('getMe', {}, token);
}

export async function verifyTelegramChat(chatId, token) {
  const target = String(chatId || '').trim();
  if (!target) throw new Error('Informe o ID ou @username do canal/grupo.');
  const resolvedToken = await resolveToken(token);
  const bot = await getTelegramBotInfo(resolvedToken);
  const chat = await telegramCall('getChat', { chat_id: target }, resolvedToken);
  const member = await telegramCall('getChatMember', { chat_id: target, user_id: bot.id }, resolvedToken);
  const isAdmin = member?.status === 'administrator' || member?.status === 'creator';
  const canInviteUsers = member?.status === 'creator' || member?.can_invite_users === true;
  return {
    bot: { id: bot.id, username: bot.username || '', firstName: bot.first_name || '' },
    chat: {
      id: String(chat.id),
      title: chat.title || chat.username || String(chat.id),
      username: chat.username || '',
      type: chat.type || '',
    },
    membership: {
      status: member?.status || 'unknown',
      isAdmin,
      canInviteUsers,
    },
  };
}

// Convite sem expiração por tempo: expira apenas depois de 1 uso.
export async function createSingleUseInviteLink(chatId, options = {}, token) {
  const payload = {
    chat_id: String(chatId),
    name: String(options.name || 'Compra VIP').slice(0, 32),
    member_limit: 1,
  };
  return telegramCall('createChatInviteLink', payload, token);
}
