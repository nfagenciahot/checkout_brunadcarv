import { NextResponse } from 'next/server';
import { fulfillTelegramOrder } from '../../../../lib/delivery';
import { getOrder, getOrderByAlias, getOrderByTransactionId, saveOrder } from '../../../../lib/orderStore';

export async function POST(request) {
  try {
    const payload = await request.json();
    const transactionId = payload?.transaction?.id || payload?.transactionId || '';
    const metadataOrderId = payload?.metadata?.orderId || payload?.metadata?.order_id || '';
    const gatewayOrderId = payload?.order?.id || payload?.orderId || '';
    const identifier = payload?.identifier || '';

    const order = (metadataOrderId ? await getOrder(metadataOrderId) : null)
      || await getOrderByTransactionId(transactionId)
      || (gatewayOrderId ? await getOrderByAlias(gatewayOrderId) : null)
      || (identifier ? await getOrderByAlias(identifier) : null);

    if (!order) return NextResponse.json({ ok:true, ignored:true });

    if (order.webhookToken && payload?.token !== order.webhookToken) {
      return NextResponse.json({ error:'Token do webhook inválido.' }, { status:401 });
    }

    const event = String(payload?.event || '').toUpperCase();
    const txStatus = String(payload?.transaction?.status || payload?.transactionStatus || '').toUpperCase();

    if (event === 'TRANSACTION_PAID' || txStatus === 'COMPLETED') {
      const paidAt = payload?.transaction?.payedAt || payload?.transaction?.paidAt || new Date().toISOString();
      const updated = await fulfillTelegramOrder({ ...order, transactionStatus:'COMPLETED', paidAt }, { paidAt });
      return NextResponse.json({ ok:true, status:updated.status });
    }

    if (event === 'TRANSACTION_CANCELED' || txStatus === 'CANCELED') {
      await saveOrder({ ...order, status:'canceled', transactionStatus:'CANCELED' });
    } else if (event === 'TRANSACTION_REFUNDED' || txStatus === 'REFUNDED') {
      await saveOrder({ ...order, status:'refunded', transactionStatus:'REFUNDED' });
    } else if (event === 'TRANSACTION_CHARGED_BACK' || txStatus === 'CHARGED_BACK') {
      await saveOrder({ ...order, status:'charged_back', transactionStatus:'CHARGED_BACK' });
    } else if (txStatus === 'FAILED') {
      await saveOrder({ ...order, status:'failed', transactionStatus:'FAILED' });
    } else if (txStatus === 'EXPIRED') {
      await saveOrder({ ...order, status:'expired', transactionStatus:'EXPIRED', expiredAt:new Date().toISOString() });
    }

    return NextResponse.json({ ok:true });
  } catch (error) {
    return NextResponse.json({ error:error.message }, { status:500 });
  }
}
