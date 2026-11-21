import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GuiaCampus — Central de monitoramento',
  description: 'Central acessível de telemetria e monitoramento do protótipo de óculos assistivos GuiaCampus via Bluetooth LE.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
