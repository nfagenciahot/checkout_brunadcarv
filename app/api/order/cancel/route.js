import { NextResponse } from 'next/server';
import { getOrder, publicOrder, saveOrder, validResumeToken } from '../../../../lib/orderStore';

export async function POST(request) {
  try {
    const body = await request.json();
    const order = await getOrder(body?.orderId);
    if (!order || !validResumeToken(order, body?.resumeToken)) {
      return NextResponse.json({ error:'Pedido não encontrado.' }, { status:404 });
    }
    if (['paid','delivering','delivered','manual_delivery'].includes(order.status)) {
      return NextResponse.json({ error:'Este pagamento já foi confirmado e não pode ser cancelado.' }, { status:409 });
    }
    if (['canceled_by_user','expired'].includes(order.status)) {
      return NextResponse.json({ ok:true, order:publicOrder(order) });
    }
    const timeout = body?.reason === 'timeout';
    const updated = await saveOrder({
      ...order,
      status: timeout ? 'expired' : 'canceled_by_user',
      ...(timeout ? { expiredAt:new Date().toISOString() } : { canceledAt:new Date().toISOString() }),
    });
    return NextResponse.json({ ok:true, order:publicOrder(updated) });
  } catch (error) {
    return NextResponse.json({ error:error.message }, { status:500 });
  }
}
