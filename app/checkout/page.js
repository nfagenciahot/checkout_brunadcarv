'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const plans = {
  safada: {
    title: 'VIP Safada 15 dias',
    price: 17.9
  },
  tesao: {
    title: 'VIP Tesão 30 dias + Pack 💎',
    price: 34.9
  }
};

function CheckoutContent() {
  const params = useSearchParams();

  const planKey =
    params.get('plan') === 'safada'
      ? 'safada'
      : 'tesao';

  const plan = useMemo(
    () => plans[planKey],
    [planKey]
  );

  return (
    <main className="page">
      <div className="narrow checkoutCard">

        <h1>Finalizar pagamento</h1>

        <p className="muted">
          Checkout base pronto para plugar o PIX.
        </p>

        <div className="fields">

          <input
            placeholder="Seu nome"
          />

          <input
            placeholder="Seu e-mail"
          />

          <input
            placeholder="Seu WhatsApp"
          />

        </div>

        <div className="summaryBox">

          <div>
            <span>{plan.title}</span>

            <strong>
              R$ {plan.price.toFixed(2).replace('.', ',')}
            </strong>
          </div>

          <small>
            Pagamento via PIX
          </small>

        </div>

        <div className="totalLine">

          <span>Total</span>

          <strong>
            R$ {plan.price.toFixed(2).replace('.', ',')}
          </strong>

        </div>

        <button
          className="subscribeButton checkoutMainButton"
          type="button"
        >

          <span>
            Gerar PIX
          </span>

          <strong>
            Continuar
          </strong>

        </button>

      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <div className="narrow checkoutCard">
            Carregando...
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}