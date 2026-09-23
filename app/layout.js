import { Nunito_Sans } from 'next/font/google';
import './globals.css';

const nunito = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-bio',
});

export const metadata = {
  title: 'Bruna Dias',
  description: 'Assinatura privada da Bruna Dias',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={nunito.variable}>{children}</body>
    </html>
  );
}
