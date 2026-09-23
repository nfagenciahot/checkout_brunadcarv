import crypto from 'crypto';
import { kvGet, kvSet } from './kv';

const TTL_SECONDS = 60 * 60 * 24 * 180; // 180 dias
const orderKey = (id) => `brunadcarv:order:${id}`;
const txKey = (id) => `brunadcarv:tx:${id}`;
const aliasKey = (id) => `brunadcarv:alias:${id}`;

export function newOrderId() {
  return `bruna_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

export function newResumeToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashToken(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export async function saveOrder(order) {
  const next = { ...order, updatedAt: new Date().toISOString() };
  await kvSet(orderKey(order.id), next, TTL_SECONDS);
  if (order.transactionId) await kvSet(txKey(order.transactionId), order.id, TTL_SECONDS);
  if (order.gatewayOrderId) await kvSet(aliasKey(order.gatewayOrderId), order.id, TTL_SECONDS);
  if (order.identifier) await kvSet(aliasKey(order.identifier), order.id, TTL_SECONDS);
  return next;
}

export async function getOrder(id) {
  if (!id) return null;
  return kvGet(orderKey(id));
}

export async function getOrderByTransactionId(transactionId) {
  if (!transactionId) return null;
  const orderId = await kvGet(txKey(transactionId));
  return orderId ? getOrder(orderId) : null;
}

export async function getOrderByAlias(alias) {
  if (!alias) return null;
  const orderId = await kvGet(aliasKey(alias));
  return orderId ? getOrder(orderId) : null;
}

export function validResumeToken(order, token) {
  if (!order?.resumeTokenHash || !token) return false;
  const actual = Buffer.from(hashToken(token));
  const expected = Buffer.from(order.resumeTokenHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    amount: order.amount,
    planId: order.planId,
    planName: order.planName,
    planPrice: order.planPrice,
    includeBump: Boolean(order.includeBump),
    bumpPrice: Number(order.bumpPrice || 0),
    pixCode: order.pixCode || '',
    pixImage: order.pixImage || '',
    pixExpiresAt: order.pixExpiresAt || null,
    checkoutExpiresAt: order.checkoutExpiresAt || null,
    expiredAt: order.expiredAt || null,
    telegramInvite: order.telegramInvite || '',
    deliveryError: order.deliveryError || '',
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
  };
}
