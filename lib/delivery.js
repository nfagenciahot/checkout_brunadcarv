import { createSingleUseInviteLink } from './telegram';
import { saveOrder } from './orderStore';

const MANUAL_MESSAGE = 'Houve um problema ao gerar automaticamente o convite de acesso ao Telegram. Seu pagamento foi confirmado e nosso suporte entrará em contato o mais breve possível para compartilhar seu acesso.';

export async function fulfillTelegramOrder(order, options = {}) {
  if (!order) throw new Error('Pedido ausente.');
  if (order.status === 'delivered' && order.telegramInvite) return order;
  if (order.status === 'manual_delivery') return order;

  const paidAt = options.paidAt || order.paidAt || new Date().toISOString();
  if (!order.delivery?.chatId) {
    return saveOrder({
      ...order,
      status: 'manual_delivery',
      transactionStatus: 'COMPLETED',
      paidAt,
      deliveryError: MANUAL_MESSAGE,
      deliveryTechnicalError: 'Telegram não configurado para este plano.',
    });
  }

  let working = await saveOrder({
    ...order,
    status: 'delivering',
    transactionStatus: 'COMPLETED',
    paidAt,
    deliveryError: '',
  });

  try {
    const invite = await createSingleUseInviteLink(working.delivery.chatId, {
      name: `${working.planId}-${working.id.slice(-8)}`,
    });
    return saveOrder({
      ...working,
      status: 'delivered',
      telegramInvite: invite.invite_link,
      deliveredAt: new Date().toISOString(),
    });
  } catch (error) {
    return saveOrder({
      ...working,
      status: 'manual_delivery',
      deliveryError: MANUAL_MESSAGE,
      deliveryTechnicalError: error.message,
    });
  }
}
