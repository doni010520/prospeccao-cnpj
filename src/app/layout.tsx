import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prospecção de Escolas de Idiomas',
  description: 'Busque escolas de idiomas e exporte leads com contatos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
