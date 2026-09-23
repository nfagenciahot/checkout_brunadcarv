import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="page">
      <div className="container narrow">
        <section className="checkoutCard success">
          <h1>Pagamento aprovado</h1>
          <p>Seu acesso será enviado pelo canal definido para a entrega.</p>
          <Link href="/" className="button primary full">Voltar ao perfil</Link>
        </section>
      </div>
    </main>
  );
}
