import { NextResponse } from 'next/server';
import { getOrder, publicOrder, saveOrder, validResumeToken } from '../../../../lib/orderStore';

const WAITING = new Set(['creating','pending']);

export async function POST(request) {
  try {
    const body = await request.json();
    let order = await getOrder(body?.orderId);
    if (!order || !validResumeToken(order, body?.resumeToken)) {
      return NextResponse.json({ error:'Pedido não encontrado.' }, { status:404 });
    }

    if (WAITING.has(order.status) && order.checkoutExpiresAt && Date.now() >= Date.parse(order.checkoutExpiresAt)) {
      order = await saveOrder({
        ...order,
        status:'expired',
        expiredAt:new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok:true, order:publicOrder(order) });
  } catch (error) {
    return NextResponse.json({ error:error.message }, { status:500 });
  }
}
