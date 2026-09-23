import { NextResponse } from 'next/server';
import { fulfillTelegramOrder } from '../../../../lib/delivery';
import { getOrder, publicOrder, validResumeToken } from '../../../../lib/orderStore';

export async function POST(request) {
  try {
    const body = await request.json();
    const order = await getOrder(body?.orderId);
    if (!order || !validResumeToken(order, body?.resumeToken)) {
      return NextResponse.json({ error:'Pedido não encontrado.' }, { status:404 });
    }
    if (order.status === 'delivered' && order.telegramInvite) {
      return NextResponse.json({ ok:true, order:publicOrder(order) });
    }
    if (order.status === 'manual_delivery') {
      return NextResponse.json({ ok:true, order:publicOrder(order) });
    }
    if (!['paid','delivering','delivery_error'].includes(order.status)) {
      return NextResponse.json({ error:'Pagamento ainda não confirmado.' }, { status:409 });
    }
    const updated = await fulfillTelegramOrder(order);
    return NextResponse.json({ ok:true, order:publicOrder(updated) });
  } catch (error) {
    return NextResponse.json({ error:error.message }, { status:500 });
  }
}
