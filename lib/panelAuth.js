import crypto from 'crypto';

export const PANEL_COOKIE = 'bd_panel_session';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  return process.env.PANEL_SESSION_SECRET || 'dev-only-change-me';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createPanelSession(username) {
  const payload = Buffer.from(JSON.stringify({
    u: username,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyPanelSession(token) {
  try {
    if (!token || !token.includes('.')) return null;
    const [payload, signature] = token.split('.');
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.u || !data?.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function panelCredentialsValid(username, password) {
  const expectedUser = process.env.PANEL_USER || '';
  const expectedPassword = process.env.PANEL_PASSWORD || '';
  if (!expectedUser || !expectedPassword) return false;
  const ua = Buffer.from(String(username));
  const ub = Buffer.from(expectedUser);
  const pa = Buffer.from(String(password));
  const pb = Buffer.from(expectedPassword);
  const userOk = ua.length === ub.length && crypto.timingSafeEqual(ua, ub);
  const passOk = pa.length === pb.length && crypto.timingSafeEqual(pa, pb);
  return userOk && passOk;
}

export function panelCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}
