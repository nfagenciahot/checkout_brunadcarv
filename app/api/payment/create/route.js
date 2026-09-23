import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createPixCharge } from '../../../../lib/omegapay';
import { hashToken, newOrderId, newResumeToken, publicOrder, saveOrder } from '../../../../lib/orderStore';
import { validateBrazilPhone } from '../../../../lib/phone';
import { readSiteConfig } from '../../../../lib/siteConfig';

const SITE_URL = process.env.SITE_URL?.trim().replace(/\/$/, '') || '';
const OMEGAPAY_CALLBACK_URL = process.env.OMEGAPAY_CALLBACK_URL?.trim() || (SITE_URL ? `${SITE_URL}/api/webhooks/omegapay` : '');
const OMEGAPAY_DOCUMENT = process.env.OMEGAPAY_DOCUMENT?.trim() || '';
const DEFAULT_PIX_TIMEOUT_MINUTES = 20;

function technicalEmail(name, orderId) {
  const base = String(name || 'cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24) || 'cliente';
  const suffix = orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toLowerCase();
  return `${base}.${suffix}@gmail.com`;
}

export async function POST(request) {
  let order;
  let resumeToken;
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || !/[A-Za-zÀ-ÿ]/.test(name)) {
      return NextResponse.json({ error:'Informe seu nome.' }, { status:400 });
    }
    const phone = validateBrazilPhone(body?.phone);
    if (!phone.ok) return NextResponse.json({ error:phone.message }, { status:400 });

    const config = await readSiteConfig();
    if (!OMEGAPAY_DOCUMENT) {
      return NextResponse.json({ error:'Documento da OmegaPay não configurado.' }, { status:500 });
    }
    const timeoutMinutes = Math.max(1, Math.min(120, Number(config.checkout?.pixTimeoutMinutes || DEFAULT_PIX_TIMEOUT_MINUTES)));
    const plan = (config.subscriptions || []).find(item => item.id === body?.planId && item.enabled !== false);
    if (!plan) return NextResponse.json({ error:'Plano inválido ou indisponível.' }, { status:400 });

    const includeBump = body?.includeBump === true;
    const bumpPrice = includeBump ? Number(config.orderBump?.price || 0) : 0;
    const planPrice = Number(plan.price || 0);
    const amount = Number((planPrice + bumpPrice).toFixed(2));
    if (!(amount >= 0.01)) return NextResponse.json({ error:'Valor inválido.' }, { status:400 });

    const orderId = newOrderId();
    resumeToken = newResumeToken();
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const checkoutExpiresAt = new Date(nowDate.getTime() + timeoutMinutes * 60 * 1000).toISOString();
    order = await saveOrder({
      id: orderId,
      identifier: orderId,
      status: 'creating',
      amount,
      planId: plan.id,
      planName: plan.name,
      planPrice,
      includeBump,
      bumpPrice,
      customer: { name, phone: phone.formatted, phoneDigits: phone.digits, document: OMEGAPAY_DOCUMENT, email: technicalEmail(name, orderId) },
      delivery: { chatId: String(plan.delivery?.chatId || ''), chatTitle: plan.delivery?.chatTitle || '', chatType: plan.delivery?.chatType || '' },
      resumeTokenHash: hashToken(resumeToken),
      createdAt: now,
      checkoutExpiresAt,
    });

    const products = [{ id: plan.id, name: plan.name, quantity:1, price:planPrice, physical:false }];
    if (includeBump && bumpPrice > 0) products.push({ id:'order-bump', name:'order-bump', quantity:1, price:bumpPrice, physical:false });

    const payload = {
      identifier: orderId,
      amount,
      client: {
        name,
        email: order.customer.email,
        phone: phone.formatted,
        document: OMEGAPAY_DOCUMENT,
      },
      products,
      ...(OMEGAPAY_CALLBACK_URL ? { callbackUrl: OMEGAPAY_CALLBACK_URL } : {}),
    };

    const result = await createPixCharge(payload);
    if (!result?.pix?.code) throw new Error(result?.errorDescription || 'OmegaPay não retornou o código PIX.');
    const generatedQr = await QRCode.toDataURL(result.pix.code, { width:360, margin:1, errorCorrectionLevel:'M' });
    order = await saveOrder({
      ...order,
      status: result.transactionStatus === 'COMPLETED' ? 'paid' : 'pending',
      transactionId: result.transactionId,
      gatewayStatus: result.status,
      transactionStatus: result.transactionStatus || 'PENDING',
      webhookToken: result.webhookToken || '',
      pixCode: result.pix.code,
      pixImage: generatedQr || result.pix.image || '',
      pixExpiresAt: result.pix.expiresAt || null,
      gatewayOrderId: result.order?.id || '',
    });

    return NextResponse.json({ ok:true, resumeToken, order:publicOrder(order) });
  } catch (error) {
    if (order?.id) await saveOrder({ ...order, status:'create_error', createError:error.message }).catch(()=>{});
    return NextResponse.json({ error:error.message, gatewayStatus:error.status || null, gatewayCode:error.data?.errorCode || null, details:error.data?.details || null }, { status:error.status || 500 });
  }
}
